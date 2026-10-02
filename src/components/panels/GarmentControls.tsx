"use client";

import type { GarmentType, GarmentView } from "@/lib/types";
import { useDesignStore } from "@/lib/store/designStore";
import { cn } from "@/lib/utils";

const GARMENTS: { value: GarmentType; label: string }[] = [
  { value: "tshirt", label: "T-Shirt" },
  { value: "hoodie", label: "Hoodie" },
];

const VIEWS: { value: GarmentView; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
];

/** Common garment-color swatches plus a freeform picker. */
const SWATCHES = [
  "#111111",
  "#ffffff",
  "#6b7280",
  "#1e3a8a",
  "#7f1d1d",
  "#14532d",
  "#b45309",
  "#9d174d",
];

export function GarmentControls() {
  const garment = useDesignStore((s) => s.design.garment);
  const view = useDesignStore((s) => s.design.view);
  const garmentColor = useDesignStore((s) => s.design.garmentColor);
  const setGarment = useDesignStore((s) => s.setGarment);
  const setView = useDesignStore((s) => s.setView);
  const setGarmentColor = useDesignStore((s) => s.setGarmentColor);

  return (
    <div className="flex flex-col gap-6">
      {/* Garment type */}
      <Section label="Garment">
        <div className="grid grid-cols-2 gap-2">
          {GARMENTS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGarment(g.value)}
              className={cn(
                "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                garment === g.value
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-accent",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Section>

      {/* View toggle */}
      <Section label="View">
        <div className="flex rounded-md border border-border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "flex-1 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors",
                view === v.value
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Color picker */}
      <Section label="Garment Color">
        <div className="grid grid-cols-8 gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setGarmentColor(c)}
              style={{ backgroundColor: c }}
              className={cn(
                "aspect-square rounded-md border transition-transform hover:scale-110",
                garmentColor.toLowerCase() === c.toLowerCase()
                  ? "border-sky-400 ring-1 ring-sky-400"
                  : "border-border",
              )}
              aria-label={`Set color ${c}`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-md border border-border">
            <input
              type="color"
              value={garmentColor}
              onChange={(e) => setGarmentColor(e.target.value)}
              className="absolute -left-1 -top-1 h-10 w-10 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <span className="font-mono text-xs uppercase text-muted-foreground">
            {garmentColor}
          </span>
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
