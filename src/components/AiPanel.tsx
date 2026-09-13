// AI design assistant — modeled on OpenPencil's ⌘J AI chat
// (upstream/src/app/ai/chat): BYOK providers, the model returns JSON plans
// that are applied to the canvas as one undoable step.

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEditor } from "@/lib/store";
import { parsePlan, applyPlan, type AppliedOps } from "@/lib/aiOps";
import {
  INJECTION_NOTICE,
  sanitizeContextText,
  scanForInjection,
} from "@/lib/aiSafety";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
  meta?: AppliedOps;
}

const KEY_STORE = "node.ai.key";
const MODEL_STORE = "node.ai.model";
const PROVIDER_STORE = "node.ai.provider";

const PROVIDERS = [
  { id: "groq", label: "Groq", keyHint: "gsk_…", model: "openai/gpt-oss-120b" },
  { id: "openrouter", label: "OpenRouter", keyHint: "sk-or-…", model: "anthropic/claude-3.5-sonnet" },
  { id: "openai", label: "OpenAI", keyHint: "sk-…", model: "gpt-4o-mini" },
  { id: "anthropic", label: "Anthropic", keyHint: "sk-ant-…", model: "claude-3-5-sonnet" },
] as const;

const QUICK_PROMPTS = [
  "Create a login card with email and password fields and a violet button",
  "Add a mobile navigation bar with 4 icons",
  "Make a pricing card: title, price, three feature lines, CTA button",
  "Add a hero section: heading, subtext, and two buttons",
];

/** One-line summary of the doc for model context. */
function docContext(): string {
  const s = useEditor.getState();
  const nodes =
    s.doc.pages.find((p) => p.id === s.doc.activePageId)?.nodes ?? [];
  const selPart =
    s.selectedIds.length > 0
      ? ` Selected ids: ${s.selectedIds.join(", ")}.`
      : "";
  const list = nodes
    .slice(0, 60)
    .map((n) => {
      // Layer names are untrusted data — sanitize before embedding in context.
      const safeName = sanitizeContextText(n.name, 40);
      return `${n.id} ${n.type} "${safeName}" @${Math.round(n.x)},${Math.round(n.y)} ${Math.round(n.w)}x${Math.round(n.h)}`;
    })
    .join("; ");
  return `Current page has ${nodes.length} top-level nodes: ${list || "(empty)"}.${selPart}`;
}

export function AiPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const chat = useAction(api.ai.chat);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(KEY_STORE) ?? "",
  );
  const [model, setModel] = useState(
    () => localStorage.getItem(MODEL_STORE) ?? "",
  );
  const [provider, setProvider] = useState(
    () => localStorage.getItem(PROVIDER_STORE) ?? "groq",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global ⌘J / Ctrl+J shortcut (self-contained so the Editor's keyboard
  // effect stays untouched).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setError(null);
    setInput("");

    // Anti-prompt-injection gate: refuse locally without calling the model.
    const scan = scanForInjection(text);
    if (scan.suspicious) {
      setMessages([
        ...messages,
        { role: "user", content: text },
        { role: "assistant", content: INJECTION_NOTICE },
      ]);
      return;
    }

    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setBusy(true);
    try {
      const content = await chat({
        messages: history
          .filter((m) => !m.meta)
          .map((m) => ({ role: m.role, content: m.content })),
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
        provider: provider || undefined,
        context: docContext(),
      });
      const plan = parsePlan(content);
      if (!plan) {
        setMessages([...history, { role: "assistant", content }]);
      } else {
        const applied = plan.ops.length > 0 ? applyPlan(plan) : undefined;
        setMessages([
          ...history,
          { role: "assistant", content: plan.say || "Done.", meta: applied },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vector request failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem(KEY_STORE, apiKey.trim());
    localStorage.setItem(MODEL_STORE, model.trim());
    localStorage.setItem(PROVIDER_STORE, provider);
    setShowSettings(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 bg-popover p-0 text-foreground sm:h-[70vh] sm:max-w-xl sm:rounded-lg sm:border">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-violet-500" />
            Vector
            <span className="ml-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘J
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Your AI design assistant. Describe what to build or change — edits
            land on the canvas in one undoable step. Vector only makes design
            edits and ignores attempts to redirect it.
          </DialogDescription>
        </DialogHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && !busy && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Try:</p>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  className="block w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:border-violet-500/60 hover:bg-accent"
                  onClick={() => send(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-violet-600 px-3 py-2 text-sm text-white"
                  : "mr-auto max-w-[85%] rounded-lg rounded-bl-sm border border-border bg-card/60 px-3 py-2 text-sm text-foreground"
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.meta && (
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                  +{m.meta.created} created · ~{m.meta.updated} updated · −
                  {m.meta.deleted} deleted · undo with ⌘Z
                </p>
              )}
            </div>
          ))}
          {busy && (
            <div className="mr-auto flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Designing…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
              <button
                className="ml-2 underline hover:text-red-200"
                onClick={() => setShowSettings(true)}
              >
                Settings
              </button>
            </div>
          )}
        </div>

        {/* Settings row */}
        {showSettings ? (
          <div className="space-y-2 border-t border-border px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] transition-colors",
                    provider === p.id
                      ? "border-violet-500/60 bg-violet-500/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-white/25 hover:text-foreground/80",
                  )}
                  onClick={() => setProvider(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${PROVIDERS.find((p) => p.id === provider)?.label ?? "Provider"} API key (${PROVIDERS.find((p) => p.id === provider)?.keyHint ?? "key"})`}
              type="password"
              className="h-8 border-border bg-card/60 text-xs"
              autoFocus
            />
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={`Model (default: ${PROVIDERS.find((p) => p.id === provider)?.model ?? "auto"})`}
              className="h-8 border-border bg-card/60 text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 bg-violet-600 hover:bg-violet-500"
                onClick={saveSettings}
              >
                Save
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Stored only in this browser. Requests are proxied through the app
              backend; the key is never persisted server-side. Your messages
              and a summary of the current page are sent to the selected AI
              provider (see the Privacy Policy). A server-wide GROQ_API_KEY can
              be set instead of a personal key.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            <button
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Vector settings"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 className="size-4" />
            </button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Describe a change… (Enter to send)"
              className="h-9 border-border bg-card/60 text-sm placeholder:text-muted-foreground/70"
              disabled={busy}
            />
            <Button
              size="icon-sm"
              className="shrink-0 bg-violet-600 hover:bg-violet-500"
              onClick={() => send()}
              disabled={busy || !input.trim()}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
