export type ChecklistRow = {
  domain: string;
  path: string;
  precondition: string;
  step: string;
  checkitem: string;
  result: string;
};

export function checklistRowsToHtml(params: {
  title: string;
  figmaUrl: string;
  rows: ChecklistRow[];
  context?: {
    figmaNodeName?: string;
    figmaNodeDescription?: string;
    figmaImageUrl?: string | null;
  };
}): string {
  const { title, figmaUrl, rows, context } = params;

  const escape = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const thRow = (cells: string[]) => `<tr>${cells.map((c) => `<th>${escape(c)}</th>`).join("")}</tr>`;

  const tdEsc = (v: string) => `<td>${escape(v)}</td>`;
  const tdRaw = (html: string) => `<td>${html}</td>`;

  const rowsHtml = rows
    .map((r, idx) => {
      const id = `row_${idx}`;
      const select = `<select class="select" data-row-id="${escape(id)}">
  <option value="">미선택</option>
  <option value="pass">PASS</option>
  <option value="fail">FAIL</option>
</select>`;
      return `<tr data-row-id="${escape(id)}">${[
        tdEsc(r.domain ?? ""),
        tdEsc(r.path ?? ""),
        tdEsc(r.precondition ?? ""),
        tdEsc(r.step ?? ""),
        tdEsc(r.checkitem ?? ""),
        tdEsc(r.result ?? ""),
        tdRaw(select),
      ].join("")}</tr>`;
    })
    .join("");

  const metaBits = [
    `<div class="meta"><div><b>Figma</b>: <a href="${escape(figmaUrl)}" target="_blank" rel="noreferrer noopener">${escape(
      figmaUrl
    )}</a></div>`,
    context?.figmaNodeName ? `<div><b>Node</b>: ${escape(context.figmaNodeName)}</div>` : "",
    context?.figmaNodeDescription
      ? `<div><b>Description</b>: ${escape(context.figmaNodeDescription)}</div>`
      : "",
    `</div>`,
  ]
    .filter(Boolean)
    .join("");

  const screenshot = context?.figmaImageUrl
    ? `<div class="shot"><div class="shotTitle">Screen</div><img alt="Figma screenshot" src="${escape(
        context.figmaImageUrl
      )}" /></div>`
    : "";

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <style>
      :root {
        --bg: #0b1020;
        --panel: rgba(255,255,255,0.06);
        --text: rgba(255,255,255,0.92);
        --muted: rgba(255,255,255,0.72);
        --line: rgba(255,255,255,0.14);
        --accent: #7c3aed;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
        background: radial-gradient(1200px 800px at 10% 10%, rgba(124,58,237,0.25), transparent 55%),
                    radial-gradient(1200px 800px at 90% 10%, rgba(34,197,94,0.18), transparent 55%),
                    var(--bg);
        color: var(--text);
      }
      .wrap { max-width: 1200px; margin: 0 auto; padding: 28px 18px 60px; }
      .top {
        display: flex; gap: 12px; align-items: baseline; justify-content: space-between;
        flex-wrap: wrap;
      }
      h1 { margin: 0; font-size: 20px; letter-spacing: -0.02em; }
      .btns { display: flex; gap: 10px; }
      button {
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.06);
        color: var(--text);
        padding: 10px 12px;
        border-radius: 10px;
        cursor: pointer;
      }
      button:hover { border-color: rgba(255,255,255,0.28); }
      .primary { background: linear-gradient(135deg, rgba(124,58,237,0.9), rgba(124,58,237,0.55)); border-color: rgba(124,58,237,0.55); }
      .meta {
        margin-top: 14px;
        padding: 14px 14px;
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        color: var(--muted);
        display: grid;
        gap: 6px;
      }
      a { color: rgba(147,197,253,0.95); text-decoration: none; }
      a:hover { text-decoration: underline; }
      .shot {
        margin-top: 14px;
        padding: 14px;
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
      }
      .shotTitle { font-weight: 600; margin-bottom: 10px; }
      .shot img { width: 100%; height: auto; border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); }
      .tableWrap {
        margin-top: 18px;
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        overflow: hidden;
      }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        border-bottom: 1px solid rgba(255,255,255,0.10);
        border-right: 1px solid rgba(255,255,255,0.10);
        padding: 10px 10px;
        vertical-align: top;
        font-size: 13px;
        line-height: 1.4;
        white-space: pre-wrap;
      }
      th:last-child, td:last-child { border-right: none; }
      th {
        position: sticky;
        top: 0;
        background: rgba(11,16,32,0.9);
        backdrop-filter: blur(10px);
        text-align: left;
        font-size: 12px;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.78);
      }
      .select {
        width: 100%;
        max-width: 140px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(0,0,0,0.22);
        color: rgba(255,255,255,0.92);
        padding: 8px 10px;
        border-radius: 10px;
        outline: none;
      }
      .select:focus { border-color: rgba(124,58,237,0.65); }
      .summary { margin-top: 12px; color: rgba(255,255,255,0.72); font-size: 12px; display:flex; gap:10px; flex-wrap:wrap; }
      .pill { border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 999px; }
      tr:hover td { background: rgba(255,255,255,0.04); }
      .hint { margin-top: 12px; color: rgba(255,255,255,0.62); font-size: 12px; }
      @media print {
        body { background: white; color: black; }
        .meta, .shot, .tableWrap { background: white; }
        a { color: black; }
        button, .hint { display: none; }
        th { position: static; background: #f3f4f6; color: #111827; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <h1>${escape(title)}</h1>
        <div class="btns">
          <button class="primary" onclick="window.print()">인쇄/저장(PDF)</button>
          <button onclick="downloadHtml()">HTML 다운로드</button>
        </div>
      </div>
      ${metaBits}
      ${screenshot}
      <div class="tableWrap">
        <table>
          <thead>
            ${thRow(["도메인", "경로", "사전조건", "단계", "체크 항목", "기대 결과", "테스트 결과"])}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="summary" id="summary">
        <span class="pill">PASS: <b id="countPass">0</b></span>
        <span class="pill">FAIL: <b id="countFail">0</b></span>
        <span class="pill">미선택: <b id="countNone">0</b></span>
      </div>
      <div class="hint">팁: 이 창은 단독 HTML이라 공유/저장하기 쉽습니다.</div>
    </div>
    <script>
      const storageKey = "checklist_auto:results:" + location.href;

      function readState() {
        try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
      }
      function writeState(state) {
        try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
      }
      function updateSummary() {
        const selects = Array.from(document.querySelectorAll("select.select"));
        let pass = 0, fail = 0, none = 0;
        for (const s of selects) {
          const v = s.value || "";
          if (v === "pass") pass++;
          else if (v === "fail") fail++;
          else none++;
        }
        document.getElementById("countPass").textContent = String(pass);
        document.getElementById("countFail").textContent = String(fail);
        document.getElementById("countNone").textContent = String(none);
      }

      (function initResults() {
        const state = readState();
        const selects = Array.from(document.querySelectorAll("select.select"));
        for (const s of selects) {
          const id = s.getAttribute("data-row-id");
          if (id && typeof state[id] === "string") s.value = state[id];
          s.addEventListener("change", () => {
            const next = readState();
            if (id) next[id] = s.value || "";
            writeState(next);
            updateSummary();
          });
        }
        updateSummary();
      })();

      function downloadHtml() {
        const blob = new Blob([document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "checklist.html";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 0);
      }
    </script>
  </body>
</html>`;
}

