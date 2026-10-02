# ThreadCraft AI

**Design garments by chatting.** An agentic AI design studio where an LLM assistant edits a live, structured canvas through validated tool calls — no prompt-to-image roulette, no "AI blob" output. Every element it places is a real, editable design object.

> Try it: *"make this a black hoodie with a small left chest logo"*, *"add bold text on the back"*, *"generate a chrome cyberpunk logo"*, *"make the design more minimal"*.

## What makes it "agentic"

The LLM never touches app state directly. It responds with a **structured action list** (tool calls) that is validated and applied through the same code path as manual editing:

```
 you type ──▶ agent runtime ──▶ provider ──────────────▶ LLM
                 │                  (mock | remote API)
                 │                        │ reply + JSON actions
                 │                        ▼
                 │                 validateActions()   ← rejects malformed
                 │                        │               tool calls
                 │          ┌─────────────┴─────────────┐
                 │     cheap edits               generateGraphic
                 │          │                    (async image pipeline)
                 ▼          ▼                          ▼
             applyActions() ──▶ design store ◀── placeGeneratedImage()
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
                 canvas        layers panel      export (PNG/SVG/JSON)
```

- **11 tool calls** the model can choose from: `addText`, `moveElement`, `recolorElement`, `resizeElement`, `deleteElement`, `setGarmentColor`, `applyLayout`, `generateGraphic`, …
- **Semantic selectors** — the model can say `target: "logo"` or `"lastText"` instead of knowing internal ids
- **Named print areas** — the garment is a real data model (`left-chest`, `front-center`, `back-neck`, …); actions place by `area` instead of guessing pixels, with a toggleable canvas overlay and off-print warnings
- **Validation gate** — invalid actions are dropped and surfaced in chat before anything mutates
- **One mutation path** — AI edits and manual edits call the same store methods, so they can never drift apart
- **Split pipelines** — cheap canvas edits apply instantly; image generation runs async so chat never blocks
- **Key safety** — API keys live only in server-side API routes; the browser never sees them

## Features

- Garment mockups (t-shirt / hoodie, front & back views) rendered as SVG
- Drag, resize, recolor, layer and delete elements manually — or just ask the AI
- AI image generation placed as normal editable elements
- Layout presets (minimal, bold-center, left-chest, back-graphic)
- Export: PNG, SVG, design-sheet, and lossless JSON round-trip (export → import)
- Provider-agnostic: works offline with a mock provider; swap to any OpenAI-compatible LLM via env vars

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app runs in **mock mode** by default — a simulated LLM and SVG image provider, no keys required.

### Using a real LLM

Works with any OpenAI-compatible chat API (OpenAI, OpenRouter, DeepSeek, Qwen/DashScope, local Ollama, …). Copy `.env.example` → `.env.local`:

```bash
NEXT_PUBLIC_AGENT_PROVIDER=remote
AGENT_API_KEY=sk-...
AGENT_BASE_URL=https://api.openai.com/v1   # optional
AGENT_MODEL=gpt-4o-mini                    # optional

# Real image generation (optional)
NEXT_PUBLIC_IMAGE_PROVIDER=remote
IMAGE_API_KEY=sk-...
```

Restart the dev server after changing `NEXT_PUBLIC_*` vars.

## Project structure

| Path | Purpose |
|---|---|
| `src/app/` | Next.js pages + server API routes (only place keys exist) |
| `src/lib/types.ts` | `DesignState` — the design document schema, single source of truth |
| `src/lib/store/` | Zustand stores: `designStore` (the document), `agentStore` (chat pipeline) |
| `src/lib/agent/actions.ts` | The tool-call contract (what the LLM may emit) |
| `src/lib/agent/printAreas.ts` | Named print areas — garment placement data model |
| `src/lib/agent/prompt.ts` | System prompt describing tools + canvas to the model |
| `src/lib/agent/validateActions.ts` | Validation gate before any mutation |
| `src/lib/agent/applyActions.ts` | The single mutation handler for AI edits |
| `src/lib/agent/providers/` | Mock + remote LLM providers |
| `src/lib/agent/image/` | Image generation (mock SVG / remote API) |
| `src/lib/export/` | PNG / SVG / JSON / design-sheet export |
| `src/components/` | Canvas, panels, layout UI |

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Zustand · Tailwind CSS · lucide-react

## Roadmap

- [x] Canvas + manual editing
- [x] Agent pipeline (tools, validation, application)
- [x] Image generation pipeline
- [x] Export / import
- [x] Agent transparency: show raw tool calls in chat
- [x] Multi-turn context for follow-up requests
- [x] Named print areas (left-chest, back-full, …) as first-class placement targets
- [x] Undo/redo across manual + AI edits (zundo temporal history)
- [ ] Demo video & deployment
