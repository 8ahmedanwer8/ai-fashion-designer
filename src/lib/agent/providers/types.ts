import type { DesignState } from "@/lib/types";
import type { AgentResponse } from "../actions";

/**
 * A pluggable AI backend. Implement this interface to swap providers
 * (mock, OpenAI, Qwen, OpenRouter, ...). The app only depends on this contract,
 * never on a specific vendor SDK.
 */
export interface AgentProvider {
  /** Human-readable id, e.g. "mock" | "openai". */
  readonly id: string;

  /**
   * Turn a user message (plus the current design as context) into a structured
   * AgentResponse. The returned actions are still validated before applying.
   */
  generateActions(
    userMessage: string,
    design: DesignState,
  ): Promise<AgentResponse>;
}
