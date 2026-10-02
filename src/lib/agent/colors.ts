/**
 * Resolves human/LLM color names (e.g. "cream", "black") to hex. Hex values
 * pass through unchanged. Keeps the model from needing to emit hex codes.
 */
const NAMED_COLORS: Record<string, string> = {
  black: "#111111",
  white: "#ffffff",
  cream: "#f5efe0",
  ivory: "#fffff0",
  grey: "#6b7280",
  gray: "#6b7280",
  charcoal: "#36393f",
  navy: "#1e3a8a",
  blue: "#2563eb",
  red: "#b91c1c",
  maroon: "#7f1d1d",
  green: "#15803d",
  olive: "#4d5320",
  forest: "#14532d",
  brown: "#6b4423",
  tan: "#d2b48c",
  beige: "#e8dcc4",
  orange: "#c2410c",
  yellow: "#eab308",
  pink: "#db2777",
  purple: "#7c3aed",
  sand: "#cbb893",
  stone: "#a8a29e",
};

export function resolveColor(input: string): string {
  const value = input.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  return NAMED_COLORS[value] ?? input;
}
