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
    figmaError?: string;
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

    // about:blank 팝업은 브라우저가 더 엄격하게 막는 경우가 있어,
    // 앱의 same-origin 페이지(/popup)를 먼저 연 뒤 localStorage로 결과를 전달합니다.
    const rid =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const storageKey = `checklist_auto:popup:${rid}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ status: "pending" }));
    } catch {
      // ignore
    }

    // 일부 브라우저는 window.open + noopener 조합에서 "탭은 열리지만 반환값은 null"이 될 수 있어
    // (차단으로 오인/후속 처리 불가), 가장 안정적인 방식인 a[target=_blank] 클릭으로 새 탭을 엽니다.
    try {
      const a = document.createElement("a");
      a.href = `/popup?rid=${encodeURIComponent(rid)}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setBusy(false);
      setProgress(0);
      setError("새 창을 열지 못했습니다. 팝업 차단/브라우저 정책을 확인해주세요.");
      return;
    }

    let t: number | null = null;
    const startFakeProgress = () => {
      t = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 92) return p;
          const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
          return Math.min(92, next);
        });
      }, 220);
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
      try {
        localStorage.setItem(storageKey, JSON.stringify({ status: "ready", html: data.html }));
      } catch {
        // localStorage가 막히면 popup 탭에서 payload를 못 받으므로 에러로 유도
        throw new Error("브라우저 저장소(localStorage) 접근이 차단되어 결과를 전달할 수 없습니다.");
      }

      const used = data.context?.used;
      setLastInfo(
        `생성 완료: ${data.rows.length}개 항목 (Figma: ${used?.figma ? "사용" : "미사용"}, AI: ${
          used?.llm ? "사용" : "미사용"
        })`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ status: "error", error: e instanceof Error ? e.message : String(e) })
        );
      } catch {
        // ignore
      }
    } finally {
      if (t) window.clearInterval(t);
      setBusy(false);
      window.setTimeout(() => setProgress(0), 800);
    }
  }

  function openSavedReportList(kind: "qa" | "regression") {
    const key = kind === "qa" ? "checklist_auto:qa_reports" : "checklist_auto:regression_reports";
    const title = kind === "qa" ? "QA 결과 리포트 목록" : "리그레션 결과 리포트 목록";
    const empty = kind === "qa" ? "저장된 QA 결과 리포트가 없습니다." : "저장된 리그레션 결과 리포트가 없습니다.";
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>
*{box-sizing:border-box}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;margin:0;background:linear-gradient(to bottom,#000,#020617,#000);color:rgba(255,255,255,.92)}.wrap{padding:50px 100px}.top{display:flex;gap:12px;align-items:baseline;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}h1{margin:0;font-size:20px}.muted{color:rgba(255,255,255,.62);font-size:12px}.card{border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.04);padding:16px;margin-top:18px}button{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:rgba(255,255,255,.92);cursor:pointer;font-size:12px}button.primary{background:#6d28d9}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-bottom:1px solid rgba(255,255,255,.10);border-right:1px solid rgba(255,255,255,.10);padding:10px;vertical-align:top;font-size:13px;word-break:break-word}th{background:rgba(15,23,42,.88);text-align:left;color:rgba(255,255,255,.78);font-size:12px;text-transform:uppercase}@media(max-width:800px){.wrap{padding:28px 18px}}@media print{.noPrint{display:none}body{background:white;color:black}.wrap{padding:0}.card{background:white;border-color:#e5e7eb}th{background:#f3f4f6;color:#111827}td,th{border-color:#e5e7eb}.muted{color:#374151}}
</style></head><body><div class="wrap"><div class="top"><div><h1>${title}</h1><div class="muted">이 브라우저에 저장된 결과 리포트</div></div><div class="noPrint" style="display:flex;gap:8px;flex-wrap:wrap;"><button onclick="location.href='/'">홈</button><button class="primary" onclick="window.print()">인쇄/PDF 저장</button></div></div><div class="card"><table><thead><tr><th>No</th><th>프로젝트명</th><th>리포트</th><th>담당자</th><th>저장 시각</th></tr></thead><tbody id="reportRows"></tbody></table><div id="pager" class="noPrint" style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:14px;"></div></div></div><script>
var KEY=${JSON.stringify(key)};
var page=1,pageSize=10;
function openBlobHtml(html){var b=new Blob([html],{type:'text/html;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},60000)}
function readReports(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
window.openSavedReport=function(id){var found=readReports().find(function(r){return r.id===id});if(found&&found.html)openBlobHtml(found.html)}
window.movePage=function(next){page=next;render()}
function render(){var rows=readReports();var total=Math.max(1,Math.ceil(rows.length/pageSize));if(page>total)page=total;var start=(page-1)*pageSize;var chunk=rows.slice(start,start+pageSize);var el=document.getElementById('reportRows');el.innerHTML=chunk.length?chunk.map(function(r,i){return '<tr><td>'+(start+i+1)+'</td><td>'+(r.project||'-')+'</td><td><button onclick="openSavedReport(\\''+r.id+'\\')">'+(r.title||'결과 리포트')+'</button></td><td>'+(r.owner||'-')+'</td><td>'+(r.createdAt||'')+'</td></tr>'}).join(''):'<tr><td colspan="5" class="muted">${empty}</td></tr>';var p=document.getElementById('pager');p.innerHTML=rows.length>pageSize?'<button '+(page<=1?'disabled':'')+' onclick="movePage('+(page-1)+')">이전</button><span class="muted">'+page+' / '+total+'</span><button '+(page>=total?'disabled':'')+' onclick="movePage('+(page+1)+')">다음</button>':''}
render();
<\/script></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white/90">저장된 리포트</div>
                <div className="mt-1 text-xs text-white/55">저장한 QA 결과 리포트와 리그레션 결과 리포트를 확인합니다.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                  onClick={() => openSavedReportList("qa")}
                >
                  QA 결과 리포트 목록
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                  onClick={() => openSavedReportList("regression")}
                >
                  리그레션 결과 리포트 목록
                </button>
              </div>
            </div>
          </div>

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
