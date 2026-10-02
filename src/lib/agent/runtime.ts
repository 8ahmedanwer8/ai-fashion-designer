import type { DesignState } from "@/lib/types";
import type { AgentProvider, ChatTurn } from "./providers/types";
import { MockProvider } from "./providers/mockProvider";
import { RemoteProvider } from "./providers/remoteProvider";
import { validateActions } from "./validateActions";
import { applyActions, placeGeneratedImage } from "./applyActions";
import type { DesignAction, GenerateGraphicAction } from "./actions";
import { getImageProvider } from "./image";
import { buildImagePrompt } from "./image/imagePrompt";

/**
 * Runtime wiring for the AI assistant.
 *
 * Text pipeline:  provider.generateActions → validateActions → applyActions
 * Image pipeline: generateGraphic actions are split out and run SEPARATELY
 *                 (async, expensive). Cheap canvas edits never wait on them.
 *
 * Providers are abstracted (mock by default). Real LLM / image models are
 * opt-in via env and routed through server-side API routes (keys stay server).
 */

export interface AgentTurnResult {
  reply: string;
  appliedSummaries: string[];
  validationErrors: string[];
  rawActionCount: number;
  /** The validated tool calls the model emitted this turn (for UI display). */
  actions: DesignAction[];
  /** Generation requests deferred to the async image pipeline. */
  pendingGenerations: GenerateGraphicAction[];
}

let provider: AgentProvider | null = null;

function getProvider(): AgentProvider {
  if (provider) return provider;
  const mode =
    process.env.NEXT_PUBLIC_AGENT_PROVIDER?.toLowerCase() ?? "mock";
  provider = mode === "remote" ? new RemoteProvider() : new MockProvider();
  return provider;
}

/** Override the provider (handy for tests). */
export function setAgentProvider(p: AgentProvider): void {
  provider = p;
}

export function getAgentProviderId(): string {
  return getProvider().id;
}

/**
 * Run one user turn. Validates actions, applies the cheap (synchronous) ones
 * immediately, and returns any image-generation requests for the caller to run
 * through `runGeneration` (so the UI can show a loading state meanwhile).
 * Recent conversation turns are forwarded so the provider can resolve
 * follow-up references ("make it bigger").
 */
export async function runAgentTurn(
  userMessage: string,
  design: DesignState,
  history?: ChatTurn[],
): Promise<AgentTurnResult> {
  let reply: string;
  let rawActions: unknown;

  try {
    const response = await getProvider().generateActions(
      userMessage,
      design,
      history,
    );
    reply = response.reply;
    rawActions = response.actions;
  } catch (err) {
    return {
      reply: `The assistant failed: ${(err as Error).message}`,
      appliedSummaries: [],
      validationErrors: [(err as Error).message],
      rawActionCount: 0,
      actions: [],
      pendingGenerations: [],
    };
  }

  // Validate BEFORE mutating anything.
  const { valid, errors } = validateActions(rawActions);

  // Separate the expensive image-generation actions from cheap canvas edits.
  const pendingGenerations: GenerateGraphicAction[] = [];
  const cheapActions: DesignAction[] = [];
  for (const action of valid) {
    if (action.type === "generateGraphic") {
      pendingGenerations.push(action);
    } else {
      cheapActions.push(action);
    }
  }

  // Apply cheap edits synchronously and instantly.
  const appliedSummaries = applyActions(cheapActions);

  return {
    reply,
    appliedSummaries,
    validationErrors: errors,
    rawActionCount: Array.isArray(rawActions) ? rawActions.length : 0,
    actions: valid,
    pendingGenerations,
  };
}

export interface GenerationResult {
  ok: boolean;
  summary: string;
  /** The refined prompt actually sent to the image model. */
  imagePrompt: string;
  error?: string;
}

/**
 * Execute ONE image generation: refine the prompt, call the image provider,
 * then place the result as an editable image element. Kept separate from the
 * synchronous action handler so canvas edits stay cheap.
 */
export async function runGeneration(
  action: GenerateGraphicAction,
): Promise<GenerationResult> {
  const imagePrompt = buildImagePrompt(action.prompt);

  try {
    const result = await getImageProvider().generate({
      prompt: imagePrompt,
      size: action.size ? Math.round(action.size * 2) : 512,
    });

    placeGeneratedImage(result.src, result.label, {
      view: action.view,
      x: action.x,
      y: action.y,
      size: action.size ?? 240,
      ...(action.area ? { area: action.area } : {}),
    });

    return {
      ok: true,
      summary: `Generated & placed "${result.label}"`,
      imagePrompt,
    };
  } catch (err) {
    return {
      ok: false,
      summary: "Image generation failed",
      imagePrompt,
      error: (err as Error).message,
    };
  }
}
