import type { DesignElement, DesignState, GarmentView } from "@/lib/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/store/designStore";
import { getGarmentGeometry, isDarkColor, seamColor } from "./garmentSvg";

/** XML-escape text content for safe SVG embedding. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderElement(el: DesignElement): string {
  if (el.type === "image") {
    // src is a base64 data URL, embeds directly.
    return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${el.src}" preserveAspectRatio="xMidYMid meet" />`;
  }

  // Text: SVG text is baseline-anchored, so emulate the DOM's centered box.
  const anchor =
    el.textAlign === "center" ? "middle" : el.textAlign === "right" ? "end" : "start";
  const tx =
    el.textAlign === "center"
      ? el.x + el.width / 2
      : el.textAlign === "right"
        ? el.x + el.width
        : el.x;
  // Vertically center within the element box.
  const ty = el.y + el.height / 2 + el.fontSize * 0.35;
  const letterSpacingPx = el.letterSpacing * el.fontSize;

  return (
    `<text x="${tx}" y="${ty}" ` +
    `font-family="Inter, sans-serif" ` +
    `font-size="${el.fontSize}" font-weight="${el.fontWeight}" ` +
    `letter-spacing="${letterSpacingPx}" ` +
    `fill="${el.color}" text-anchor="${anchor}" ` +
    `style="text-transform:uppercase">${escapeXml(el.text)}</text>`
  );
}

interface DesignSvgOptions {
  /** Override which view to render (defaults to design.view). */
  view?: GarmentView;
  /** Draw a backdrop rectangle (useful for PNG so it isn't transparent). */
  background?: string | null;
}

/**
 * Render the full design (garment + the elements for one view) to a
 * standalone SVG string. Shared by PNG export and the design sheet.
 */
export function designToSvg(
  design: DesignState,
  options: DesignSvgOptions = {},
): string {
  const view = options.view ?? design.view;
  const { background = null } = options;
  const geo = getGarmentGeometry(design.garment, view);
  const seam = seamColor(design.garmentColor);
  const shadowColor = isDarkColor(design.garmentColor)
    ? "rgba(0,0,0,0.45)"
    : "rgba(0,0,0,0.12)";

  const elements = design.elements
    .filter((el) => el.view === view)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(renderElement)
    .join("\n    ");

  const fills = (geo.fills ?? [])
    .map(
      (d) =>
        `<path d="${d}" fill="${design.garmentColor}" stroke="${seam}" stroke-width="2" />`,
    )
    .join("\n    ");

  const waistband =
    design.garment === "hoodie"
      ? `<rect x="165" y="586" width="270" height="26" rx="6" fill="${design.garmentColor}" stroke="${seam}" stroke-width="2" />`
      : "";

  const details = geo.details
    .map(
      (det) =>
        `<path d="${det.d}" fill="none" stroke="${seam}" stroke-width="${det.closed ? 2 : 3}" />`,
    )
    .join("\n    ");

  const bg = background
    ? `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${background}" />`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
  <defs>
    <filter id="gs" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="40" flood-color="${shadowColor}" flood-opacity="0.9" />
    </filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.07" />
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.08" />
    </linearGradient>
  </defs>
  ${bg}
  <g filter="url(#gs)">
    ${fills}
    <path d="${geo.body}" fill="${design.garmentColor}" stroke="${seam}" stroke-width="2" />
    <path d="${geo.body}" fill="url(#sheen)" />
    ${waistband}
    ${details}
  </g>
  <g>
    ${elements}
  </g>
</svg>`;
}
