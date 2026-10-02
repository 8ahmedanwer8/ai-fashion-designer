import { create } from "zustand";

import { useDesignStore } from "@/lib/store/designStore";
import { runAgentTurn, runGeneration } from "@/lib/agent/runtime";
import type { DesignAction } from "@/lib/agent/actions";
import type { ChatTurn } from "@/lib/agent/providers/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** The validated tool calls the model emitted this turn (assistant only). */
  toolCalls?: DesignAction[];
  /** Per-turn summary of actions the assistant applied (assistant only). */
  appliedSummaries?: string[];
  /** Validation problems for that turn, if any. */
  errors?: string[];
  /** True while an image is being generated for this message. */
  generating?: boolean;
  /** Error message if generation failed. */
  generationError?: string;
}

interface AgentStore {
  messages: ChatMessage[];
  isThinking: boolean;
  /** True while any image generation is in flight. */
  isGenerating: boolean;
  /** Send a user message through the agent pipeline. */
  send: (text: string) => Promise<void>;
  reset: () => void;
}

let msgId = 1;
const newId = () => `msg_${msgId++}`;

const greeting: ChatMessage = {
  id: "msg_greeting",
  role: "assistant",
  text: "Hi — tell me what to design. Try \"make this a black hoodie with a small left chest logo\", \"add bold text on the back\", or \"generate a chrome cyberpunk cricket logo for the back\".",
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  messages: [greeting],
  isThinking: false,
  isGenerating: false,

  send: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isThinking || get().isGenerating) return;

    const userMsg: ChatMessage = { id: newId(), role: "user", text: trimmed };
    set((s) => ({ messages: [...s.messages, userMsg], isThinking: true }));

    // Pass the CURRENT design snapshot plus recent conversation as context,
    // so follow-ups ("make it bigger") resolve without repeating oneself.
    const design = useDesignStore.getState().design;
    const history = buildHistory(get().messages);
    const result = await runAgentTurn(trimmed, design, history);

    const hasGeneration = result.pendingGenerations.length > 0;
    const assistantId = newId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: result.reply,
      toolCalls: result.actions,
      appliedSummaries: result.appliedSummaries,
      errors: result.validationErrors.length
        ? result.validationErrors
        : undefined,
      generating: hasGeneration,
    };
    set((s) => ({
      messages: [...s.messages, assistantMsg],
      isThinking: false,
      isGenerating: hasGeneration,
    }));

    if (!hasGeneration) return;

    // --- Async image-generation pipeline (separate from cheap edits) ---
    const summaries: string[] = [...(result.appliedSummaries ?? [])];
    let lastError: string | undefined;

    for (const gen of result.pendingGenerations) {
      const genResult = await runGeneration(gen);
      if (genResult.ok) {
        summaries.push(genResult.summary);
      } else {
        lastError = genResult.error;
      }
    }

    // Patch the assistant message with the final result.
    set((s) => ({
      isGenerating: false,
      messages: s.messages.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              generating: false,
              appliedSummaries: summaries,
              generationError: lastError,
              text: lastError
                ? "I couldn't generate that image."
                : "Done — generated and placed your artwork. You can move, resize, or delete it like any element.",
            }
          : m,
      ),
    }));
  },

  reset: () => set({ messages: [greeting], isThinking: false, isGenerating: false }),
}));

/**
 * Convert chat messages into provider-ready context turns. The hardcoded
 * greeting is UI chrome, not a real model turn, so it's excluded. The last few
 * turns are enough to resolve references while keeping prompts cheap.
 */
function buildHistory(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((m) => m.id !== "msg_greeting")
    .slice(-10)
    .map((m) => ({
      role: m.role,
      text: m.text,
      ...(m.toolCalls?.length ? { toolCalls: m.toolCalls } : {}),
    }));
}
