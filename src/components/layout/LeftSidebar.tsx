"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDesignStore } from "@/lib/store/designStore";
import { GarmentControls } from "@/components/panels/GarmentControls";
import { LayersPanel } from "@/components/panels/LayersPanel";

/**
 * Left sidebar — garment settings, element creation, and the layers list.
 */
export function LeftSidebar() {
  const addText = useDesignStore((s) => s.addText);
  const addImage = useDesignStore((s) => s.addImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onUploadClick() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      // Size the placed image so it keeps the file's aspect ratio.
      const img = new Image();
      img.onload = () => {
        const maxDim = 200;
        const ratio = img.width / img.height || 1;
        const width = ratio >= 1 ? maxDim : maxDim * ratio;
        const height = ratio >= 1 ? maxDim / ratio : maxDim;
        addImage(src, file.name, { width, height });
      };
      img.onerror = () => addImage(src, file.name);
      img.src = src;
    };
    reader.readAsDataURL(file);
    // Allow re-uploading the same file.
    e.target.value = "";
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-surface">
      <ScrollArea className="flex-1 px-4 py-5">
        <GarmentControls />

        <Separator className="my-5" />

        {/* Add elements */}
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Add
          </span>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => addText()}
          >
            <TypeIcon />
            Add Text
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={onUploadClick}
          >
            <ImageIcon />
            Upload Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        <Separator className="my-5" />

        <LayersPanel />
      </ScrollArea>
    </aside>
  );
}

function TypeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
