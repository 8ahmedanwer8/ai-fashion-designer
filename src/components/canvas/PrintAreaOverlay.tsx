"use client";

import type { GarmentType, GarmentView } from "@/lib/types";
import { getPrintAreas } from "@/lib/agent/printAreas";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/store/designStore";

interface PrintAreaOverlayProps {
  garment: GarmentType;
  view: GarmentView;
}

/**
 * Dashed outlines of the named print areas for the current garment + view.
 * Purely informational (pointer-events-none) — elements are never clipped,
 * the overlay just shows where printing is possible.
 */
export function PrintAreaOverlay({ garment, view }: PrintAreaOverlayProps) {
  const areas = getPrintAreas(garment, view);

  return (
    <svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-label="Print areas"
    >
      {areas.map((area) => (
        <g key={area.id}>
          <rect
            x={area.rect.x}
            y={area.rect.y}
            width={area.rect.width}
            height={area.rect.height}
            fill="none"
            stroke="rgba(251, 191, 36, 0.55)"
            strokeWidth={1.5}
            strokeDasharray="6 5"
            rx={2}
          />
          <text
            x={area.rect.x + 4}
            y={area.rect.y - 5}
            fill="rgba(251, 191, 36, 0.8)"
            fontSize={9}
            fontFamily="ui-monospace, monospace"
            letterSpacing={1.5}
          >
            {area.id.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
