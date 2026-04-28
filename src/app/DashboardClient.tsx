"use client";

import { useEffect, useMemo, useState } from "react";

type ApiOk = {
  ok: true;
  rows: Array<{
    domain: string;
    path: string;
    precondition: string;
    step: string;
    checkitem: string;
    result: string;
  }>;
  html: string;
  context: {
    figmaNodeName?: string;
    figmaNodeDescription?: string;
    figmaImageUrl?: string | null;
    used: { figma: boolean; llm: boolean };
  };
};

type ApiErr = { ok: false; error: string };

function isApiResponse(v: unknown): v is ApiOk | ApiErr {
  if (!v || typeof v !== "object") return false;
  const ok = (v as { ok?: unknown }).ok;
  return typeof ok === "boolean";
}

export default function DashboardClient() {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [domainHint, setDomainHint] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [showIntegration, setShowIntegration] = useState(false);
  const [figmaToken, setFigmaToken] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4.1-mini");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastInfo, setLastInfo] = useState<string | null>(null);

  const canSubmit = useMemo(() => figmaUrl.trim().length > 0 && !busy, [figmaUrl, busy]);

  useEffect(() => {
    try {
      const ft = localStorage.getItem("checklist_auto:figmaToken") ?? "";
      const ok = localStorage.getItem("checklist_auto:openaiApiKey") ?? "";
      const om = localStorage.getItem("checklist_auto:openaiModel") ?? "gpt-4.1-mini";
      setFigmaToken(ft);
      setOpenaiApiKey(ok);
      setOpenaiModel(om || "gpt-4.1-mini");
    } catch {
      // ignore
    }
  }, []);

  function saveIntegration() {
    try {
      localStorage.setItem("checklist_auto:figmaToken", figmaToken);
      localStorage.setItem("checklist_auto:openaiApiKey", openaiApiKey);
      localStorage.setItem("checklist_auto:openaiModel", openaiModel);
      setLastInfo("연동 설정을 저장했습니다. (이 브라우저에만 저장됨)");
      setError(null);
    } catch {
      setError("설정을 저장하지 못했습니다. (브라우저 저장소 접근 실패)");
    }
  }

  function clearIntegration() {
    try {
      localStorage.removeItem("checklist_auto:figmaToken");
      localStorage.removeItem("checklist_auto:openaiApiKey");
      localStorage.removeItem("checklist_auto:openaiModel");
      setFigmaToken("");
      setOpenaiApiKey("");
      setOpenaiModel("gpt-4.1-mini");
      setLastInfo("연동 설정을 초기화했습니다.");
      setError(null);
    } catch {
      setError("설정을 초기화하지 못했습니다.");
    }
  }

  async function onGenerate() {
    setError(null);
    setLastInfo(null);
    setBusy(true);
    setProgress(3);

    // 팝업은 사용자 제스처(클릭) 직후에 열어야 차단/빈 창 이슈가 줄어듭니다.
    // (fetch 이후에 열면 브라우저가 팝업으로 판단하거나, 새 창 document 접근이 제한될 수 있음)
    const w = window.open("", "_blank", "noopener");
    if (!w) {
      setBusy(false);
      setProgress(0);
      setError("새 창이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.");
      return;
    }
    try {
      w.document.open();
      w.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>체크리스트 생성 중...</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; background: #0b1020; color: rgba(255,255,255,0.92); }
      .wrap { max-width: 720px; margin: 0 auto; padding: 28px 18px; }
      .card { border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); border-radius: 14px; padding: 16px; }
      .muted { color: rgba(255,255,255,0.72); font-size: 13px; line-height: 1.5; }
      .bar { height: 8px; background: rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden; margin-top: 12px; }
      .bar > div { height: 100%; width: 35%; background: rgba(124,58,237,0.85); animation: move 1.1s infinite ease-in-out; transform-origin: left; }
      @keyframes move { 0% { transform: translateX(-20%); } 100% { transform: translateX(240%); } }
      code { color: rgba(147,197,253,0.95); }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div style="font-weight: 700; letter-spacing: -0.02em;">체크리스트를 생성하는 중입니다…</div>
        <div class="muted" style="margin-top: 8px;">
          이 창은 잠시 후 자동으로 결과 표로 바뀝니다.<br/>
          문제가 계속되면 브라우저 콘솔 오류(팝업/권한/정책)를 확인해주세요.
        </div>
        <div class="bar"><div></div></div>
      </div>
    </div>
  </body>
</html>`);
      w.document.close();
    } catch {
      // 새 창 document 접근이 막힌 경우(브라우저 정책 등)에도 계속 진행하고,
      // 성공 시 Blob URL로 결과를 열어준다.
    }

    let t: number | null = null;
    const startFakeProgress = () => {
      t = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 92) return p;
          const next = p + (p < 40 ? 7 : p < 70 ? 4 : 2);
          return Math.min(92, next);
        });
      }, 450);
    };
    startFakeProgress();

    try {
      const res = await fetch("/api/generate-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: figmaUrl.trim(),
          domainHint: domainHint.trim() || undefined,
          extraDescription: extraDescription.trim() || undefined,
          figmaToken: figmaToken.trim() || undefined,
          openaiApiKey: openaiApiKey.trim() || undefined,
          openaiModel: openaiModel.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as ApiOk | ApiErr | null;
      if (!isApiResponse(data)) {
        throw new Error("서버 응답을 해석할 수 없습니다.");
      }
      if (!data.ok) {
        throw new Error(data.error || "체크리스트 생성에 실패했습니다.");
      }

      setProgress(100);
      // 1) 가능하면 새 창 document에 직접 렌더
      // 2) 정책/브라우저 제한으로 실패하면 Blob URL로 대체 렌더
      try {
        w.document.open();
        w.document.write(data.html);
        w.document.close();
      } catch {
        const blob = new Blob([data.html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        w.location.href = url;
        // 메모리 해제(페이지 이동 후 일정 시간 뒤)
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }

      const used = data.context?.used;
      setLastInfo(
        `생성 완료: ${data.rows.length}개 항목 (Figma: ${used?.figma ? "사용" : "미사용"}, AI: ${
          used?.llm ? "사용" : "미사용"
        })`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      // 실패 시에도 이미 열린 새 창이 있을 수 있으니 사용자가 원인 파악을 할 수 있게 힌트를 제공
      try {
        w.document.open();
        w.document.write(`<!doctype html><meta charset="utf-8"/><title>생성 실패</title>
<body style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#0b1020;color:rgba(255,255,255,0.92);">
<div style="max-width:720px;margin:0 auto;padding:28px 18px;">
  <div style="border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.06);border-radius:14px;padding:16px;">
    <div style="font-weight:700;letter-spacing:-0.02em;">체크리스트 생성에 실패했습니다.</div>
    <div style="margin-top:10px;color:rgba(255,255,255,0.72);font-size:13px;line-height:1.5;">
      아래 메시지를 확인하고 다시 시도해주세요.
    </div>
    <pre style="margin-top:12px;white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.10);padding:12px;border-radius:10px;">${String(
      e instanceof Error ? e.message : e
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")}</pre>
  </div>
</div>
</body>`);
        w.document.close();
      } catch {
        // ignore
      }
    } finally {
      if (t) window.clearInterval(t);
      setBusy(false);
      window.setTimeout(() => setProgress(0), 800);
    }
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium text-white/90">Figma 링크</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/40 focus:border-violet-500/40 focus:outline-none"
              placeholder="예: https://www.figma.com/design/FILEKEY/NAME?node-id=123-456"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div className="mt-2 text-xs text-white/55">
              팁: <b>node-id</b>가 포함된 링크면 화면/설명을 더 잘 반영할 수 있어요.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-white/90">도메인 힌트(선택)</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-violet-500/40"
                placeholder="예: B2B 어드민, 커머스, 금융, 교육..."
                value={domainHint}
                onChange={(e) => setDomainHint(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/90">추가 설명(선택)</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-violet-500/40"
                placeholder="예: 로그인 후 대시보드에서 체크리스트 생성..."
                value={extraDescription}
                onChange={(e) => setExtraDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm font-medium text-white/90"
              onClick={() => setShowIntegration((v) => !v)}
            >
              <span>연동 설정 (선택)</span>
              <span className="text-white/60">{showIntegration ? "접기" : "열기"}</span>
            </button>

            {showIntegration ? (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-white/90">Figma Token</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-violet-500/40"
                      placeholder="Personal access token"
                      value={figmaToken}
                      onChange={(e) => setFigmaToken(e.target.value)}
                      spellCheck={false}
                    />
                    <div className="mt-2 text-xs text-white/55">
                      node-id 포함 링크일 때 노드 설명/스크린샷 참고에 사용합니다.
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/90">OpenAI API Key</label>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-violet-500/40"
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      spellCheck={false}
                    />
                    <div className="mt-2 text-xs text-white/55">
                      설정 시 체크리스트를 20개+로 확장 생성합니다.
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-white/90">OpenAI Model</label>
                    <select
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-violet-500/40"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                    >
                      <option value="gpt-4.1-mini">gpt-4.1-mini (추천)</option>
                      <option value="gpt-4.1">gpt-4.1</option>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="gpt-4o">gpt-4o</option>
                    </select>
                    <div className="mt-2 text-xs text-white/55">
                      필요 시 모델을 선택해 변경할 수 있습니다.
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                      onClick={saveIntegration}
                    >
                      설정 저장
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                      onClick={clearIntegration}
                    >
                      초기화
                    </button>
                  </div>
                </div>

              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onGenerate}
                disabled={!canSubmit}
              >
                {busy ? "생성 중..." : "체크리스트 생성 (새 창)"}
              </button>

              {busy ? (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-44 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                    <div
                      className="h-full bg-emerald-400/80 transition-[width] duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs tabular-nums text-white/70">
                    {Math.max(0, Math.min(100, progress))}%
                  </div>
                </div>
              ) : null}
            </div>

            <div className="text-xs text-white/60">
              {lastInfo ? <span className="text-emerald-200">{lastInfo}</span> : null}
              {error ? <span className="text-rose-200">{error}</span> : null}
              {!lastInfo && !error ? (
                <span>
                  연동 설정에서 <b>OpenAI API Key</b>를 넣으면 체크리스트가 20개+로 확장 생성됩니다.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

