import type {
  DesignElement,
  DesignState,
  GarmentType,
  GarmentView,
} from "@/lib/types";
import type { DesignFile } from "./exportJson";

/**
 * Parse + validate an imported project file. Accepts either the versioned
 * `DesignFile` wrapper or a bare `DesignState` object (lenient on purpose).
 * Throws a descriptive error if the shape is invalid.
 */
export function parseDesignFile(raw: string): DesignState {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  const design = unwrapDesign(data);
  return validateDesign(design);
}

function unwrapDesign(data: unknown): unknown {
  if (data && typeof data === "object" && "design" in data) {
    return (data as DesignFile).design;
  }
  return data;
}

function validateDesign(value: unknown): DesignState {
  if (!value || typeof value !== "object") {
    throw new Error("Design data is missing or malformed.");
  }
  const d = value as Record<string, unknown>;

  const garment = d.garment;
  if (garment !== "tshirt" && garment !== "hoodie") {
    throw new Error(`Invalid garment type: ${String(garment)}`);
  }

  const view = d.view;
  if (view !== "front" && view !== "back") {
    throw new Error(`Invalid view: ${String(view)}`);
  }

  if (typeof d.garmentColor !== "string") {
    throw new Error("Missing garmentColor.");
  }

  if (!Array.isArray(d.elements)) {
    throw new Error("elements must be an array.");
  }

  const elements = d.elements.map((el, i) => validateElement(el, i));

  return {
    garment: garment as GarmentType,
    view: view as GarmentView,
    garmentColor: d.garmentColor,
    elements,
  };
}

function validateElement(value: unknown, index: number): DesignElement {
  if (!value || typeof value !== "object") {
    throw new Error(`Element #${index} is malformed.`);
  }
  const el = value as Record<string, unknown>;

  const num = (k: string, fallback: number): number =>
    typeof el[k] === "number" ? (el[k] as number) : fallback;
  const str = (k: string, fallback: string): string =>
    typeof el[k] === "string" ? (el[k] as string) : fallback;

  const view = el.view === "back" ? "back" : "front";
  const base = {
    id: str("id", `imported_${index}_${Date.now()}`),
    view: view as GarmentView,
    x: num("x", 0),
    y: num("y", 0),
    width: num("width", 100),
    height: num("height", 100),
    zIndex: num("zIndex", index + 1),
  };

  if (el.type === "image") {
    if (typeof el.src !== "string") {
      throw new Error(`Image element #${index} missing src.`);
    }
    return {
      ...base,
      type: "image",
      src: el.src,
      name: str("name", "Imported image"),
    };
  }

  // default to text
  return {
    ...base,
    type: "text",
    text: str("text", "TEXT"),
    fontSize: num("fontSize", 32),
    color: str("color", "#ffffff"),
    fontWeight: num("fontWeight", 700),
    letterSpacing: num("letterSpacing", 0.02),
    textAlign:
      el.textAlign === "left" || el.textAlign === "right"
        ? (el.textAlign as "left" | "right")
        : "center",
  };
}

/** Read a File (from an <input type=file>) and parse it into a DesignState. */
export function readDesignFile(file: File): Promise<DesignState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseDesignFile(reader.result as string));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}
