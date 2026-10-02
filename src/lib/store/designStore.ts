import { create } from "zustand";

import type {
  DesignElement,
  DesignState,
  GarmentType,
  GarmentView,
  ImageElement,
  TextElement,
} from "@/lib/types";

/**
 * Centerpoint helpers — the canvas is a fixed logical coordinate space.
 * Elements are positioned in these px units regardless of zoom/render size.
 */
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 700;

let idCounter = 1;
function nextId(prefix: string) {
  return `${prefix}_${idCounter++}`;
}

interface DesignStore {
  /** The structured design document (the JSON that gets saved/exported). */
  design: DesignState;
  /** Currently selected element id (for the canvas + layers panel). */
  selectedElementId: string | null;

  // --- Garment-level actions ---
  setGarment: (garment: GarmentType) => void;
  setView: (view: GarmentView) => void;
  setGarmentColor: (color: string) => void;

  // --- Selection ---
  selectElement: (id: string | null) => void;

  // --- Element creation ---
  addText: (partial?: Partial<TextElement>) => string;
  addImage: (src: string, name?: string, partial?: Partial<ImageElement>) => string;

  // --- Element mutation (these mirror the future AI tools) ---
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  moveElement: (id: string, x: number, y: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  deleteElement: (id: string) => void;

  /** Replace the whole document (used by import / AI applyLayout later). */
  loadDesign: (design: DesignState) => void;
}

const initialDesign: DesignState = {
  garment: "hoodie",
  view: "front",
  garmentColor: "#111111",
  elements: [
    {
      id: "element_seed_1",
      type: "text",
      view: "front",
      text: "CYBER XI",
      x: 210,
      y: 300,
      width: 180,
      height: 50,
      zIndex: 1,
      fontSize: 34,
      color: "#ffffff",
      fontWeight: 800,
      letterSpacing: 0.08,
      textAlign: "center",
    },
  ],
};

/** Highest zIndex currently in use, so new elements land on top. */
function topZIndex(elements: DesignElement[]): number {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  design: initialDesign,
  selectedElementId: null,

  setGarment: (garment) =>
    set((s) => ({ design: { ...s.design, garment } })),

  setView: (view) =>
    set((s) => ({ design: { ...s.design, view }, selectedElementId: null })),

  setGarmentColor: (garmentColor) =>
    set((s) => ({ design: { ...s.design, garmentColor } })),

  selectElement: (id) => set({ selectedElementId: id }),

  addText: (partial) => {
    const id = nextId("element");
    const { design } = get();
    const newEl: TextElement = {
      id,
      type: "text",
      view: design.view,
      text: "NEW TEXT",
      x: CANVAS_WIDTH / 2 - 90,
      y: CANVAS_HEIGHT / 2 - 25,
      width: 180,
      height: 50,
      zIndex: topZIndex(design.elements) + 1,
      fontSize: 32,
      color: "#ffffff",
      fontWeight: 700,
      letterSpacing: 0.02,
      textAlign: "center",
      ...partial,
    };
    set((s) => ({
      design: { ...s.design, elements: [...s.design.elements, newEl] },
      selectedElementId: id,
    }));
    return id;
  },

  addImage: (src, name = "Uploaded image", partial) => {
    const id = nextId("element");
    const { design } = get();
    const newEl: ImageElement = {
      id,
      type: "image",
      view: design.view,
      src,
      name,
      x: CANVAS_WIDTH / 2 - 100,
      y: CANVAS_HEIGHT / 2 - 100,
      width: 200,
      height: 200,
      zIndex: topZIndex(design.elements) + 1,
      ...partial,
    };
    set((s) => ({
      design: { ...s.design, elements: [...s.design.elements, newEl] },
      selectedElementId: id,
    }));
    return id;
  },

  updateElement: (id, patch) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: s.design.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as DesignElement) : el,
        ),
      },
    })),

  moveElement: (id, x, y) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: s.design.elements.map((el) =>
          el.id === id ? { ...el, x, y } : el,
        ),
      },
    })),

  resizeElement: (id, width, height) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: s.design.elements.map((el) =>
          el.id === id ? { ...el, width, height } : el,
        ),
      },
    })),

  deleteElement: (id) =>
    set((s) => ({
      design: {
        ...s.design,
        elements: s.design.elements.filter((el) => el.id !== id),
      },
      selectedElementId:
        s.selectedElementId === id ? null : s.selectedElementId,
    })),

  loadDesign: (design) => set({ design, selectedElementId: null }),
}));
