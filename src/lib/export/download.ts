/** Trigger a browser download for a Blob or string URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  // Revoke after a tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Build a filesystem-friendly filename, e.g. "threadcraft-hoodie-front". */
export function makeFilename(parts: (string | number)[], ext: string): string {
  const base = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}.${ext}`;
}
