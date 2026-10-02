import type { DesignState } from "@/lib/types";
import type { AgentProvider } from "./types";
import type { AgentResponse, DesignAction } from "../actions";
import {
  detectGenerationView,
  isGenerationRequest,
} from "../image/imagePrompt";

/**
 * Mock AI provider — no API key required.
 *
 * Uses lightweight keyword/intent matching to turn natural language into the
 * same structured DesignActions a real LLM would emit. It is intentionally
 * simple but covers the Phase-3 example prompts end-to-end so the whole feature
 * is demoable offline.
 */
export class MockProvider implements AgentProvider {
  readonly id = "mock";

  async generateActions(
    userMessage: string,
    design: DesignState,
  ): Promise<AgentResponse> {
    // Tiny delay so the UI's "thinking" state is visible.
    await delay(350);

    const msg = userMessage.toLowerCase();
    const actions: DesignAction[] = [];

    // --- Image generation (explicit "generate artwork" intent) ---
    // This is the ONLY branch that triggers async image generation. When it
    // fires we skip the cheap placeholder-logo/back-graphic branches so the
    // generated image isn't doubled up with a placeholder.
    const wantsGeneration = isGenerationRequest(userMessage);
    if (wantsGeneration) {
      const genView = detectGenerationView(userMessage);
      if (genView && genView !== design.view) {
        actions.push({ type: "switchView", view: genView });
      }
      actions.push({
        type: "generateGraphic",
        prompt: userMessage,
        ...(genView ? { view: genView } : {}),
        size: genView === "back" ? 300 : 240,
      });
      return {
        reply: `Generating artwork for the ${genView ?? design.view}…`,
        actions,
      };
    }

    // --- Garment type ---
    if (/\bhoodie\b/.test(msg) && design.garment !== "hoodie") {
      actions.push({ type: "setGarmentType", garment: "hoodie" });
    } else if (/\b(t-?shirt|tee)\b/.test(msg) && design.garment !== "tshirt") {
      actions.push({ type: "setGarmentType", garment: "tshirt" });
    }

    // --- Garment color ("make it black", "change hoodie to cream") ---
    const garmentColor = detectGarmentColor(msg);
    if (garmentColor) {
      actions.push({ type: "setGarmentColor", color: garmentColor });
    }

    // --- View switches ---
    if (/\bback\b/.test(msg) && !/background/.test(msg)) {
      actions.push({ type: "switchView", view: "back" });
    } else if (/\bfront\b/.test(msg)) {
      actions.push({ type: "switchView", view: "front" });
    }

    // --- Add text ("add bold text on the back: HELLO") ---
    const addTextIntent = detectAddText(msg, userMessage);
    if (addTextIntent) {
      actions.push(addTextIntent);
    }

    // --- Logo / left chest ---
    if (/\b(left chest|chest logo|small logo)\b/.test(msg)) {
      actions.push({
        type: "addPlaceholderGraphic",
        label: "LOGO",
        view: "front",
        x: 150,
        y: 250,
        size: 70,
      });
    } else if (/\blogo\b/.test(msg) && /\badd\b/.test(msg)) {
      actions.push({
        type: "addPlaceholderGraphic",
        label: "LOGO",
        size: 120,
      });
    }

    // --- Back graphic ---
    if (/\b(back graphic|back print|graphic on the back)\b/.test(msg)) {
      actions.push({ type: "applyLayout", layout: "back-graphic" });
    }

    // --- Minimal / premium styling ---
    if (/\bminimal\b/.test(msg)) {
      actions.push({ type: "applyLayout", layout: "minimal" });
    } else if (/\b(premium|clean|elevated|luxury)\b/.test(msg)) {
      // Premium = dark garment + centered refined text.
      if (!garmentColor) actions.push({ type: "setGarmentColor", color: "#111111" });
      actions.push({ type: "applyLayout", layout: "bold-center" });
    }

    // --- Move logo/text higher/lower/left/right ---
    const moveIntent = detectMove(msg);
    if (moveIntent) actions.push(moveIntent);

    // --- Bigger / smaller ---
    const resizeIntent = detectResize(msg);
    if (resizeIntent) actions.push(resizeIntent);

    // --- Delete ---
    if (/\b(delete|remove)\b/.test(msg)) {
      const target = /logo|graphic|image/.test(msg) ? "logo" : "last";
      actions.push({ type: "deleteElement", target });
    }

    // --- Recolor existing text ("make the text black") ---
    const textColor = detectTextColor(msg);
    if (textColor) {
      actions.push({ type: "recolorElement", target: "lastText", color: textColor });
    }

    const reply = actions.length
      ? buildReply(actions)
      : "I couldn't map that to a design change yet. Try things like \"make it a black hoodie\", \"add a small left chest logo\", or \"move the logo higher\".";

    return { reply, actions };
  }
}

// --- intent detectors ---

const COLOR_WORDS = [
  "black",
  "white",
  "cream",
  "ivory",
  "grey",
  "gray",
  "charcoal",
  "navy",
  "blue",
  "red",
  "maroon",
  "green",
  "olive",
  "forest",
  "brown",
  "tan",
  "beige",
  "orange",
  "yellow",
  "pink",
  "purple",
  "sand",
  "stone",
];

function detectGarmentColor(msg: string): string | null {
  for (const c of COLOR_WORDS) {
    if (!new RegExp(`\\b${c}\\b`).test(msg)) continue;
    // Skip if this color clearly refers to text, not the garment.
    if (textContext(msg, c)) continue;

    // Match when the color sits near a garment word or a change/make phrase.
    const patterns = [
      new RegExp(`\\b${c}\\b[\\w\\s]*\\b(hoodie|t-?shirt|tee|garment)\\b`),
      new RegExp(`\\b(hoodie|t-?shirt|tee|garment)\\b[\\w\\s]*\\b${c}\\b`),
      new RegExp(`\\b(change|make|set|turn)\\b[\\w\\s]*\\bto\\b[\\w\\s]*\\b${c}\\b`),
      new RegExp(`\\bmake\\s+it\\b[\\w\\s]*\\b${c}\\b`),
    ];
    if (patterns.some((re) => re.test(msg))) return c;
  }
  return null;
}

function detectTextColor(msg: string): string | null {
  for (const c of COLOR_WORDS) {
    const re = new RegExp(
      `\\btext\\b(?:\\s+\\w+){0,2}\\s+\\b${c}\\b|\\b${c}\\b(?:\\s+\\w+){0,2}\\s+\\btext\\b`,
    );
    if (re.test(msg)) return c;
  }
  return null;
}

/**
 * True if the color mention is clearly about text, not the garment. Uses a
 * tight window (a few words) so "cream ... make the text black" doesn't get
 * mis-attributed to the text just because both words share a sentence.
 */
function textContext(msg: string, color: string): boolean {
  const re = new RegExp(
    `\\btext\\b(?:\\s+\\w+){0,2}\\s+\\b${color}\\b|\\b${color}\\b(?:\\s+\\w+){0,2}\\s+\\btext\\b`,
  );
  return re.test(msg);
}

function detectAddText(msg: string, original: string): DesignAction | null {
  if (!/\badd\b.*\btext\b|\btext\b.*\bsay|\bwrite\b|\bput\b.*\btext\b/.test(msg)) {
    // Also handle "add text on the back" without explicit content.
    if (!/\badd\b.*\btext\b/.test(msg)) return null;
  }
  // Try to extract quoted or trailing content.
  const quoted = original.match(/["'“”']([^"'“”']+)["'“”']/);
  const sayMatch = original.match(/(?:say|saying|that says|reads?)\s+(.+)$/i);
  const text = (quoted?.[1] || sayMatch?.[1] || "NEW TEXT")
    .trim()
    .replace(/[.!?,;:]+$/, "") // strip trailing punctuation
    .trim();

  const view: "front" | "back" = /\bback\b/.test(msg) ? "back" : "front";
  const bold = /\bbold\b/.test(msg);

  return {
    type: "addText",
    text,
    view,
    fontWeight: bold ? 800 : 600,
    fontSize: bold ? 48 : 32,
    textAlign: "center",
  };
}

function detectMove(msg: string): DesignAction | null {
  if (!/\bmove\b|\bnudge\b|\bshift\b|\bhigher\b|\blower\b/.test(msg)) return null;
  const target = /logo|graphic|image/.test(msg) ? "logo" : "lastText";
  const step = 60;
  let dx = 0;
  let dy = 0;
  if (/\bhigher\b|\bup\b/.test(msg)) dy -= step;
  if (/\blower\b|\bdown\b/.test(msg)) dy += step;
  if (/\bleft\b/.test(msg)) dx -= step;
  if (/\bright\b/.test(msg)) dx += step;
  if (dx === 0 && dy === 0) dy = -step; // default "move" = up a bit
  return { type: "moveElement", target, dx, dy };
}

function detectResize(msg: string): DesignAction | null {
  const target = /logo|graphic|image/.test(msg) ? "logo" : "lastText";
  if (/\bbigger|larger|increase|grow\b/.test(msg))
    return { type: "resizeElement", target, scale: 1.4 };
  if (/\bsmaller|tinier|reduce|shrink\b/.test(msg))
    return { type: "resizeElement", target, scale: 0.7 };
  return null;
}

function buildReply(actions: DesignAction[]): string {
  const verbs = actions.map((a) => describeAction(a));
  return `Done — ${joinHuman(verbs)}.`;
}

function describeAction(a: DesignAction): string {
  switch (a.type) {
    case "setGarmentType":
      return `switched to a ${a.garment}`;
    case "setGarmentColor":
      return `recolored the garment ${a.color}`;
    case "switchView":
      return `showing the ${a.view}`;
    case "addText":
      return `added text "${a.text}"`;
    case "recolorElement":
      return `recolored the ${a.target} ${a.color}`;
    case "moveElement":
      return `repositioned the ${a.target}`;
    case "resizeElement":
      return `resized the ${a.target}`;
    case "deleteElement":
      return `removed the ${a.target}`;
    case "applyLayout":
      return `applied a ${a.layout} layout`;
    case "addPlaceholderGraphic":
      return `placed a ${a.label ?? "graphic"} placeholder`;
    case "generateGraphic":
      return `generated artwork`;
    default:
      return "updated the design";
  }
}

function joinHuman(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
