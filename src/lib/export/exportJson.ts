import type { DesignState } from "@/lib/types";
import { downloadBlob, makeFilename } from "./download";

/** Versioned wrapper so future format changes can be migrated. */
export interface DesignFile {
  app: "threadcraft-ai";
  version: 1;
  exportedAt: string;
  design: DesignState;
}

export function serializeDesign(design: DesignState): string {
  const file: DesignFile = {
    app: "threadcraft-ai",
    version: 1,
    exportedAt: new Date().toISOString(),
    design,
  };
  return JSON.stringify(file, null, 2);
}

/** Export the design as a downloadable .json project file. */
export function exportDesignJson(design: DesignState): void {
  const blob = new Blob([serializeDesign(design)], {
    type: "application/json",
  });
  downloadBlob(blob, makeFilename(["threadcraft", design.garment], "json"));
}
