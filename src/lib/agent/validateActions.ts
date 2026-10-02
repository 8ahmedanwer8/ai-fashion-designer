import type {
  DesignAction,
  ElementSelector,
  LayoutPreset,
} from "./actions";

/**
 * Validates raw, untrusted action data (e.g. parsed from an LLM response)
 * BEFORE it is allowed to mutate the canvas. Invalid actions are dropped with a
 * recorded error rather than throwing, so a single bad action never discards a
 * whole batch.
 */

export interface ValidationResult {
  valid: DesignAction[];
  errors: string[];
}

const GARMENTS = new Set(["tshirt", "hoodie"]);
const VIEWS = new Set(["front", "back"]);
const ALIGNS = new Set(["left", "center", "right"]);
const LAYOUTS = new Set<LayoutPreset>([
  "minimal",
  "bold-center",
  "left-chest",
  "back-graphic",
]);
const SELECTOR_KEYWORDS = new Set([
  "selected",
  "last",
  "lastText",
  "lastImage",
  "logo",
]);

/** Accept arrays of actions, or a single action object, or {actions:[...]}. */
export function validateActions(raw: unknown): ValidationResult {
  const errors: string[] = [];

  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { actions?: unknown[] }).actions)) {
    list = (raw as { actions: unknown[] }).actions;
  } else if (raw && typeof raw === "object") {
    list = [raw];
  } else {
    return { valid: [], errors: ["Actions payload was not an array or object."] };
  }

  const valid: DesignAction[] = [];
  list.forEach((item, i) => {
    const result = validateOne(item, i);
    if (result.ok) {
      valid.push(result.action);
    } else {
      errors.push(result.error);
    }
  });

  return { valid, errors };
}

type OneResult =
  | { ok: true; action: DesignAction }
  | { ok: false; error: string };

function validateOne(item: unknown, index: number): OneResult {
  if (!item || typeof item !== "object") {
    return { ok: false, error: `Action #${index} is not an object.` };
  }
  const a = item as Record<string, unknown>;
  const type = a.type;

  switch (type) {
    case "setGarmentType":
      if (!isGarment(a.garment))
        return fail(index, "setGarmentType needs garment 'tshirt'|'hoodie'.");
      return ok({ type, garment: a.garment as "tshirt" | "hoodie" });

    case "setGarmentColor":
      if (!isColor(a.color))
        return fail(index, "setGarmentColor needs a valid color string.");
      return ok({ type, color: a.color as string });

    case "switchView":
      if (!isView(a.view))
        return fail(index, "switchView needs view 'front'|'back'.");
      return ok({ type, view: a.view as "front" | "back" });

    case "addText": {
      if (typeof a.text !== "string" || a.text.trim() === "")
        return fail(index, "addText needs non-empty text.");
      const action: DesignAction = { type, text: a.text };
      if (isView(a.view)) action.view = a.view as "front" | "back";
      if (isNum(a.x)) action.x = a.x as number;
      if (isNum(a.y)) action.y = a.y as number;
      if (isNum(a.fontSize)) action.fontSize = clamp(a.fontSize as number, 6, 200);
      if (isColor(a.color)) action.color = a.color as string;
      if (isNum(a.fontWeight)) action.fontWeight = a.fontWeight as number;
      if (isNum(a.letterSpacing)) action.letterSpacing = a.letterSpacing as number;
      if (typeof a.textAlign === "string" && ALIGNS.has(a.textAlign))
        action.textAlign = a.textAlign as "left" | "center" | "right";
      return ok(action);
    }

    case "recolorElement": {
      if (!isSelector(a.target))
        return fail(index, "recolorElement needs a valid target.");
      if (!isColor(a.color))
        return fail(index, "recolorElement needs a valid color.");
      return ok({ type, target: a.target as ElementSelector, color: a.color as string });
    }

    case "moveElement": {
      if (!isSelector(a.target))
        return fail(index, "moveElement needs a valid target.");
      const action: DesignAction = { type, target: a.target as ElementSelector };
      if (isNum(a.x)) action.x = a.x as number;
      if (isNum(a.y)) action.y = a.y as number;
      if (isNum(a.dx)) action.dx = a.dx as number;
      if (isNum(a.dy)) action.dy = a.dy as number;
      if (
        action.x === undefined &&
        action.y === undefined &&
        action.dx === undefined &&
        action.dy === undefined
      )
        return fail(index, "moveElement needs x/y or dx/dy.");
      return ok(action);
    }

    case "resizeElement": {
      if (!isSelector(a.target))
        return fail(index, "resizeElement needs a valid target.");
      const action: DesignAction = { type, target: a.target as ElementSelector };
      if (isNum(a.width)) action.width = clamp(a.width as number, 8, 600);
      if (isNum(a.height)) action.height = clamp(a.height as number, 8, 700);
      if (isNum(a.scale)) action.scale = clamp(a.scale as number, 0.1, 5);
      if (
        action.width === undefined &&
        action.height === undefined &&
        action.scale === undefined
      )
        return fail(index, "resizeElement needs width/height or scale.");
      return ok(action);
    }

    case "deleteElement":
      if (!isSelector(a.target))
        return fail(index, "deleteElement needs a valid target.");
      return ok({ type, target: a.target as ElementSelector });

    case "applyLayout":
      if (typeof a.layout !== "string" || !LAYOUTS.has(a.layout as LayoutPreset))
        return fail(
          index,
          "applyLayout needs layout 'minimal'|'bold-center'|'left-chest'|'back-graphic'.",
        );
      return ok({ type, layout: a.layout as LayoutPreset });

    case "addPlaceholderGraphic": {
      const action: DesignAction = { type };
      if (typeof a.label === "string") action.label = a.label;
      if (isView(a.view)) action.view = a.view as "front" | "back";
      if (isNum(a.x)) action.x = a.x as number;
      if (isNum(a.y)) action.y = a.y as number;
      if (isNum(a.size)) action.size = clamp(a.size as number, 20, 400);
      if (a.shape === "square" || a.shape === "circle") action.shape = a.shape;
      return ok(action);
    }

    case "generateGraphic": {
      if (typeof a.prompt !== "string" || a.prompt.trim() === "")
        return fail(index, "generateGraphic needs a non-empty prompt.");
      const action: DesignAction = { type, prompt: a.prompt };
      if (isView(a.view)) action.view = a.view as "front" | "back";
      if (isNum(a.x)) action.x = a.x as number;
      if (isNum(a.y)) action.y = a.y as number;
      if (isNum(a.size)) action.size = clamp(a.size as number, 40, 600);
      return ok(action);
    }

    default:
      return fail(index, `Unknown action type: ${JSON.stringify(type)}.`);
  }
}

// --- helpers ---
function ok(action: DesignAction): OneResult {
  return { ok: true, action };
}
function fail(index: number, msg: string): OneResult {
  return { ok: false, error: `Action #${index}: ${msg}` };
}
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isGarment(v: unknown): boolean {
  return typeof v === "string" && GARMENTS.has(v);
}
function isView(v: unknown): boolean {
  return typeof v === "string" && VIEWS.has(v);
}
function isColor(v: unknown): boolean {
  if (typeof v !== "string") return false;
  // Accept hex (#fff / #ffffff) or common CSS color keywords.
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ||
    /^[a-z]+$/i.test(v) // keyword like "black", "cream" — resolved later
  );
}
function isSelector(v: unknown): v is ElementSelector {
  if (typeof v !== "string" || v.trim() === "") return false;
  return SELECTOR_KEYWORDS.has(v) || true; // any non-empty string is a candidate id
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
