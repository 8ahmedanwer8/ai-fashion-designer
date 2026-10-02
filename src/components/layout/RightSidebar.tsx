"use client";

import { useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentStore, type ChatMessage } from "@/lib/store/agentStore";
import type { DesignAction } from "@/lib/agent/actions";
import { getAgentProviderId } from "@/lib/agent/runtime";
import { cn } from "@/lib/utils";

/**
 * Right sidebar — working AI design assistant.
 *
 * Sends messages through the agent pipeline (provider -> validate -> apply),
 * which mutates the shared design store. Each assistant turn shows the actions
 * that were actually applied to the canvas.
 */
const SUGGESTED_PROMPTS = [
  "Generate a chrome cyberpunk cricket logo for the back",
  "Make this a black hoodie with a small left chest logo",
  "Move the logo higher",
  "Make the design more minimal",
  "Change the hoodie to cream and make the text black",
];

export function RightSidebar() {
  const messages = useAgentStore((s) => s.messages);
  const isThinking = useAgentStore((s) => s.isThinking);
  const isGenerating = useAgentStore((s) => s.isGenerating);
  const send = useAgentStore((s) => s.send);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const providerId = getAgentProviderId();
  const busy = isThinking || isGenerating;

  // Auto-scroll to newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking, isGenerating]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    void send(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest">
          AI Assistant
        </span>
        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
          {providerId === "mock" ? "Mock" : "Live"} · Tools
        </span>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-5">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {isThinking && <ThinkingBubble />}
        </div>
      </ScrollArea>

      {/* Suggested prompts */}
      <div className="shrink-0 px-4 pb-2">
        <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Suggested
        </span>
        <div className="flex flex-col gap-1.5">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              disabled={busy}
              onClick={() => submit(p)}
              className="rounded-lg border border-border px-3 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder={
              isGenerating ? "Generating artwork…" : "Ask the design assistant…"
            }
            className="h-20 pr-10"
          />
          <button
            onClick={() => submit(input)}
            disabled={busy || !input.trim()}
            className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="font-mono text-[9px] uppercase text-muted-foreground">
            {providerId} provider
          </span>
          <span className="font-mono text-[9px] uppercase text-muted-foreground">
            Enter to send
          </span>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 animate-fade-in",
        isUser && "items-end",
      )}
    >
      <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
        {isUser ? "You" : "Assistant"}
      </span>
      <div
        className={cn(
          "max-w-[90%] rounded-xl px-3.5 py-3 text-[13px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border bg-background text-foreground",
        )}
      >
        {message.text}
      </div>

      {/* Raw tool calls the model emitted (agent transparency) */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <details className="group max-w-[90%] rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-400 [&::-webkit-details-marker]:hidden">
            <span className="transition-transform group-open:rotate-90">›</span>
            tool calls ({message.toolCalls.length})
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {message.toolCalls.map((action, i) => (
              <div key={i} className="font-mono text-[10px] leading-relaxed">
                <span className="text-emerald-400">» </span>
                <span className="font-bold text-foreground/90">{action.type}</span>
                {action.type === "generateGraphic" && (
                  <span className="ml-1 rounded bg-emerald-500/15 px-1 py-px text-[8px] uppercase text-emerald-300/80">
                    async
                  </span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  {formatActionParams(action)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Image generation in progress */}
      {message.generating && (
        <div className="flex max-w-[90%] items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <span className="font-mono text-[10px] uppercase tracking-wide text-violet-300">
            Generating artwork…
          </span>
        </div>
      )}

      {/* Generation error */}
      {message.generationError && (
        <div className="flex max-w-[90%] flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-destructive">
            Generation failed
          </span>
          <span className="text-[11px] text-foreground/70">
            {message.generationError}
          </span>
        </div>
      )}

      {/* Applied actions summary */}
      {message.appliedSummaries && message.appliedSummaries.length > 0 && (
        <div className="flex max-w-[90%] flex-col gap-1 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-sky-400">
            Applied
          </span>
          {message.appliedSummaries.map((s, i) => (
            <span key={i} className="text-[11px] text-foreground/80">
              • {s}
            </span>
          ))}
        </div>
      )}

      {/* Validation errors (dropped actions) */}
      {message.errors && message.errors.length > 0 && (
        <div className="flex max-w-[90%] flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-destructive">
            Skipped
          </span>
          {message.errors.map((e, i) => (
            <span key={i} className="text-[11px] text-foreground/70">
              • {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact one-line rendering of a tool call's params, e.g. { color: "black" }. */
function formatActionParams(action: DesignAction): string {
  const params = Object.entries(action).filter(([key]) => key !== "type");
  if (params.length === 0) return "{}";
  const parts = params.map(([key, value]) => {
    let display =
      typeof value === "string" ? `"${value}"` : JSON.stringify(value);
    if (display === undefined) display = String(value);
    if (display.length > 60) display = display.slice(0, 57) + "…";
    return `${key}: ${display}`;
  });
  return `{ ${parts.join(", ")} }`;
}

function ThinkingBubble() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
        Assistant
      </span>
      <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm border border-border bg-background px-3.5 py-3">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  );
}

function SendIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
