import type { DesignState, GarmentView } from "@/lib/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/store/designStore";
import { designToSvg } from "./designToSvg";
import { downloadBlob, makeFilename } from "./download";

/** Rasterize an SVG string to a PNG Blob at the given scale. */
export async function svgToPngBlob(
  svg: string,
  scale = 2,
  background: string | null = "#0f0f0f",
): Promise<Blob> {
  const img = new Image();
  // SVG with embedded data-URL images is same-origin friendly.
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to render SVG to image"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Export the current (or specified) view of the design as a downloaded PNG. */
export async function exportDesignPng(
  design: DesignState,
  view?: GarmentView,
): Promise<void> {
  const targetView = view ?? design.view;
  const svg = designToSvg(design, { view: targetView, background: null });
  const blob = await svgToPngBlob(svg, 2, "#0f0f0f");
  downloadBlob(
    blob,
    makeFilename(["threadcraft", design.garment, targetView], "png"),
  );
}
