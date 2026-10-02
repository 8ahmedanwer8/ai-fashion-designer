import type {
  DesignElement,
  DesignState,
} from "@/lib/types";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  useDesignStore,
} from "@/lib/store/designStore";
import type {
  DesignAction,
  ElementSelector,
  LayoutPreset,
} from "./actions";
import { resolveColor } from "./colors";
import { makePlaceholderGraphic } from "./placeholderGraphic";
import {
  findArea,
  graphicAreaPlacement,
  textAreaPlacement,
} from "./printAreas";

/**
 * THE single design-mutation handler for the AI agent.
 *
 * Every action the assistant produces flows through here, and here only.
 * It resolves element selectors, then routes each action to the existing
 * design-store methods (the same ones manual editing uses). This guarantees
 * AI edits and manual edits share one code path.
 *
 * Returns a short human-readable summary line per applied action (used to show
 * "what the AI did" in the chat).
 */
export function applyActions(actions: DesignAction[]): string[] {
  const summaries: string[] = [];
  for (const action of actions) {
    const summary = applyOne(action);
    if (summary) summaries.push(summary);
  }
  return summaries;
}

function applyOne(action: DesignAction): string | null {
  const store = useDesignStore.getState();
  const design = store.design;

  switch (action.type) {
    case "setGarmentType":
      store.setGarment(action.garment);
      return `Set garment to ${action.garment}`;

    case "setGarmentColor": {
      const color = resolveColor(action.color);
      store.setGarmentColor(color);
      return `Set garment color to ${color}`;
    }

    case "switchView":
      store.setView(action.view);
      return `Switched to ${action.view} view`;

    case "addText": {
      // Named area wins for placement (and implies the view); raw x/y remains
      // the fallback for fine positioning.
      const area = action.area
        ? findArea(action.area, design.garment)
        : null;
      const view = area ? area.view : (action.view ?? design.view);
      // If targeting a non-active view, switch so the user sees the result.
      if (view !== design.view) store.setView(view);
      const placement = area
        ? textAreaPlacement(area, action.fontSize ?? 32)
        : {
            x: action.x !== undefined ? clampX(action.x) : undefined,
            y: action.y !== undefined ? clampY(action.y) : undefined,
            width: undefined as number | undefined,
          };
      store.addText({
        text: action.text.toUpperCase(),
        view,
        ...(placement.x !== undefined ? { x: placement.x } : {}),
        ...(placement.y !== undefined ? { y: placement.y } : {}),
        ...(placement.width !== undefined ? { width: placement.width } : {}),
        ...(action.fontSize !== undefined ? { fontSize: action.fontSize } : {}),
        ...(action.color ? { color: resolveColor(action.color) } : {}),
        ...(action.fontWeight !== undefined
          ? { fontWeight: action.fontWeight }
          : {}),
        ...(action.letterSpacing !== undefined
          ? { letterSpacing: action.letterSpacing }
          : {}),
        ...(action.textAlign
          ? { textAlign: action.textAlign }
          : area
            ? { textAlign: "center" as const }
            : {}),
      });
      return `Added text "${action.text}"${area ? ` in ${area.id}` : ""}`;
    }

    case "recolorElement": {
      const el = resolveElement(design, action.target);
      if (!el) return `Could not find element to recolor (${action.target})`;
      const color = resolveColor(action.color);
      store.updateElement(el.id, { color });
      return `Recolored ${describe(el)} ${color}`;
    }

    case "moveElement": {
      const el = resolveElement(design, action.target);
      if (!el) return `Could not find element to move (${action.target})`;
      const x =
        action.x !== undefined
          ? action.x
          : el.x + (action.dx ?? 0);
      const y =
        action.y !== undefined
          ? action.y
          : el.y + (action.dy ?? 0);
      store.moveElement(el.id, clampX(x, el.width), clampY(y, el.height));
      return `Moved ${describe(el)}`;
    }

    case "resizeElement": {
      const el = resolveElement(design, action.target);
      if (!el) return `Could not find element to resize (${action.target})`;
      let width = action.width ?? el.width;
      let height = action.height ?? el.height;
      if (action.scale !== undefined) {
        width = el.width * action.scale;
        height = el.height * action.scale;
      }
      width = clamp(width, 8, CANVAS_WIDTH);
      height = clamp(height, 8, CANVAS_HEIGHT);
      store.resizeElement(el.id, width, height);
      // Keep text legible when scaled.
      if (el.type === "text" && action.scale !== undefined) {
        store.updateElement(el.id, {
          fontSize: Math.max(8, Math.round(el.fontSize * action.scale)),
        });
      }
      return `Resized ${describe(el)}`;
    }

    case "deleteElement": {
      const el = resolveElement(design, action.target);
      if (!el) return `Could not find element to delete (${action.target})`;
      store.deleteElement(el.id);
      return `Deleted ${describe(el)}`;
    }

    case "applyLayout":
      return applyLayout(action.layout);

    case "addPlaceholderGraphic": {
      const area = action.area
        ? findArea(action.area, design.garment)
        : null;
      const view = area ? area.view : (action.view ?? design.view);
      if (view !== design.view) store.setView(view);
      const label = action.label ?? "GRAPHIC";
      const src = makePlaceholderGraphic(label, action.shape ?? "square", 240);
      const placement = area
        ? graphicAreaPlacement(area, action.size)
        : {
            size: action.size ?? 160,
            x:
              action.x !== undefined
                ? clampX(action.x, action.size ?? 160)
                : (undefined as number | undefined),
            y:
              action.y !== undefined
                ? clampY(action.y, action.size ?? 160)
                : (undefined as number | undefined),
          };
      store.addImage(src, `Placeholder: ${label}`, {
        view,
        width: placement.size,
        height: placement.size,
        ...(placement.x !== undefined ? { x: placement.x } : {}),
        ...(placement.y !== undefined ? { y: placement.y } : {}),
      });
      return `Added placeholder graphic "${label}"${area ? ` in ${area.id}` : ""}`;
    }

    case "generateGraphic":
      // Intentionally NOT handled here. Image generation is async + expensive
      // and is processed separately by the runtime so synchronous canvas edits
      // (move/resize/delete/recolor) stay cheap and instant.
      return null;

    default:
      return null;
  }
}

/**
 * Composite presets. Built entirely from primitive store actions so there is no
 * separate mutation path — applyLayout just orchestrates the same primitives.
 */
function applyLayout(layout: LayoutPreset): string {
  const store = useDesignStore.getState();
  const design = store.design;

  switch (layout) {
    case "minimal": {
      // Keep only the topmost text element on the current view; shrink + center.
      const onView = design.elements
        .filter((el) => el.view === design.view)
        .sort((a, b) => b.zIndex - a.zIndex);
      const keep = onView.find((el) => el.type === "text") ?? onView[0];
      for (const el of onView) {
        if (!keep || el.id !== keep.id) store.deleteElement(el.id);
      }
      if (keep) {
        store.moveElement(keep.id, CANVAS_WIDTH / 2 - 90, CANVAS_HEIGHT / 2 - 25);
        store.resizeElement(keep.id, 180, 50);
        if (keep.type === "text") {
          store.updateElement(keep.id, {
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: 0.15,
            textAlign: "center",
          });
        }
      }
      return "Applied minimal layout";
    }

    case "bold-center": {
      const text = topText(design);
      if (text) {
        store.moveElement(text.id, CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 50);
        store.resizeElement(text.id, 300, 100);
        store.updateElement(text.id, {
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: -0.02,
          textAlign: "center",
        });
      }
      return "Applied bold-center layout";
    }

    case "left-chest": {
      const text = topText(design);
      if (text) {
        // Left chest = upper-left quadrant of the garment, small.
        store.moveElement(text.id, 150, 250);
        store.resizeElement(text.id, 110, 30);
        store.updateElement(text.id, { fontSize: 18, fontWeight: 600 });
      }
      return "Applied left-chest layout";
    }

    case "back-graphic": {
      store.setView("back");
      store.addText({
        text: "BACK PRINT",
        view: "back",
        x: CANVAS_WIDTH / 2 - 150,
        y: 280,
        width: 300,
        height: 90,
        fontSize: 56,
        fontWeight: 800,
        letterSpacing: 0.02,
        textAlign: "center",
      });
      return "Applied back-graphic layout";
    }

    default:
      return "Unknown layout";
  }
}

/**
 * Place an already-generated image onto the garment as a normal, fully editable
 * image element. Called by the runtime AFTER async generation completes — this
 * step itself is cheap/synchronous. Once placed, the image is just like any
 * uploaded image: move/resize/delete work as ordinary canvas operations.
 */
export function placeGeneratedImage(
  src: string,
  label: string,
  opts: {
    view?: import("@/lib/types").GarmentView;
    x?: number;
    y?: number;
    size?: number;
    area?: import("./printAreas").PrintAreaId;
  } = {},
): string {
  const store = useDesignStore.getState();
  const design = store.design;
  const area = opts.area ? findArea(opts.area, design.garment) : null;
  const view = area ? area.view : (opts.view ?? design.view);
  if (view !== design.view) store.setView(view);

  let size = opts.size ?? 240;
  // Default placement: centered horizontally, in the upper-mid "print area".
  let x = opts.x ?? Math.round(CANVAS_WIDTH / 2 - size / 2);
  let y = opts.y ?? Math.round(CANVAS_HEIGHT / 2 - size / 2 - 30);
  if (area) {
    const p = graphicAreaPlacement(area, opts.size);
    size = p.size;
    x = p.x;
    y = p.y;
  }

  return store.addImage(src, label, {
    view,
    width: size,
    height: size,
    x: clampX(x, size),
    y: clampY(y, size),
  });
}

// --- selector resolution ---

/**
 * Resolve an ElementSelector to a concrete element on the design. Falls back
 * gracefully: a concrete id, then semantic selectors scoped to the current view.
 */
export function resolveElement(
  design: DesignState,
  selector: ElementSelector,
): DesignElement | null {
  // 1. Direct id match.
  const byId = design.elements.find((el) => el.id === selector);
  if (byId) return byId;

  const selectedId = useDesignStore.getState().selectedElementId;
  const onView = design.elements.filter((el) => el.view === design.view);
  const byZDesc = [...onView].sort((a, b) => b.zIndex - a.zIndex);

  switch (selector) {
    case "selected":
      return design.elements.find((el) => el.id === selectedId) ?? byZDesc[0] ?? null;
    case "last":
      return byZDesc[0] ?? null;
    case "lastText":
      return byZDesc.find((el) => el.type === "text") ?? null;
    case "lastImage":
    case "logo":
      return byZDesc.find((el) => el.type === "image") ?? byZDesc[0] ?? null;
    default:
      // Unknown id-like selector: best-effort to the selected/last element.
      return (
        design.elements.find((el) => el.id === selectedId) ?? byZDesc[0] ?? null
      );
  }
}

function topText(design: DesignState) {
  return design.elements
    .filter((el) => el.view === design.view && el.type === "text")
    .sort((a, b) => b.zIndex - a.zIndex)[0];
}

function describe(el: DesignElement): string {
  return el.type === "text" ? `text "${el.text}"` : `image "${el.name}"`;
}

function clampX(x: number, width = 0): number {
  return clamp(x, 0, CANVAS_WIDTH - width);
}
function clampY(y: number, height = 0): number {
  return clamp(y, 0, CANVAS_HEIGHT - height);
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
