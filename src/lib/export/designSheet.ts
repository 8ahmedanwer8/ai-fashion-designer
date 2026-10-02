import type { DesignElement, DesignState } from "@/lib/types";
import { designToSvg } from "./designToSvg";

function elementRow(el: DesignElement): string {
  const common = `${el.view} · x:${Math.round(el.x)} y:${Math.round(el.y)} · ${Math.round(
    el.width,
  )}×${Math.round(el.height)}`;
  if (el.type === "text") {
    return `<tr>
      <td><span class="badge">TEXT</span></td>
      <td>"${escapeHtml(el.text)}"</td>
      <td>${el.fontSize}px · w${el.fontWeight}</td>
      <td><span class="swatch" style="background:${el.color}"></span>${el.color}</td>
      <td class="mono">${common}</td>
    </tr>`;
  }
  return `<tr>
    <td><span class="badge">IMAGE</span></td>
    <td>${escapeHtml(el.name)}</td>
    <td>—</td>
    <td>—</td>
    <td class="mono">${common}</td>
  </tr>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a self-contained, printable HTML "design sheet" summarizing the design:
 * garment type, front + back previews, colors, and a table of all elements.
 */
export function buildDesignSheetHtml(design: DesignState): string {
  const frontSvg = designToSvg(design, { view: "front", background: "#f3f3f3" });
  const backSvg = designToSvg(design, { view: "back", background: "#f3f3f3" });

  const colorsUsed = Array.from(
    new Set(
      design.elements
        .filter((el): el is Extract<DesignElement, { type: "text" }> => el.type === "text")
        .map((el) => el.color),
    ),
  );

  const rows = design.elements.length
    ? design.elements.map(elementRow).join("\n")
    : `<tr><td colspan="5" class="empty">No elements placed.</td></tr>`;

  const garmentLabel = design.garment === "hoodie" ? "Hoodie" : "T-Shirt";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>ThreadCraft AI — Design Sheet</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 40px; color: #111; background: #fff; }
  header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #111; padding-bottom:16px; margin-bottom:28px; }
  h1 { font-size: 22px; margin: 0; letter-spacing:-0.02em; }
  .sub { font-size:12px; color:#666; font-family: ui-monospace, monospace; text-transform:uppercase; letter-spacing:0.08em; }
  .meta { display:flex; gap:32px; margin-bottom:28px; }
  .meta div span { display:block; }
  .label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#888; font-family: ui-monospace, monospace; margin-bottom:4px; }
  .value { font-size:15px; font-weight:600; }
  .previews { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px; }
  .preview { border:1px solid #ddd; border-radius:8px; overflow:hidden; }
  .preview .cap { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; padding:8px 12px; border-bottom:1px solid #eee; font-family: ui-monospace, monospace; color:#666; }
  .preview svg { width:100%; height:auto; display:block; }
  .swatch { display:inline-block; width:12px; height:12px; border-radius:3px; border:1px solid #ccc; vertical-align:middle; margin-right:6px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#888; padding:8px; border-bottom:1px solid #ddd; }
  td { padding:8px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }
  .mono { font-family: ui-monospace, monospace; font-size:11px; color:#666; }
  .badge { display:inline-block; font-size:9px; font-weight:700; letter-spacing:0.05em; padding:2px 6px; border-radius:4px; background:#111; color:#fff; }
  .empty { text-align:center; color:#999; padding:24px; }
  @media print { body { padding: 0; } .no-print { display:none; } }
  .no-print { position:fixed; top:16px; right:16px; }
  button { font-family:inherit; font-size:13px; padding:8px 16px; border:1px solid #111; background:#111; color:#fff; border-radius:6px; cursor:pointer; }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Print / Save PDF</button></div>
  <header>
    <h1>ThreadCraft AI — Design Sheet</h1>
    <span class="sub">${new Date().toLocaleString()}</span>
  </header>

  <div class="meta">
    <div>
      <span class="label">Garment</span>
      <span class="value">${garmentLabel}</span>
    </div>
    <div>
      <span class="label">Base Color</span>
      <span class="value"><span class="swatch" style="background:${design.garmentColor}"></span>${design.garmentColor}</span>
    </div>
    <div>
      <span class="label">Elements</span>
      <span class="value">${design.elements.length}</span>
    </div>
    <div>
      <span class="label">Ink Colors</span>
      <span class="value">${colorsUsed.length || "—"}</span>
    </div>
  </div>

  <div class="previews">
    <div class="preview"><div class="cap">Front</div>${frontSvg}</div>
    <div class="preview"><div class="cap">Back</div>${backSvg}</div>
  </div>

  <table>
    <thead>
      <tr><th>Type</th><th>Content</th><th>Style</th><th>Color</th><th>Placement</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

/** Open the design sheet in a new tab so the user can view / print / save it. */
export function openDesignSheet(design: DesignState): void {
  const html = buildDesignSheetHtml(design);
  const win = window.open("", "_blank");
  if (!win) {
    // Popup blocked — fall back to a downloaded HTML file.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "threadcraft-design-sheet.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
