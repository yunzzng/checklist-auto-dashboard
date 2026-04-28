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
  <option value="nt">N/T</option>
  <option value="pass">PASS</option>
  <option value="fail">FAIL</option>
  <option value="na">N/A</option>
  <option value="block">BLOCK</option>
  <option value="fixed">FIXED</option>
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
        <div class="donut" id="donut" aria-label="테스트 결과 비율"></div>
        <div class="tooltip" id="tooltip" role="status" aria-live="polite"></div>
        <div class="legend">
          <div class="legendItem"><span class="swatch pass"></span> PASS <b id="pctPass">0%</b> <span class="muted">(<span id="cntPass">0</span>)</span></div>
          <div class="legendItem"><span class="swatch fail"></span> FAIL <b id="pctFail">0%</b> <span class="muted">(<span id="cntFail">0</span>)</span></div>
          <div class="legendItem"><span class="swatch nt"></span> N/T <b id="pctNt">0%</b> <span class="muted">(<span id="cntNt">0</span>)</span></div>
          <div class="legendItem"><span class="swatch na"></span> N/A <b id="pctNa">0%</b> <span class="muted">(<span id="cntNa">0</span>)</span></div>
          <div class="legendItem"><span class="swatch block"></span> BLOCK <b id="pctBlock">0%</b> <span class="muted">(<span id="cntBlock">0</span>)</span></div>
          <div class="legendItem"><span class="swatch fixed"></span> FIXED <b id="pctFixed">0%</b> <span class="muted">(<span id="cntFixed">0</span>)</span></div>
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
      .wrap { margin: 0; padding: 50px 100px; }
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
        margin-top: 0;
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
        align-items: stretch;
      }
      .mediaGrid.single { grid-template-columns: 1fr; }
      .chartCard {
        padding: 14px;
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        text-align: left;
        position: relative;
      }
      .chartRow {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 30px;
        align-items: center;
        flex: 1;
        min-height: 0;
      }
      .donut {
        width: 300px;
        height: 300px;
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
        cursor: help;
      }
      .legend { display: grid; gap: 10px; justify-items: start; text-align: left; }
      .legendItem { display: flex; align-items: baseline; gap: 8px; color: rgba(255,255,255,0.88); }
      .legendItem b { margin-left: 4px; }
      .legendHint { margin-top: 6px; font-size: 12px; }
      .tooltip {
        position: fixed;
        display: none;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(0,0,0,0.72);
        border: 1px solid rgba(255,255,255,0.16);
        color: rgba(255,255,255,0.92);
        font-size: 12px;
        line-height: 1.35;
        pointer-events: none;
        backdrop-filter: blur(10px);
        z-index: 3;
        white-space: nowrap;
      }
      .tooltip b { font-size: 12px; }
      .swatch { width: 10px; height: 10px; border-radius: 3px; display:inline-block; }
      .swatch.pass { background: rgba(34,197,94,0.9); }
      .swatch.fail { background: rgba(244,63,94,0.9); }
      .swatch.nt { background: rgba(148,163,184,0.9); }
      .swatch.na { background: rgba(96,165,250,0.9); }
      .swatch.block { background: rgba(250,204,21,0.95); }
      .swatch.fixed { background: rgba(167,139,250,0.95); }
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
      .select.nt {
        border-color: rgba(148,163,184,0.55);
        background: rgba(148,163,184,0.20);
      }
      .select.na {
        border-color: rgba(96,165,250,0.55);
        background: rgba(96,165,250,0.20);
      }
      .select.block {
        border-color: rgba(250,204,21,0.60);
        background: rgba(250,204,21,0.18);
      }
      .select.fixed {
        border-color: rgba(167,139,250,0.60);
        background: rgba(167,139,250,0.20);
      }
      tr.pass td { background: rgba(34,197,94,0.06); }
      tr.fail td { background: rgba(244,63,94,0.06); }
      tr.nt td { background: rgba(148,163,184,0.05); }
      tr.na td { background: rgba(96,165,250,0.05); }
      tr.block td { background: rgba(250,204,21,0.05); }
      tr.fixed td { background: rgba(167,139,250,0.05); }
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
          <button onclick="window.downloadHtml && window.downloadHtml()">HTML 다운로드</button>
          <button onclick="window.openQaReport && window.openQaReport()">QA결과 리포트 생성</button>
          <button onclick="window.downloadRegressionTc && window.downloadRegressionTc()">리그레션 TC 생성</button>
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
        let pass = 0, fail = 0, nt = 0, na = 0, block = 0, fixed = 0;
        for (const s of selects) {
          const v = s.value || "";
          if (v === "pass") pass++;
          else if (v === "fail") fail++;
          else if (v === "nt") nt++;
          else if (v === "na") na++;
          else if (v === "block") block++;
          else if (v === "fixed") fixed++;
          else nt++;
        }

        const total = pass + fail + nt + na + block + fixed;
        const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
        const pPass = pct(pass);
        const pFail = pct(fail);
        const pNt = pct(nt);
        const pNa = pct(na);
        const pBlock = pct(block);
        const pFixed = Math.max(0, 100 - pPass - pFail - pNt - pNa - pBlock);

        document.getElementById("pctPass").textContent = String(pPass) + "%";
        document.getElementById("pctFail").textContent = String(pFail) + "%";
        document.getElementById("pctNt").textContent = String(pNt) + "%";
        document.getElementById("pctNa").textContent = String(pNa) + "%";
        document.getElementById("pctBlock").textContent = String(pBlock) + "%";
        document.getElementById("pctFixed").textContent = String(pFixed) + "%";
        document.getElementById("cntPass").textContent = String(pass);
        document.getElementById("cntFail").textContent = String(fail);
        document.getElementById("cntNt").textContent = String(nt);
        document.getElementById("cntNa").textContent = String(na);
        document.getElementById("cntBlock").textContent = String(block);
        document.getElementById("cntFixed").textContent = String(fixed);
        document.getElementById("cntTotal").textContent = String(total);

        const degPass = (pPass / 100) * 360;
        const degFail = (pFail / 100) * 360;
        const degNt = (pNt / 100) * 360;
        const degNa = (pNa / 100) * 360;
        const degBlock = (pBlock / 100) * 360;
        const degFixed = Math.max(0, 360 - degPass - degFail - degNt - degNa - degBlock);
        const a0 = 0;
        const a1 = a0 + degPass;
        const a2 = a1 + degFail;
        const a3 = a2 + degNt;
        const a4 = a3 + degNa;
        const a5 = a4 + degBlock;
        const a6 = a5 + degFixed;
        const donut = document.getElementById("donut");
        if (donut) {
          donut.style.background =
            "conic-gradient(" +
            "rgba(34,197,94,0.90) " + a0 + "deg " + a1 + "deg, " +
            "rgba(244,63,94,0.90) " + a1 + "deg " + a2 + "deg, " +
            "rgba(148,163,184,0.90) " + a2 + "deg " + a3 + "deg, " +
            "rgba(96,165,250,0.90) " + a3 + "deg " + a4 + "deg, " +
            "rgba(250,204,21,0.95) " + a4 + "deg " + a5 + "deg, " +
            "rgba(167,139,250,0.95) " + a5 + "deg " + a6 + "deg" +
            ")";
        }

        // hover tooltip용 구간 저장 (0deg = 12시 방향이 아니라 3시 방향이므로 보정 필요)
        window.__slices = [
          { key: "pass", label: "PASS", pct: pPass, count: pass, start: a0, end: a1 },
          { key: "fail", label: "FAIL", pct: pFail, count: fail, start: a1, end: a2 },
          { key: "nt", label: "N/T", pct: pNt, count: nt, start: a2, end: a3 },
          { key: "na", label: "N/A", pct: pNa, count: na, start: a3, end: a4 },
          { key: "block", label: "BLOCK", pct: pBlock, count: block, start: a4, end: a5 },
          { key: "fixed", label: "FIXED", pct: pFixed, count: fixed, start: a5, end: a6 },
        ];
      }

      function applyResultStyles(selectEl) {
        const v = (selectEl.value || "");
        selectEl.classList.remove("pass", "fail", "nt", "na", "block", "fixed");
        if (v === "pass") selectEl.classList.add("pass");
        else if (v === "fail") selectEl.classList.add("fail");
        else if (v === "na") selectEl.classList.add("na");
        else if (v === "block") selectEl.classList.add("block");
        else if (v === "fixed") selectEl.classList.add("fixed");
        else selectEl.classList.add("nt");

        const rowId = selectEl.getAttribute("data-row-id");
        if (!rowId) return;
        const tr = document.querySelector('tr[data-row-id=\"' + CSS.escape(rowId) + '\"]');
        if (!tr) return;
        tr.classList.remove("pass", "fail", "nt", "na", "block", "fixed");
        if (v === "pass") tr.classList.add("pass");
        else if (v === "fail") tr.classList.add("fail");
        else if (v === "na") tr.classList.add("na");
        else if (v === "block") tr.classList.add("block");
        else if (v === "fixed") tr.classList.add("fixed");
        else tr.classList.add("nt");
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

      (function initChartHover() {
        const donut = document.getElementById("donut");
        const tip = document.getElementById("tooltip");
        if (!donut || !tip) return;

        const pickSlice = (deg) => {
          const slices = window.__slices || [];
          for (const s of slices) {
            if (deg >= s.start && deg < s.end) return s;
          }
          return null;
        };

        const onMove = (e) => {
          const rect = donut.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r < 4) return;

          // Math.atan2는 0deg를 +x(3시)로 반환. conic-gradient도 3시가 시작점.
          let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (deg < 0) deg += 360;

          const slice = pickSlice(deg);
          if (!slice) {
            tip.style.display = "none";
            return;
          }

          tip.innerHTML =
            "<b>" +
            String(slice.label) +
            "</b> " +
            String(slice.pct) +
            "% (" +
            String(slice.count) +
            ")";
          tip.style.display = "block";
          const x = Math.min(rect.right - 8, Math.max(rect.left + 8, e.clientX + 12));
          const y = Math.min(rect.bottom - 8, Math.max(rect.top + 8, e.clientY + 12));
          tip.style.left = x + "px";
          tip.style.top = y + "px";
        };

        const onLeave = () => {
          tip.style.display = "none";
        };

        donut.addEventListener("mousemove", onMove);
        donut.addEventListener("mouseleave", onLeave);
      })();

      function getResultValueByRowId(rowId) {
        const sel = document.querySelector('select.select[data-row-id=\"' + CSS.escape(rowId) + '\"]');
        return sel ? (sel.value || "nt") : "nt";
      }

      function downloadTextFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 0);
      }

      function openQaReport() {
        const rows = Array.from(document.querySelectorAll("tbody tr[data-row-id]"));
        const lines = rows.map((tr) => {
          const id = tr.getAttribute("data-row-id");
          const cells = Array.from(tr.querySelectorAll("td"));
          const no = cells[0]?.textContent?.trim() || "";
          const domain = cells[1]?.textContent?.trim() || "";
          const path = cells[2]?.textContent?.trim() || "";
          const pre = cells[3]?.textContent?.trim() || "";
          const step = cells[4]?.textContent?.trim() || "";
          const check = cells[5]?.textContent?.trim() || "";
          const expected = cells[6]?.textContent?.trim() || "";
          const result = id ? getResultValueByRowId(id) : "nt";
          return { no, domain, path, pre, step, check, expected, result };
        });

        const slices = window.__slices || [];
        const summaryItems = slices
          .map((s) => "<li><b>" + s.label + "</b>: " + s.pct + "% (" + s.count + ")</li>")
          .join("");

        const detailsRows = lines
          .map((r) => {
            return (
              "<tr>" +
              "<td>" +
              r.no +
              "</td>" +
              "<td>" +
              r.domain +
              "</td>" +
              "<td>" +
              r.path +
              "</td>" +
              "<td>" +
              r.result.toUpperCase() +
              "</td>" +
              "<td>" +
              r.check +
              "</td>" +
              "<td>" +
              r.expected +
              "</td>" +
              "</tr>"
            );
          })
          .join("");

        const initialHtml =
          "<!doctype html><meta charset=\"utf-8\"/><title>QA 결과 리포트</title>" +
          "<style>" +
          "body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;margin:24px;}" +
          "h1{margin:0 0 8px 0;}" +
          ".muted{color:#6b7280;}" +
          ".card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;}" +
          "label{display:block;font-size:12px;color:#374151;margin-top:10px;}" +
          "input,textarea{width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;font-size:12px;}" +
          "textarea{min-height:90px;}" +
          ".row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}" +
          ".btns{display:flex;gap:10px;margin-top:14px;}" +
          "button{padding:10px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#111827;color:white;cursor:pointer;font-size:12px;}" +
          "button.secondary{background:white;color:#111827;}" +
          "table{width:100%;border-collapse:collapse;margin-top:12px;}" +
          "th,td{border:1px solid #e5e7eb;padding:8px;vertical-align:top;font-size:12px;}" +
          "th{background:#f9fafb;text-align:left;}" +
          "@media print{.noPrint{display:none;} body{margin:0;}}" +
          "</style>" +
          "<h1>QA 결과 리포트</h1>" +
          "<div class=\"muted\">" +
          new Date().toLocaleString() +
          "</div>" +
          "<div class=\"card noPrint\" style=\"margin-top:14px;\">" +
          "<div class=\"muted\">담당자/기간 등 정보를 입력한 뒤, 완료를 누르면 아래에 리포트가 생성됩니다. 생성 후에는 상단 브라우저의 인쇄 기능 또는 페이지 내 버튼으로 PDF 저장하세요.</div>" +
          "<div class=\"row\">" +
          "<div><label>담당자</label><input id=\"r_owner\" placeholder=\"예: 홍길동\"/></div>" +
          "<div><label>테스트 기간</label><input id=\"r_period\" placeholder=\"예: 2026-04-01 ~ 2026-04-29\"/></div>" +
          "</div>" +
          "<div class=\"row\">" +
          "<div><label>버전/빌드</label><input id=\"r_build\" placeholder=\"예: v1.2.3 (build 456)\"/></div>" +
          "<div><label>환경</label><input id=\"r_env\" placeholder=\"예: Chrome 126 / macOS\"/></div>" +
          "</div>" +
          "<label>비고</label><textarea id=\"r_note\" placeholder=\"추가 이슈/리스크/특이사항\"></textarea>" +
          "<div class=\"btns\">" +
          "<button class=\"secondary\" onclick=\"window.print()\">인쇄/저장(PDF)</button>" +
          "<button onclick=\"window.__makeReport && window.__makeReport()\">완료(리포트 생성)</button>" +
          "</div>" +
          "</div>" +
          "<div id=\"report\"></div>" +
          "<script>" +
          "window.__data = { summaryItems: " +
          JSON.stringify(summaryItems) +
          ", detailsRows: " +
          JSON.stringify(detailsRows) +
          " };" +
          "window.__makeReport = function(){ " +
          "var owner=document.getElementById('r_owner').value||'';" +
          "var period=document.getElementById('r_period').value||'';" +
          "var build=document.getElementById('r_build').value||'';" +
          "var env=document.getElementById('r_env').value||'';" +
          "var note=document.getElementById('r_note').value||'';" +
          "var html='';" +
          "html += '<h3>정보</h3><table><tbody>';" +
          "html += '<tr><th>담당자</th><td>'+owner+'</td><th>기간</th><td>'+period+'</td></tr>';" +
          "html += '<tr><th>버전/빌드</th><td>'+build+'</td><th>환경</th><td>'+env+'</td></tr>';" +
          "html += '<tr><th>비고</th><td colspan=\"3\">'+note.replace(/\\n/g,'<br/>')+'</td></tr>';" +
          "html += '</tbody></table>';" +
          "html += '<h3>요약</h3><ul>'+window.__data.summaryItems+'</ul>';" +
          "html += '<h3>상세</h3><table><thead><tr><th>No</th><th>도메인</th><th>경로</th><th>결과</th><th>체크 항목</th><th>기대 결과</th></tr></thead><tbody>'+window.__data.detailsRows+'</tbody></table>';" +
          "document.getElementById('report').innerHTML = html;" +
          "};" +
          "</script>";

        // Blob URL로 새 탭에 열기
        const blob = new Blob([initialHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }

      function downloadRegressionTc() {
        const rows = Array.from(document.querySelectorAll("tbody tr[data-row-id]"));
        const lines = rows.map((tr) => {
          const id = tr.getAttribute("data-row-id");
          const cells = Array.from(tr.querySelectorAll("td"));
          const no = cells[0]?.textContent?.trim() || "";
          const title = (cells[5]?.textContent?.trim() || "").slice(0, 120);
          const step = cells[4]?.textContent?.trim() || "";
          const expected = cells[6]?.textContent?.trim() || "";
          const result = id ? getResultValueByRowId(id) : "nt";
          return { no, title, step, expected, result };
        });

        const csv = [
          ["No", "Title", "Steps", "Expected", "LastResult"].join(","),
          ...lines.map((r) =>
            [r.no, r.title, r.step, r.expected, r.result.toUpperCase()]
              .map((v) => "\"" + String(v).replaceAll("\"", "\"\"") + "\"")
              .join(",")
          ),
        ].join("\n");

        downloadTextFile("regression-tc.csv", csv, "text/csv;charset=utf-8");
      }

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

      // onclick attribute에서 안정적으로 접근하도록 window에 바인딩
      window.downloadHtml = downloadHtml;
      window.openQaReport = openQaReport;
      window.downloadRegressionTc = downloadRegressionTc;
    </script>
  </body>
</html>`;
}

