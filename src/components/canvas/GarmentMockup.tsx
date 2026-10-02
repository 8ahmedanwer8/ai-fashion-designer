import type { GarmentType, GarmentView } from "@/lib/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/store/designStore";
import { getGarmentGeometry, seamColor, isDarkColor } from "@/lib/export/garmentSvg";

interface GarmentMockupProps {
  garment: GarmentType;
  view: GarmentView;
  color: string;
}

/**
 * Colorable garment outline rendered as SVG. Geometry comes from the shared
 * `garmentSvg` module so the exported PNG matches this exactly.
 */
export function GarmentMockup({ garment, view, color }: GarmentMockupProps) {
  const geo = getGarmentGeometry(garment, view);
  const seam = seamColor(color);
  const shadow = isDarkColor(color) ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.12)";

  return (
    <svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-label={`${garment} ${view} view`}
    >
      <defs>
        <filter id="garment-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="24"
            stdDeviation="40"
            floodColor={shadow}
            floodOpacity="0.9"
          />
        </filter>
        <linearGradient id="garment-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.07} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.08} />
        </linearGradient>
      </defs>

      <g filter="url(#garment-shadow)">
        {/* Extra fills behind/around the body (e.g. hood) */}
        {geo.fills?.map((d, i) => (
          <path key={`fill-${i}`} d={d} fill={color} stroke={seam} strokeWidth={2} />
        ))}

        {/* Body */}
        <path d={geo.body} fill={color} stroke={seam} strokeWidth={2} />
        <path d={geo.body} fill="url(#garment-sheen)" />

        {/* Waistband for hoodie (cosmetic rect) */}
        {garment === "hoodie" && (
          <rect
            x={165}
            y={586}
            width={270}
            height={26}
            rx={6}
            fill={color}
            stroke={seam}
            strokeWidth={2}
          />
        )}

        {/* Detail strokes (seams, pocket, drawstrings, collar) */}
        {geo.details.map((det, i) => (
          <path
            key={`det-${i}`}
            d={det.d}
            fill="none"
            stroke={seam}
            strokeWidth={det.closed ? 2 : 3}
          />
        ))}
      </g>
    </svg>
  );
}
