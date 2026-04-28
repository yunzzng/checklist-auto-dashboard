import type { NextApiRequest, NextApiResponse } from "next";
import { checklistRowsToHtml, type ChecklistRow } from "@/lib/checklist";
import { fetchFigmaNodeImageUrl, fetchFigmaNodeSummary, parseFigmaUrl } from "@/lib/figma";

type GenerateChecklistRequest = {
  figmaUrl: string;
  extraDescription?: string;
  domainHint?: string;
  figmaToken?: string;
  openaiApiKey?: string;
  openaiModel?: string;
};

type GenerateChecklistResponse =
  | {
      ok: true;
      rows: ChecklistRow[];
      html: string;
      context: {
        figmaNodeName?: string;
        figmaNodeDescription?: string;
        figmaImageUrl?: string | null;
        figmaError?: string;
        used: { figma: boolean; llm: boolean };
      };
    }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `당신은 20년차 QA 리드입니다.
사용자가 제공한 "화면(설명/스크린샷/디자인 텍스트)"을 기반으로, 실무에서 바로 쓰는 테스트 체크리스트를 작성합니다.

규칙:
- 결과는 반드시 JSON만 출력합니다.
- 스키마: { "rows": Array<{ "domain": string, "path": string, "precondition": string, "step": string, "checkitem": string, "result": string }> }
- rows는 최소 20개 이상 생성합니다.
- step은 사용자가 따라할 수 있도록 구체적인 조작 단계로 씁니다.
- checkitem은 검증 포인트(무엇을 확인?)를 쓰고, result는 기대 결과(어떻게 보여야 함?)를 씁니다.
- domain은 예: "웹", "모바일웹", "API", "접근성", "보안", "성능", "로깅/모니터링" 등으로 분류합니다.
- path는 화면/기능의 경로(예: "/dashboard", "/checklists/new") 또는 기능 이름으로 씁니다.
- 반드시 경계값, 에러/예외, 권한/역할, 국제화/시간대, 네트워크 실패, 접근성(키보드/스크린리더), 성능(로딩/렌더), 보안(XSS/CSRF/링크 검증) 관점이 포함되어야 합니다.
`;

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeRows(rows: unknown): ChecklistRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        domain: String(o.domain ?? "").trim(),
        path: String(o.path ?? "").trim(),
        precondition: String(o.precondition ?? "").trim(),
        step: String(o.step ?? "").trim(),
        checkitem: String(o.checkitem ?? "").trim(),
        result: String(o.result ?? "").trim(),
      };
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));
}

async function generateWithOpenAI(params: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<{ rows: ChecklistRow[] } | null> {
  const { apiKey, model, prompt } = params;

  const controller = new AbortController();
  const timeoutMs = 18_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  }).finally(() => clearTimeout(t));

  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: unknown } }> }
    | null;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;

  const parsed = safeJsonParse<{ rows: unknown }>(content);
  const rows = normalizeRows(parsed?.rows);
  if (rows.length === 0) return null;
  return { rows };
}

function fallbackRows(req: GenerateChecklistRequest): ChecklistRow[] {
  const path = req.domainHint?.trim() ? `/${req.domainHint.trim()}` : "/(unknown)";
  return [
    {
      domain: "웹",
      path,
      precondition: "대시보드 접속 가능",
      step: "피그마 링크 입력 후 '체크리스트 생성' 클릭",
      checkitem: "링크 유효성 검증 및 오류 메시지",
      result: "유효하지 않으면 원인(형식/권한/토큰)을 안내하는 오류가 표시된다",
    },
    {
      domain: "웹",
      path,
      precondition: "네트워크 정상",
      step: "생성 요청 중 로딩 상태 확인",
      checkitem: "중복 클릭 방지/로딩 UI",
      result: "요청 중 버튼 비활성/스피너 표시, 완료 시 새 창으로 결과가 열린다",
    },
    {
      domain: "보안",
      path,
      precondition: "악성 스크립트 문자열 포함 입력",
      step: "설명란에 <script>alert(1)</script> 입력 후 생성",
      checkitem: "XSS 방지(출력 HTML 이스케이프)",
      result: "스크립트가 실행되지 않고 문자열로만 표시된다",
    },
  ];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GenerateChecklistResponse>) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST만 지원합니다." });
    return;
  }

  const body = (req.body ?? null) as GenerateChecklistRequest | null;
  if (!body?.figmaUrl || typeof body.figmaUrl !== "string") {
    res.status(400).json({ ok: false, error: "figmaUrl이 필요합니다." });
    return;
  }

  const figmaUrl = body.figmaUrl.trim();
  const parsed = parseFigmaUrl(figmaUrl);

  const figmaToken =
    (typeof body.figmaToken === "string" ? body.figmaToken.trim() : "") ||
    process.env.FIGMA_TOKEN ||
    undefined;
  const openaiKey =
    (typeof body.openaiApiKey === "string" ? body.openaiApiKey.trim() : "") ||
    process.env.OPENAI_API_KEY ||
    undefined;
  const openaiModel =
    (typeof body.openaiModel === "string" ? body.openaiModel.trim() : "") ||
    process.env.OPENAI_MODEL ||
    "gpt-4.1-mini";

  let figmaNodeName: string | undefined;
  let figmaNodeDescription: string | undefined;
  let figmaImageUrl: string | null | undefined;
  let usedFigma = false;
  let figmaError: string | undefined;

  if (parsed?.kind !== "design") {
    figmaError = parsed ? `현재는 design 링크만 지원합니다. (kind=${parsed.kind})` : "Figma 링크를 해석하지 못했습니다.";
  } else if (!parsed.nodeId) {
    figmaError = "node-id가 없는 링크라 노드 설명/스크린샷을 가져올 수 없습니다. (node-id 포함 링크를 사용하세요)";
  } else if (!figmaToken) {
    figmaError = "FIGMA_TOKEN(또는 입력 토큰)이 없어 노드 설명/스크린샷을 가져올 수 없습니다.";
  } else {
    try {
      const [summary, imageUrl] = await Promise.all([
        fetchFigmaNodeSummary({
          figmaToken,
          fileKey: parsed.fileKey,
          nodeId: parsed.nodeId,
        }),
        fetchFigmaNodeImageUrl({
          figmaToken,
          fileKey: parsed.fileKey,
          nodeId: parsed.nodeId,
        }),
      ]);
      figmaNodeName = summary.name;
      figmaNodeDescription = summary.description;
      figmaImageUrl = imageUrl;
      usedFigma = true;
    } catch (e) {
      figmaError = e instanceof Error ? e.message : String(e);
    }
  }

  const prompt = [
    `피그마 링크: ${figmaUrl}`,
    body.domainHint ? `도메인 힌트(서비스/제품 맥락): ${body.domainHint}` : "",
    body.extraDescription ? `사용자 추가 설명: ${body.extraDescription}` : "",
    figmaNodeName ? `피그마 노드 이름: ${figmaNodeName}` : "",
    figmaNodeDescription ? `피그마 노드 설명: ${figmaNodeDescription}` : "",
    figmaImageUrl ? `피그마 스크린샷 URL(참고용): ${figmaImageUrl}` : "",
    `요청: 위 정보를 바탕으로 체크리스트를 작성해줘.`,
  ]
    .filter(Boolean)
    .join("\n");

  let rows: ChecklistRow[] | null = null;
  let usedLlm = false;

  if (openaiKey) {
    const llm = await generateWithOpenAI({ apiKey: openaiKey, model: openaiModel, prompt });
    if (llm?.rows?.length) {
      rows = llm.rows;
      usedLlm = true;
    }
  }

  if (!rows) rows = fallbackRows(body);

  const title = "QA 체크리스트 (자동 생성)";
  const html = checklistRowsToHtml({
    title,
    figmaUrl,
    rows,
    context: { figmaNodeName, figmaNodeDescription, figmaImageUrl, figmaError },
  });

  res.status(200).json({
    ok: true,
    rows,
    html,
    context: {
      figmaNodeName,
      figmaNodeDescription,
      figmaImageUrl,
      figmaError,
      used: { figma: usedFigma, llm: usedLlm },
    },
  });
}

