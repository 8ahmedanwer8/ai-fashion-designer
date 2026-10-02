/**
 * ThreadCraft AI — core domain types.
 *
 * The entire design is represented as a single structured JSON object
 * (see `DesignState`). This is the single source of truth that:
 *   - the canvas renders from
 *   - the left panel + layers panel edit
 *   - (in a later phase) the AI agent mutates via tool calls
 *     such as addText / moveElement / resizeElement / setGarmentColor.
 */

export type GarmentType = "tshirt" | "hoodie";

export type GarmentView = "front" | "back";

export type ElementType = "text" | "image";

/** Properties shared by every element placed on the garment. */
interface BaseElement {
  id: string;
  type: ElementType;
  /** Which side of the garment this element lives on. */
  view: GarmentView;
  /** Position of the element's top-left corner, in canvas px. */
  x: number;
  y: number;
  /** Bounding-box size in canvas px. */
  width: number;
  height: number;
  /** Stacking order — higher renders on top. */
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  fontWeight: number;
  /** Letter spacing in em, used for the streetwear "tracked-out" look. */
  letterSpacing: number;
  textAlign: "left" | "center" | "right";
}

export interface ImageElement extends BaseElement {
  type: "image";
  /** Data URL (Phase 1: uploaded images are stored inline as base64). */
  src: string;
  /** Human-friendly label shown in the layers panel. */
  name: string;
}

export type DesignElement = TextElement | ImageElement;

/** The full design document. This is the JSON that gets saved/exported. */
export interface DesignState {
  garment: GarmentType;
  view: GarmentView;
  garmentColor: string;
  elements: DesignElement[];
}
