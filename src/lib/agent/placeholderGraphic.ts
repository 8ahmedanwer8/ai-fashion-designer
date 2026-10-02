/**
 * Generates a simple labeled SVG placeholder graphic as a data-URL. This lets
 * the `addPlaceholderGraphic` action exercise the image pipeline WITHOUT any
 * real image generation (that lands in a later phase).
 */
export function makePlaceholderGraphic(
  label = "GRAPHIC",
  shape: "square" | "circle" = "square",
  size = 200,
): string {
  const safe = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const frame =
    shape === "circle"
      ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 6" />`
      : `<rect x="4" y="4" width="${size - 8}" height="${size - 8}" rx="8" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 6" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="rgba(255,255,255,0.06)" rx="8" />
  ${frame}
  <text x="${size / 2}" y="${size / 2}" fill="#ffffff" font-family="Inter, sans-serif" font-size="${Math.max(
    12,
    size / 10,
  )}" font-weight="700" text-anchor="middle" dominant-baseline="middle" style="text-transform:uppercase; letter-spacing:2px">${safe}</text>
</svg>`;

  // encodeURIComponent keeps it valid as a data URL (handles # and quotes).
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
