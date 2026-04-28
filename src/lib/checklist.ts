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
    figmaError?: string;
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

  const tdEsc = (v: string) => `<td>${escape(v)}</td>`;
  const tdEscClass = (v: string, cls: string) => `<td class="${escape(cls)}">${escape(v)}</td>`;
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
        tdEscClass(String(idx + 1), "no"),
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
    context?.figmaError ? `<div><b>Figma 상태</b>: ${escape(context.figmaError)}</div>` : "",
    `</div>`,
  ]
    .filter(Boolean)
    .join("");

  const media = `<div class="mediaGrid ${context?.figmaImageUrl ? "" : "single"}">
    ${
      context?.figmaImageUrl
        ? `<div class="shot">
            <div class="shotTitle">Screen</div>
            <a href="${escape(context.figmaImageUrl)}" target="_blank" rel="noreferrer noopener">
              <img alt="Figma screenshot" src="${escape(context.figmaImageUrl)}" />
            </a>
            <div class="shotHint">이미지 클릭 시 원본 크기로 새 탭에서 열립니다.</div>
          </div>`
        : ""
    }
    <div class="chartCard">
      <div class="shotTitle">테스트 결과 요약</div>
      <div class="chartRow">
        <div class="donut" id="donut" aria-label="PASS/FAIL/미선택 비율"></div>
        <div class="legend">
          <div class="legendItem"><span class="swatch pass"></span> PASS <b id="pctPass">0%</b> <span class="muted">(<span id="cntPass">0</span>)</span></div>
          <div class="legendItem"><span class="swatch fail"></span> FAIL <b id="pctFail">0%</b> <span class="muted">(<span id="cntFail">0</span>)</span></div>
          <div class="legendItem"><span class="swatch none"></span> 미선택 <b id="pctNone">100%</b> <span class="muted">(<span id="cntNone">0</span>)</span></div>
          <div class="legendHint muted">총 <b id="cntTotal">0</b>개 항목 기준 (100%)</div>
        </div>
      </div>
    </div>
  </div>`;

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
        background: linear-gradient(to bottom, #000000, #020617, #000000);
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
      .shot img {
        width: 100%;
        height: auto;
        max-height: 420px;
        object-fit: contain;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(0,0,0,0.22);
      }
      .shotHint { margin-top: 10px; color: rgba(255,255,255,0.62); font-size: 12px; }
      .mediaGrid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .mediaGrid.single { grid-template-columns: 1fr; }
      .chartCard {
        padding: 14px;
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
      }
      .chartRow { display: grid; grid-template-columns: 168px 1fr; gap: 14px; align-items: center; }
      .donut {
        width: 168px;
        height: 168px;
        border-radius: 999px;
        background: conic-gradient(
          rgba(34,197,94,0.90) 0deg,
          rgba(34,197,94,0.90) 0deg,
          rgba(244,63,94,0.90) 0deg,
          rgba(244,63,94,0.90) 0deg,
          rgba(255,255,255,0.18) 0deg,
          rgba(255,255,255,0.18) 360deg
        );
        position: relative;
        border: 1px solid rgba(255,255,255,0.14);
      }
      .donut::after {
        content: "";
        position: absolute;
        inset: 16px;
        border-radius: 999px;
        background: rgba(11,16,32,0.85);
        border: 1px solid rgba(255,255,255,0.10);
      }
      .legend { display: grid; gap: 8px; }
      .legendItem { display: flex; align-items: baseline; gap: 8px; color: rgba(255,255,255,0.88); }
      .legendItem b { margin-left: 4px; }
      .legendHint { margin-top: 6px; font-size: 12px; }
      .swatch { width: 10px; height: 10px; border-radius: 3px; display:inline-block; }
      .swatch.pass { background: rgba(34,197,94,0.9); }
      .swatch.fail { background: rgba(244,63,94,0.9); }
      .swatch.none { background: rgba(255,255,255,0.18); }
      .muted { color: rgba(255,255,255,0.72); }
      .tableWrap {
        margin-top: 18px;
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        overflow: auto;
      }
      table { width: 100%; min-width: 1400px; border-collapse: collapse; table-layout: fixed; }
      col.no { width: 56px; }
      col.domain { width: 88px; }
      col.path { width: 120px; }
      col.precondition { width: 160px; }
      col.step { width: 280px; }
      col.checkitem { width: 220px; }
      col.expected { width: 320px; }
      col.actual { width: 150px; }
      th, td {
        border-bottom: 1px solid rgba(255,255,255,0.10);
        border-right: 1px solid rgba(255,255,255,0.10);
        padding: 10px 10px;
        vertical-align: top;
        font-size: 13px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
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
      th.no, td.no { text-align: right; font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.75); }
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
      .select.pass {
        border-color: rgba(34,197,94,0.55);
        background: rgba(34,197,94,0.22);
      }
      .select.fail {
        border-color: rgba(244,63,94,0.55);
        background: rgba(244,63,94,0.22);
      }
      tr.pass td { background: rgba(34,197,94,0.06); }
      tr.fail td { background: rgba(244,63,94,0.06); }
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
      ${media}
      <div class="tableWrap">
        <table>
          <colgroup>
            <col class="no" />
            <col class="domain" />
            <col class="path" />
            <col class="precondition" />
            <col class="step" />
            <col class="checkitem" />
            <col class="expected" />
            <col class="actual" />
          </colgroup>
          <thead>
            <tr>
              <th class="no">No</th>
              <th>도메인</th>
              <th>경로</th>
              <th>사전조건</th>
              <th>단계</th>
              <th>체크 항목</th>
              <th>기대 결과</th>
              <th>테스트 결과</th>
            </tr>
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

        const total = pass + fail + none;
        const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
        const pPass = pct(pass);
        const pFail = pct(fail);
        const pNone = Math.max(0, 100 - pPass - pFail);

        document.getElementById("pctPass").textContent = String(pPass) + "%";
        document.getElementById("pctFail").textContent = String(pFail) + "%";
        document.getElementById("pctNone").textContent = String(pNone) + "%";
        document.getElementById("cntPass").textContent = String(pass);
        document.getElementById("cntFail").textContent = String(fail);
        document.getElementById("cntNone").textContent = String(none);
        document.getElementById("cntTotal").textContent = String(total);

        const degPass = (pPass / 100) * 360;
        const degFail = (pFail / 100) * 360;
        const donut = document.getElementById("donut");
        if (donut) {
          donut.style.background = "conic-gradient(" +
            "rgba(34,197,94,0.90) 0deg " + degPass + "deg, " +
            "rgba(244,63,94,0.90) " + degPass + "deg " + (degPass + degFail) + "deg, " +
            "rgba(255,255,255,0.18) " + (degPass + degFail) + "deg 360deg" +
          ")";
        }
      }

      function applyResultStyles(selectEl) {
        const v = (selectEl.value || "");
        selectEl.classList.remove("pass", "fail");
        if (v === "pass") selectEl.classList.add("pass");
        if (v === "fail") selectEl.classList.add("fail");

        const rowId = selectEl.getAttribute("data-row-id");
        if (!rowId) return;
        const tr = document.querySelector('tr[data-row-id=\"' + CSS.escape(rowId) + '\"]');
        if (!tr) return;
        tr.classList.remove("pass", "fail");
        if (v === "pass") tr.classList.add("pass");
        if (v === "fail") tr.classList.add("fail");
      }

      (function initResults() {
        const state = readState();
        const selects = Array.from(document.querySelectorAll("select.select"));
        for (const s of selects) {
          const id = s.getAttribute("data-row-id");
          if (id && typeof state[id] === "string") s.value = state[id];
          applyResultStyles(s);
          s.addEventListener("change", () => {
            const next = readState();
            if (id) next[id] = s.value || "";
            writeState(next);
            applyResultStyles(s);
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

