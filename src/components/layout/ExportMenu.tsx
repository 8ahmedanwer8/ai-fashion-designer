"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDesignStore } from "@/lib/store/designStore";
import {
  exportDesignJson,
  exportDesignPng,
  openDesignSheet,
} from "@/lib/export";
import { cn } from "@/lib/utils";

/**
 * Export dropdown — thin UI wrapper. All real work lives in `lib/export`.
 */
export function ExportMenu() {
  const design = useDesignStore((s) => s.design);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handlePng() {
    setBusy(true);
    try {
      await exportDesignPng(design);
    } catch (err) {
      alert(`PNG export failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  function handleJson() {
    exportDesignJson(design);
    setOpen(false);
  }

  function handleSheet() {
    openDesignSheet(design);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button size="sm" onClick={() => setOpen((o) => !o)} disabled={busy}>
        {busy ? "Exporting…" : "Export"}
        <ChevronDown />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <MenuItem
            label="Export PNG"
            hint="Current view"
            onClick={handlePng}
          />
          <MenuItem
            label="Export JSON"
            hint="Project file"
            onClick={handleJson}
          />
          <MenuItem
            label="Design Sheet"
            hint="Printable spec"
            onClick={handleSheet}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-accent",
      )}
    >
      <span className="text-foreground">{label}</span>
      <span className="font-mono text-[10px] uppercase text-muted-foreground">
        {hint}
      </span>
    </button>
  );
}

function ChevronDown() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
