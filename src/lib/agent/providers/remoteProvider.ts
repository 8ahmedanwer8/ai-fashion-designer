import type { DesignState } from "@/lib/types";
import type { AgentProvider } from "./types";
import type { AgentResponse } from "../actions";

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
  ): Promise<AgentResponse> {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, design }),
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
