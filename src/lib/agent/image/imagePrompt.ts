/**
 * Refines a raw user request into a clean, model-ready image prompt.
 *
 * In mock mode this is a lightweight local cleanup (the example flow:
 * "Generate a chrome cyberpunk cricket logo for the back" -> a focused subject
 * prompt). A real text model can produce richer prompts via the /api/agent
 * route, but generation must work fully offline, so we keep a solid local
 * fallback here.
 */
export function buildImagePrompt(userRequest: string): string {
  let p = userRequest.trim();

  // Strip the imperative + placement boilerplate so the subject is the focus.
  p = p.replace(
    /\b(please|can you|could you|generate|create|make|design|add|put|place|draw)\b/gi,
    " ",
  );
  p = p.replace(
    /\b(for|on|to|onto)\s+(the\s+)?(back|front|chest|garment|hoodie|t-?shirt|tee|left chest|right chest)\b/gi,
    " ",
  );
  p = p.replace(/\b(a|an|the)\b/gi, " ");
  p = p.replace(/\s+/g, " ").trim();

  if (!p) p = "abstract graphic";

  // Add print-friendly styling guidance for a garment graphic.
  return `${p}, high-detail vector-style graphic, centered composition, clean isolated subject on a dark background, suitable for apparel print`;
}

/** Detect which view the user wants the graphic placed on. */
export function detectGenerationView(
  userRequest: string,
): "front" | "back" | null {
  const msg = userRequest.toLowerCase();
  if (/\bback\b/.test(msg) && !/background/.test(msg)) return "back";
  if (/\b(front|chest)\b/.test(msg)) return "front";
  return null;
}

/**
 * Does this message ask to GENERATE new artwork (vs. a cheap canvas edit)?
 * Generation is expensive, so we only trigger it on explicit intent.
 */
export function isGenerationRequest(userRequest: string): boolean {
  const msg = userRequest.toLowerCase();
  return /\b(generate|create|design|draw|make)\b[\w\s]*\b(graphic|art|artwork|logo|image|illustration|design|print|picture|pattern)\b/.test(
    msg,
  );
}
