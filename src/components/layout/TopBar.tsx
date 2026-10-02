"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useDesignStore } from "@/lib/store/designStore";
import { exportDesignJson, readDesignFile } from "@/lib/export";
import { ExportMenu } from "./ExportMenu";

/**
 * Top app bar — brand, project title, credits indicator, Import/Save/Export.
 *
 * Phase 2: Save -> JSON download, Import -> load a saved project,
 * Export -> PNG / JSON / Design Sheet menu.
 */
export function TopBar() {
  const design = useDesignStore((s) => s.design);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    exportDesignJson(design);
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const imported = await readDesignFile(file);
      loadDesign(imported);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-black text-primary-foreground">
            TC
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            ThreadCraft AI
          </span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">
            Untitled Design
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1 sm:flex">
          <WalletIcon />
          <span className="font-mono text-[11px] font-bold text-muted-foreground">
            2,450 CREDITS
          </span>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <Button variant="ghost" size="sm" onClick={handleImportClick}>
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave}>
          Save
        </Button>
        <ExportMenu />
      </div>
    </header>
  );
}

function WalletIcon() {
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
      className="text-muted-foreground"
    >
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M16 12h.01" />
    </svg>
  );
}
