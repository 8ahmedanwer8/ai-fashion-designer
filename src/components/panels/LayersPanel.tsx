"use client";

import { useDesignStore } from "@/lib/store/designStore";
import { cn } from "@/lib/utils";

/**
 * Lists the elements on the *current view*, mirroring the canvas. Selecting a
 * row selects it on the canvas (and vice-versa). Provides quick delete.
 */
export function LayersPanel() {
  const elements = useDesignStore((s) => s.design.elements);
  const view = useDesignStore((s) => s.design.view);
  const selectedElementId = useDesignStore((s) => s.selectedElementId);
  const selectElement = useDesignStore((s) => s.selectElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);

  // Show topmost layers first.
  const viewElements = elements
    .filter((el) => el.view === view)
    .sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Layers
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {viewElements.length}
        </span>
      </div>

      {viewElements.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No elements on this view yet. Add text or upload an image.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {viewElements.map((el) => {
            const isSelected = selectedElementId === el.id;
            const label =
              el.type === "text"
                ? el.text || "Text"
                : el.name || "Image";
            return (
              <li key={el.id}>
                <div
                  onClick={() => selectElement(el.id)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-sky-400/50 bg-secondary"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase",
                      "bg-background text-muted-foreground",
                    )}
                  >
                    {el.type === "text" ? "T" : "IMG"}
                  </span>
                  <span className="flex-1 truncate text-foreground">
                    {label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(el.id);
                    }}
                    className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete layer"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
