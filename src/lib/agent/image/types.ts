/**
 * Abstract image-generation provider.
 *
 * Image generation is intentionally kept SEPARATE from the synchronous canvas
 * actions (applyActions). It is async + expensive, so it only runs when the
 * user explicitly asks for new artwork. Implement this interface to swap
 * providers (mock, OpenAI images, Stability, Replicate, ...).
 */

export interface GenerateImageParams {
  /** Clean, model-ready prompt (already refined from the user's request). */
  prompt: string;
  /** Square output size in px (provider may round to nearest supported). */
  size?: number;
}

export interface GenerateImageResult {
  /** Image as a data URL (base64) or remote URL, ready to store + render. */
  src: string;
  /** Short label for the layers panel, e.g. derived from the prompt. */
  label: string;
  /** Which provider produced it (for debugging / display). */
  provider: string;
}

export interface ImageProvider {
  readonly id: string;
  generate(params: GenerateImageParams): Promise<GenerateImageResult>;
}
