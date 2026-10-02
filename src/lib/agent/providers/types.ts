import type { DesignState } from "@/lib/types";
import type { AgentResponse, DesignAction } from "../actions";

/**
 * One prior conversation turn, passed to the provider as context so follow-up
 * requests ("make it bigger") can be resolved without the user repeating
 * themselves. Tool calls are kept structured — providers serialize them
 * however their backend needs (e.g. appended to assistant content).
 */
export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  /** Tool calls the assistant emitted that turn (assistant only). */
  toolCalls?: DesignAction[];
}

/**
 * A pluggable AI backend. Implement this interface to swap providers
 * (mock, OpenAI, Qwen, OpenRouter, ...). The app only depends on this contract,
 * never on a specific vendor SDK.
 */
export interface AgentProvider {
  /** Human-readable id, e.g. "mock" | "openai". */
  readonly id: string;

  /**
   * Turn a user message (plus the current design and recent conversation as
   * context) into a structured AgentResponse. The returned actions are still
   * validated before applying.
   */
  generateActions(
    userMessage: string,
    design: DesignState,
    history?: ChatTurn[],
  ): Promise<AgentResponse>;
}
