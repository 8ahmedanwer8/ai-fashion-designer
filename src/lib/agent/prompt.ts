import type { DesignState } from "@/lib/types";
import { findContainingPrintArea } from "./printAreas";

/**
 * Builds the system prompt that instructs a real LLM to respond ONLY with
 * structured actions matching our schema. Kept separate so it can be reused /
 * tuned independently of any specific provider.
 */
export function buildSystemPrompt(): string {
  return `You are the design assistant for ThreadCraft AI, a clothing design tool.
You DO NOT write free-form designs. Instead you translate the user's request into
a JSON object of structured actions that mutate an editable canvas.

Respond with STRICT JSON only, shaped exactly:
{
  "reply": "<short friendly sentence describing what you did>",
  "actions": [ <action>, ... ]
}

Supported actions (use only these):
- { "type": "setGarmentType", "garment": "tshirt" | "hoodie" }
- { "type": "setGarmentColor", "color": "<hex like #111111 or a color name like cream>" }
- { "type": "switchView", "view": "front" | "back" }
- { "type": "addText", "text": "<string>", "area"?: <print area>, "view"?: "front"|"back", "x"?, "y"?, "fontSize"?, "color"?, "fontWeight"?, "letterSpacing"?, "textAlign"?: "left"|"center"|"right" }
- { "type": "recolorElement", "target": <selector>, "color": "<color>" }
- { "type": "moveElement", "target": <selector>, "x"?, "y"?, "dx"?, "dy"? }
- { "type": "resizeElement", "target": <selector>, "width"?, "height"?, "scale"? }
- { "type": "deleteElement", "target": <selector> }
- { "type": "applyLayout", "layout": "minimal" | "bold-center" | "left-chest" | "back-graphic" }
- { "type": "addPlaceholderGraphic", "label"?, "area"?, "view"?, "x"?, "y"?, "size"?, "shape"?: "square"|"circle" }
- { "type": "generateGraphic", "prompt": "<what artwork to generate>", "area"?, "view"?, "x"?, "y"?, "size"? }

Print areas — named placement targets on the garment. addText, addPlaceholderGraphic
and generateGraphic accept "area", which also implies the view:
- "front-center": large chest print, centered on the front
- "left-chest": small logo, upper-left of the chest
- "front-neck": tiny text just under the front collar
- "back-center": large back print, centered on the back
- "back-neck": small text just under the back collar
PREFER "area" whenever the request names a placement (chest logo, back print, under
the collar, ...). Use raw x/y only for fine adjustments the areas can't express.

Use "generateGraphic" ONLY when the user explicitly asks to generate/create new
artwork, a logo, a graphic, or an illustration. For moving/resizing/recoloring
existing elements use the cheap actions instead — never regenerate.

<selector> is an element id, or one of: "selected", "last", "lastText", "lastImage", "logo".

Canvas is 600 wide x 700 tall. (0,0) is top-left.
Use color NAMES when the user names a color. Keep actions minimal and only what was asked.

You receive the recent conversation (including the tool calls you previously made) plus the
CURRENT design snapshot. When the user gives a follow-up like "make it bigger" or "move it
higher", resolve "it" from your last tool calls and the design snapshot instead of asking
them to clarify.
If the request is unrelated to design, return an empty actions array and a helpful reply.`;
}

/** A compact textual summary of the current design for the model's context. */
export function describeDesign(design: DesignState): string {
  const els = design.elements
    .map((el) => {
      const area = containingPrintArea(el, design.garment);
      const areaTag = area ? `, area:${area}` : "";
      const body =
        el.type === "text"
          ? `{id:${el.id}, text:"${el.text}", view:${el.view}${areaTag}, x:${Math.round(el.x)}, y:${Math.round(el.y)}, color:${el.color}}`
          : `{id:${el.id}, image:"${el.name}", view:${el.view}${areaTag}, x:${Math.round(el.x)}, y:${Math.round(el.y)}}`;
      return body;
    })
    .join(", ");
  return `Current design: garment=${design.garment}, view=${design.view}, garmentColor=${design.garmentColor}, elements=[${els}]`;
}

/** The print area an element currently sits in, if any. */
function containingPrintArea(
  el: {
    view: DesignState["view"];
    x: number;
    y: number;
    width: number;
    height: number;
  },
  garment: DesignState["garment"],
): string | null {
  return findContainingPrintArea(el, garment, el.view)?.id ?? null;
}
