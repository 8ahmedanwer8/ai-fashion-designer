import type { DesignState } from "@/lib/types";
import type { AgentProvider, ChatTurn } from "./types";
import type { AgentResponse } from "../actions";
import { formatActionParams } from "../actions";

/**
 * Calls the server-side /api/agent route, which talks to a real LLM. The route
 * is the only place the API key lives, so the client stays key-free. If the
 * route is unavailable or not configured, this throws and the caller surfaces
 * the error in chat.
 */
export class RemoteProvider implements AgentProvider {
  readonly id = "remote";

  async generateActions(
    userMessage: string,
    design: DesignState,
    history?: ChatTurn[],
  ): Promise<AgentResponse> {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        design,
        history: (history ?? []).map(serializeTurn),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Agent API error (${res.status}). ${text || "Is a provider key configured?"}`,
      );
    }

    const data = (await res.json()) as Partial<AgentResponse>;
    return {
      reply: typeof data.reply === "string" ? data.reply : "",
      actions: Array.isArray(data.actions) ? data.actions : [],
    };
  }
}

/**
 * Flatten a structured turn into a plain chat message. Tool calls become a
 * compact bracketed line so the LLM knows what it previously did — enough to
 * resolve "make it bigger" without bloating the prompt.
 */
function serializeTurn(turn: ChatTurn): {
  role: "user" | "assistant";
  content: string;
} {
  let content = turn.text;
  if (turn.toolCalls?.length) {
    const calls = turn.toolCalls
      .map((a) => `${a.type}${formatActionParams(a)}`)
      .join("; ");
    content += `\n[tool calls: ${calls}]`;
  }
  return { role: turn.role, content };
}
