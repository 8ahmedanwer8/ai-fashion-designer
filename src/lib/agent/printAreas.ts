import type { GarmentType, GarmentView } from "@/lib/types";

/**
 * Named print areas — the garment as a REAL data model instead of a flat grid.
 *
 * Each area is a rectangle in the 600x700 logical canvas space, scoped to a
 * garment + view. They serve three roles:
 *   1. AI placement targets — actions can say `area: "left-chest"` instead of
 *      guessing raw pixels (the model doesn't need to know geometry).
 *   2. Rendered overlay — the canvas can show where printing is possible.
 *   3. Soft validation — elements outside every area get a warning (dragging
 *      onto a sleeve is allowed, just flagged).
 *
 * This module is the single source of truth: the system prompt, the validator,
 * applyActions, and the canvas overlay all consume it.
 */

export type PrintAreaId =
  | "front-center"
  | "left-chest"
  | "front-neck"
  | "back-center"
  | "back-neck";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintArea {
  id: PrintAreaId;
  /** Human-readable name (overlay label). */
  label: string;
  view: GarmentView;
  /** What this placement is for, in words the LLM understands. */
  description: string;
  /** Resolved rectangle for the given garment. */
  rect: Rect;
}

interface AreaDef {
  id: PrintAreaId;
  label: string;
  view: GarmentView;
  description: string;
  /** Base rectangle (t-shirt fit). */
  rect: Rect;
  /** Hoodie bodies start lower (hood + neckline); shift areas down when set. */
  hoodieRect?: Rect;
}

/**
 * Geometry notes (600x700 canvas):
 *   t-shirt body  ~ x:160-440, y:150-580
 *   hoodie body   ~ x:165-435, y:200-612, hood occupies y:120-250 in front
 */
const AREA_DEFS: AreaDef[] = [
  {
    id: "front-center",
    label: "Front Center",
    view: "front",
    description: "large chest print, centered on the front",
    rect: { x: 200, y: 280, width: 200, height: 200 },
    hoodieRect: { x: 200, y: 310, width: 200, height: 190 },
  },
  {
    id: "left-chest",
    label: "Left Chest",
    view: "front",
    description: "small logo, upper-left of the chest",
    rect: { x: 150, y: 245, width: 85, height: 70 },
    hoodieRect: { x: 150, y: 275, width: 85, height: 70 },
  },
  {
    id: "front-neck",
    label: "Front Neck",
    view: "front",
    description: "tiny text just under the front collar",
    rect: { x: 250, y: 195, width: 100, height: 32 },
    hoodieRect: { x: 250, y: 218, width: 100, height: 32 },
  },
  {
    id: "back-center",
    label: "Back Center",
    view: "back",
    description: "large back print, centered on the back",
    rect: { x: 180, y: 245, width: 240, height: 260 },
    hoodieRect: { x: 180, y: 260, width: 240, height: 250 },
  },
  {
    id: "back-neck",
    label: "Back Neck",
    view: "back",
    description: "small text just under the back collar",
    rect: { x: 250, y: 185, width: 100, height: 32 },
    hoodieRect: { x: 250, y: 208, width: 100, height: 32 },
  },
];

/** All valid area ids (for validating untrusted model output). */
export const PRINT_AREA_IDS: ReadonlySet<string> = new Set(
  AREA_DEFS.map((a) => a.id),
);

/** Resolve an area id to its garment-specific rectangle. */
export function findArea(id: PrintAreaId, garment: GarmentType): PrintArea | null {
  const def = AREA_DEFS.find((a) => a.id === id);
  if (!def) return null;
  return {
    id: def.id,
    label: def.label,
    view: def.view,
    description: def.description,
    rect: (garment === "hoodie" ? def.hoodieRect : undefined) ?? def.rect,
  };
}

/** All areas available for a garment + view (canvas overlay uses this). */
export function getPrintAreas(garment: GarmentType, view: GarmentView): PrintArea[] {
  return AREA_DEFS.filter((a) => a.view === view).map((a) =>
    findArea(a.id, garment)!,
  );
}

/**
 * Placement for a TEXT element in an area: the element spans the area's full
 * width (rendered centered via textAlign) and is vertically centered based on
 * the estimated text height.
 */
export function textAreaPlacement(
  area: PrintArea,
  estimatedHeight: number,
): { x: number; y: number; width: number } {
  const r = area.rect;
  return {
    x: r.x,
    y: r.y + Math.max(0, Math.round((r.height - estimatedHeight) / 2)),
    width: r.width,
  };
}

/**
 * Placement for a (square) GRAPHIC in an area: fitted to the area's shorter
 * side (or the requested size, clamped to fit) and centered.
 */
export function graphicAreaPlacement(
  area: PrintArea,
  size?: number,
): { x: number; y: number; size: number } {
  const r = area.rect;
  const fit = Math.min(r.width, r.height);
  const s = size !== undefined ? Math.min(size, fit) : fit;
  return {
    size: Math.round(s),
    x: Math.round(r.x + (r.width - s) / 2),
    y: Math.round(r.y + (r.height - s) / 2),
  };
}

/** The print area a bounding box currently overlaps, if any (first match). */
export function findContainingPrintArea(
  box: Rect,
  garment: GarmentType,
  view: GarmentView,
): PrintArea | null {
  return (
    getPrintAreas(garment, view).find((area) => rectsIntersect(box, area.rect)) ??
    null
  );
}

/** True if a bounding box overlaps any print area (soft validation check). */
export function intersectsAnyPrintArea(
  box: Rect,
  garment: GarmentType,
  view: GarmentView,
): boolean {
  return findContainingPrintArea(box, garment, view) !== null;
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
