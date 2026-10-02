import { NextResponse } from "next/server";

import type { DesignState } from "@/lib/types";
import { buildSystemPrompt, describeDesign } from "@/lib/agent/prompt";

/**
 * Server-side AI endpoint.
 *
 * Provider-agnostic: it calls any OpenAI-compatible chat-completions API
 * (OpenAI, Qwen/DashScope, OpenRouter, Together, local Ollama, ...). Swap
 * providers purely via env vars — no code change:
 *
 *   AGENT_API_KEY      required to enable the route
 *   AGENT_BASE_URL     defaults to https://api.openai.com/v1
 *   AGENT_MODEL        defaults to gpt-4o-mini
 *
 * The API key never reaches the browser.
 */
export async function POST(req: Request) {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No AGENT_API_KEY configured. Using mock provider instead." },
      { status: 501 },
    );
  }

  let body: {
    message?: string;
    design?: DesignState;
    history?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { message, design } = body;
  if (!message || !design) {
    return NextResponse.json(
      { error: "message and design are required." },
      { status: 400 },
    );
  }

  const baseUrl = process.env.AGENT_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AGENT_MODEL ?? "gpt-4o-mini";

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          // Recent conversation, so follow-ups like "make it bigger" resolve.
          ...sanitizeHistory(body.history),
          // The CURRENT design snapshot always comes last (it reflects all
          // prior actions) followed by the new user message.
          { role: "user", content: describeDesign(design) },
          { role: "user", content: message },
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `Upstream provider error: ${text || upstream.status}` },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { reply?: string; actions?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { reply: content, actions: [] };
    }

    return NextResponse.json({
      reply: parsed.reply ?? "",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Request failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

/**
 * Client-supplied history is untrusted input: keep only well-formed user /
 * assistant turns, cap the count (token cost) and per-turn length (abuse).
 */
function sanitizeHistory(raw: unknown): { role: string; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const turns: { role: string; content: string }[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (typeof role !== "string" || typeof content !== "string") continue;
    if (role !== "user" && role !== "assistant") continue;
    turns.push({ role, content: content.slice(0, 2000) });
  }
  return turns.slice(-12);
}
