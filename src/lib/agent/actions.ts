import type { GarmentType, GarmentView } from "@/lib/types";

/**
 * The structured "tool calls" the AI assistant emits. The AI never mutates the
 * canvas directly — it returns an array of these `DesignAction`s, which are
 * validated (validateActions.ts) and then applied through ONE handler
 * (applyActions.ts). This is the only contract between the model and the store.
 */

export type DesignActionType =
  | "setGarmentType"
  | "setGarmentColor"
  | "switchView"
  | "addText"
  | "recolorElement"
  | "moveElement"
  | "resizeElement"
  | "deleteElement"
  | "applyLayout"
  | "addPlaceholderGraphic"
  | "generateGraphic";

/**
 * How an action targets an existing element. The model can use a concrete id,
 * or a semantic selector so prompts like "move the logo higher" work without
 * the model knowing exact ids.
 */
export type ElementSelector =
  | string // a concrete element id
  | "selected"
  | "last"
  | "lastText"
  | "lastImage"
  | "logo";

export type LayoutPreset =
  | "minimal"
  | "bold-center"
  | "left-chest"
  | "back-graphic";

export interface SetGarmentTypeAction {
  type: "setGarmentType";
  garment: GarmentType;
}

export interface SetGarmentColorAction {
  type: "setGarmentColor";
  color: string;
}

export interface SwitchViewAction {
  type: "switchView";
  view: GarmentView;
}

export interface AddTextAction {
  type: "addText";
  text: string;
  view?: GarmentView;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
}

export interface RecolorElementAction {
  type: "recolorElement";
  target: ElementSelector;
  /** New text color (only applies to text elements). */
  color: string;
}

export interface MoveElementAction {
  type: "moveElement";
  target: ElementSelector;
  /** Absolute coordinates (top-left), in canvas px. */
  x?: number;
  y?: number;
  /** Relative nudges, in canvas px. Applied if x/y are omitted. */
  dx?: number;
  dy?: number;
}

export interface ResizeElementAction {
  type: "resizeElement";
  target: ElementSelector;
  width?: number;
  height?: number;
  /** Multiply current size (e.g. 0.5 = half, 2 = double). */
  scale?: number;
}

export interface DeleteElementAction {
  type: "deleteElement";
  target: ElementSelector;
}

export interface ApplyLayoutAction {
  type: "applyLayout";
  layout: LayoutPreset;
}

export interface AddPlaceholderGraphicAction {
  type: "addPlaceholderGraphic";
  /** Label drawn inside the placeholder (e.g. "LOGO", "GRAPHIC"). */
  label?: string;
  view?: GarmentView;
  x?: number;
  y?: number;
  size?: number;
  shape?: "square" | "circle";
}

/**
 * Generate NEW artwork via the image model and place it on the garment.
 *
 * This is the ONLY action that triggers (async, expensive) image generation.
 * It is deliberately not applied through the synchronous applyActions handler —
 * the runtime processes it separately so normal canvas edits stay cheap.
 */
export interface GenerateGraphicAction {
  type: "generateGraphic";
  /** The user's description of the artwork to generate. */
  prompt: string;
  view?: GarmentView;
  x?: number;
  y?: number;
  size?: number;
}

export type DesignAction =
  | SetGarmentTypeAction
  | SetGarmentColorAction
  | SwitchViewAction
  | AddTextAction
  | RecolorElementAction
  | MoveElementAction
  | ResizeElementAction
  | DeleteElementAction
  | ApplyLayoutAction
  | AddPlaceholderGraphicAction
  | GenerateGraphicAction;

/** What a provider returns for one user turn. */
export interface AgentResponse {
  /** Natural-language reply shown in the chat. */
  reply: string;
  /** Structured actions to apply to the design. */
  actions: DesignAction[];
}

/** The full list of action type names (for prompts / docs / validation). */
export const ACTION_TYPES: DesignActionType[] = [
  "setGarmentType",
  "setGarmentColor",
  "switchView",
  "addText",
  "recolorElement",
  "moveElement",
  "resizeElement",
  "deleteElement",
  "applyLayout",
  "addPlaceholderGraphic",
  "generateGraphic",
];
