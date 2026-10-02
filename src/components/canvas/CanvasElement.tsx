"use client";

import { useRef } from "react";

import type { DesignElement } from "@/lib/types";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  useDesignStore,
} from "@/lib/store/designStore";

interface CanvasElementProps {
  element: DesignElement;
  /** Render scale of the canvas, so pointer deltas map to logical px. */
  scale: number;
}

const MIN_SIZE = 24;

/**
 * Renders one design element and makes it interactive:
 *   - click to select
 *   - drag the body to move
 *   - drag the corner handle to resize
 *   - delete via the floating button or Backspace/Delete (handled in canvas)
 *
 * All mutations go through the Zustand store actions (moveElement /
 * resizeElement), which are the same actions the AI agent will use later.
 */
export function CanvasElement({ element, scale }: CanvasElementProps) {
  const selectedElementId = useDesignStore((s) => s.selectedElementId);
  const selectElement = useDesignStore((s) => s.selectElement);
  const moveElement = useDesignStore((s) => s.moveElement);
  const resizeElement = useDesignStore((s) => s.resizeElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);
  const updateElement = useDesignStore((s) => s.updateElement);

  const isSelected = selectedElementId === element.id;
  const dragState = useRef<null | {
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>(null);

  function onPointerDownBody(e: React.PointerEvent) {
    e.stopPropagation();
    selectElement(element.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragState.current = {
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y,
      origW: element.width,
      origH: element.height,
    };
  }

  function onPointerDownResize(e: React.PointerEvent) {
    e.stopPropagation();
    selectElement(element.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragState.current = {
      mode: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y,
      origW: element.width,
      origH: element.height,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragState.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;

    if (d.mode === "move") {
      const x = clamp(d.origX + dx, 0, CANVAS_WIDTH - element.width);
      const y = clamp(d.origY + dy, 0, CANVAS_HEIGHT - element.height);
      moveElement(element.id, x, y);
    } else {
      const width = clamp(d.origW + dx, MIN_SIZE, CANVAS_WIDTH - d.origX);
      const height = clamp(d.origH + dy, MIN_SIZE, CANVAS_HEIGHT - d.origY);
      resizeElement(element.id, width, height);
      // Keep text readable: scale font with the box height for text elements.
      if (element.type === "text") {
        const ratio = height / d.origH;
        updateElement(element.id, {
          fontSize: Math.max(8, Math.round(element.fontSize * ratio)),
        });
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragState.current = null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDownBody}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
      }}
      className={[
        "absolute flex items-center justify-center touch-none",
        "cursor-grab active:cursor-grabbing",
        isSelected
          ? "outline outline-2 outline-offset-2 outline-sky-400"
          : "outline outline-1 outline-transparent hover:outline-white/30",
      ].join(" ")}
    >
      {element.type === "text" ? (
        <span
          style={{
            fontSize: element.fontSize,
            color: element.color,
            fontWeight: element.fontWeight,
            letterSpacing: `${element.letterSpacing}em`,
            textAlign: element.textAlign,
            lineHeight: 1.05,
          }}
          className="pointer-events-none w-full select-none break-words uppercase"
        >
          {element.text}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={element.src}
          alt={element.name}
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-contain"
        />
      )}

      {isSelected && (
        <>
          {/* Resize handle (bottom-right) */}
          <span
            onPointerDown={onPointerDownResize}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-sm border border-sky-400 bg-background"
          />
          {/* Delete button (top-right) */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              deleteElement(element.id);
            }}
            className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-white shadow"
            aria-label="Delete element"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
