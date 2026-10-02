import type {
  GenerateImageParams,
  GenerateImageResult,
  ImageProvider,
} from "./types";

/**
 * Calls the server-side /api/generate-image route (which holds the API key and
 * talks to a real image model). Throws on failure so the caller can surface the
 * error in chat and keep the canvas untouched.
 */
export class RemoteImageProvider implements ImageProvider {
  readonly id = "remote";

  async generate(params: GenerateImageParams): Promise<GenerateImageResult> {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Image API error (${res.status}). ${text || "Is an image provider key configured?"}`,
      );
    }

    const data = (await res.json()) as Partial<GenerateImageResult>;
    if (!data.src) throw new Error("Image API returned no image.");
    return {
      src: data.src,
      label: data.label ?? "Generated graphic",
      provider: data.provider ?? this.id,
    };
  }
}
