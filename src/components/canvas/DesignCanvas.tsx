"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  useDesignStore,
} from "@/lib/store/designStore";
import { GarmentMockup } from "./GarmentMockup";
import { CanvasElement } from "./CanvasElement";
import { PrintAreaOverlay } from "./PrintAreaOverlay";
import { cn, isTypingTarget } from "@/lib/utils";

/**
 * The center stage. Renders the garment for the active view plus every element
 * belonging to that view. Handles canvas-level concerns:
 *   - responsive scaling (logical 600x700 space -> available screen space)
 *   - click-empty-space to deselect
 *   - Delete/Backspace to remove the selected element
 *   - toggleable print-area overlay (named placement regions)
 */
export function DesignCanvas() {
  const design = useDesignStore((s) => s.design);
  const selectedElementId = useDesignStore((s) => s.selectedElementId);
  const selectElement = useDesignStore((s) => s.selectElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);
  const [showPrintAreas, setShowPrintAreas] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the fixed 600x700 canvas into the available area.
  const recomputeScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const padding = 96; // breathing room around the garment
    const availW = wrapper.clientWidth - padding;
    const availH = wrapper.clientHeight - padding;
    const next = Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT, 1.15);
    setScale(next > 0 ? next : 0.5);
  }, []);

  useEffect(() => {
    recomputeScale();
    window.addEventListener("resize", recomputeScale);
    return () => window.removeEventListener("resize", recomputeScale);
  }, [recomputeScale]);

  // Global shortcuts: delete the selection, undo/redo the design history.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const temporal = useDesignStore.temporal.getState();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        temporal.undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        temporal.redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedElementId, deleteElement]);

  const visibleElements = design.elements.filter(
    (el) => el.view === design.view,
  );

  return (
    <div
      ref={wrapperRef}
      onPointerDown={() => selectElement(null)}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      {/* Studio backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(0_0%_14%),hsl(0_0%_7%)_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Technical overlay labels (cosmetic, from the design reference) */}
      <div className="pointer-events-none absolute left-6 top-6 flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="opacity-50">System // Studio_Render_Engine</span>
        <span>
          Active_Model: Garment_{design.garment}_{design.view}
        </span>
        <span>Elements: {visibleElements.length}</span>
      </div>

      {/* Print-area overlay toggle */}
      <button
        onClick={() => setShowPrintAreas((v) => !v)}
        className={cn(
          "absolute right-6 top-6 rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
          showPrintAreas
            ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={showPrintAreas}
      >
        Print Areas
      </button>

      {/* The scaled canvas */}
      <div
        className="relative shrink-0"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Glow behind garment */}
        <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-white/5 blur-3xl" />

        <GarmentMockup
          garment={design.garment}
          view={design.view}
          color={design.garmentColor}
        />

        {showPrintAreas && (
          <PrintAreaOverlay garment={design.garment} view={design.view} />
        )}

        {visibleElements.map((el) => (
          <CanvasElement key={el.id} element={el} scale={scale} />
        ))}
      </div>

      {/* Coordinate readout (cosmetic) */}
      <div className="pointer-events-none absolute bottom-6 right-6 flex gap-6 font-mono text-[10px] text-muted-foreground opacity-50">
        <span>ZOOM: {(scale * 100).toFixed(0)}%</span>
        <span>W: {CANVAS_WIDTH}</span>
        <span>H: {CANVAS_HEIGHT}</span>
      </div>
    </div>
  );
}
