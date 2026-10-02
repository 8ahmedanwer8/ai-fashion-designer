import type {
  GenerateImageParams,
  GenerateImageResult,
  ImageProvider,
} from "./types";

/**
 * Mock image provider — no API key required.
 *
 * Produces a deterministic, prompt-derived SVG "artwork" (data URL) so each
 * prompt yields a distinct, repeatable graphic. This stands in for a real
 * diffusion model during local development; swap in a real provider via env.
 */
export class MockImageProvider implements ImageProvider {
  readonly id = "mock";

  async generate(params: GenerateImageParams): Promise<GenerateImageResult> {
    // Simulate network/generation latency so loading states are visible.
    await delay(900);

    const size = params.size ?? 512;
    const svg = buildArtSvg(params.prompt, size);
    const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    return {
      src,
      label: shortLabel(params.prompt),
      provider: this.id,
    };
  }
}

/** Deterministic 32-bit hash of the prompt → drives all visual choices. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildArtSvg(prompt: string, size: number): string {
  const h = hash(prompt);
  const hue = h % 360;
  const hue2 = (hue + 140 + (h % 80)) % 360;
  const shapes = 3 + (h % 4);
  const safe = shortLabel(prompt).toUpperCase().replace(/[<>&]/g, "");

  // Background gradient + a ring of generated shapes + a caption.
  let body = "";
  for (let i = 0; i < shapes; i++) {
    const seed = hash(prompt + i);
    const cx = 80 + (seed % (size - 160));
    const cy = 80 + ((seed >> 8) % (size - 160));
    const r = 40 + ((seed >> 16) % (size / 5));
    const op = 0.25 + ((seed >> 4) % 50) / 100;
    const sh = (seed >> 2) % 3;
    const col = `hsl(${(hue + i * 40) % 360} 80% 60%)`;
    if (sh === 0) {
      body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${op}" />`;
    } else if (sh === 1) {
      body += `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r / 4}" fill="${col}" opacity="${op}" transform="rotate(${seed % 90} ${cx} ${cy})" />`;
    } else {
      body += `<polygon points="${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}" fill="${col}" opacity="${op}" />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 70% 18%)" />
      <stop offset="100%" stop-color="hsl(${hue2} 70% 10%)" />
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="${size / 60}" /></filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${size / 20}" />
  <g filter="url(#blur)">${body}</g>
  <rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="${size / 22}" fill="none" stroke="hsl(${hue} 90% 70%)" stroke-width="2" opacity="0.6" />
  <text x="${size / 2}" y="${size - size / 8}" fill="#ffffff" font-family="Inter, sans-serif" font-size="${size / 16}" font-weight="800" text-anchor="middle" style="letter-spacing:2px">${safe}</text>
  <text x="${size / 2}" y="${size - size / 8 + size / 22}" fill="hsl(${hue} 90% 80%)" font-family="monospace" font-size="${size / 36}" text-anchor="middle" opacity="0.7">AI · MOCK RENDER</text>
</svg>`;
}

/** Trim a prompt down to a few words for the layer label / caption. */
function shortLabel(prompt: string): string {
  const words = prompt
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.join(" ") || "Graphic";
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
