import type { GarmentType, GarmentView } from "@/lib/types";

/**
 * Single source of truth for garment geometry.
 *
 * Both the on-screen React mockup (GarmentMockup.tsx) and the export pipeline
 * (designToSvg.ts) consume these so the exported PNG matches the canvas exactly.
 * Everything is expressed in the canvas's logical 600x700 coordinate space.
 */

export interface GarmentGeometry {
  /** Main body path (filled with the garment color). */
  body: string;
  /** Decorative seam/detail paths drawn with the seam stroke, never filled. */
  details: { d: string; closed?: boolean }[];
  /** Optional filled extra shapes (e.g. hood, waistband) behind/around body. */
  fills?: string[];
}

const TSHIRT_BODY =
  "M180 150 L120 175 L70 250 L110 300 L160 280 L160 560 " +
  "Q160 580 180 580 L420 580 Q440 580 440 560 L440 280 " +
  "L490 300 L530 250 L480 175 L420 150 Z";

const HOODIE_BODY =
  "M175 200 L110 220 L60 300 L100 355 L165 330 L165 590 " +
  "Q165 612 188 612 L412 612 Q435 612 435 590 L435 330 " +
  "L500 355 L540 300 L490 220 L425 200 Z";

const HOODIE_HOOD =
  "M205 205 Q300 120 395 205 Q360 245 300 248 Q240 245 205 205 Z";

export function getGarmentGeometry(
  garment: GarmentType,
  view: GarmentView,
): GarmentGeometry {
  if (garment === "tshirt") {
    return {
      body: TSHIRT_BODY,
      details: [
        view === "front"
          ? { d: "M250 150 Q300 195 350 150" }
          : { d: "M250 150 Q300 172 350 150" },
      ],
    };
  }

  // hoodie
  const details: { d: string; closed?: boolean }[] = [];
  if (view === "front") {
    details.push(
      { d: "M278 235 L278 300" },
      { d: "M322 235 L322 300" },
      { d: "M230 470 L370 470 L350 545 L250 545 Z", closed: true },
    );
  } else {
    details.push({ d: "M205 205 Q300 150 395 205" });
  }

  return {
    body: HOODIE_BODY,
    fills: [HOODIE_HOOD],
    details,
  };
}

/** Perceived-luminance check used to pick contrasting seam colors. */
export function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

export function seamColor(garmentColor: string): string {
  return isDarkColor(garmentColor)
    ? "rgba(255,255,255,0.14)"
    : "rgba(0,0,0,0.18)";
}
