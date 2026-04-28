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

  const header = [
    "domain",
    "path",
    "precondition",
    "step",
    "checkitem",
    "result",
  ] as const;

  const tr = (cells: string[], th = false) =>
    `<tr>${cells
      .map((c) => (th ? `<th>${escape(c)}</th>` : `<td>${escape(c)}</td>`))
      .join("")}</tr>`;

  const rowsHtml = rows
    .map((r) =>
      tr([
        r.domain ?? "",
        r.path ?? "",
        r.precondition ?? "",
        r.step ?? "",
        r.checkitem ?? "",
        r.result ?? "",
      ])
    )
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
            ${tr(header.slice() as unknown as string[], true)}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="hint">팁: 이 창은 단독 HTML이라 공유/저장하기 쉽습니다.</div>
    </div>
    <script>
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

