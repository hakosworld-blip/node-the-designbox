// AI design assistant — modeled on OpenPencil's ⌘J AI chat
// (upstream/src/app/ai/chat): BYOK providers, the model returns JSON plans
// that are applied to the canvas as one undoable step.

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEditor } from "@/lib/store";
import { parsePlan, applyPlan, type AppliedOps } from "@/lib/aiOps";
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

interface Msg {
  role: "user" | "assistant";
  content: string;
  meta?: AppliedOps;
}

const KEY_STORE = "node.ai.key";
const MODEL_STORE = "node.ai.model";

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
    .map(
      (n) =>
        `${n.id} ${n.type} "${n.name}" @${Math.round(n.x)},${Math.round(n.y)} ${Math.round(n.w)}x${Math.round(n.h)}`,
    )
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
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem(KEY_STORE, apiKey.trim());
    localStorage.setItem(MODEL_STORE, model.trim());
    setShowSettings(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] flex-col gap-0 overflow-hidden bg-[#131318] p-0 text-zinc-100 sm:max-w-xl">
        <DialogHeader className="border-b border-white/[0.06] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-violet-400" />
            AI assistant
            <span className="ml-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              ⌘J
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Describe what to build or change — edits land on the canvas in one
            undoable step.
          </DialogDescription>
        </DialogHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && !busy && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-zinc-500">Try:</p>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]"
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
                  : "mr-auto max-w-[85%] rounded-lg rounded-bl-sm border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-zinc-200"
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.meta && (
                <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
                  +{m.meta.created} created · ~{m.meta.updated} updated · −
                  {m.meta.deleted} deleted · undo with ⌘Z
                </p>
              )}
            </div>
          ))}
          {busy && (
            <div className="mr-auto flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-zinc-400">
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
          <div className="space-y-2 border-t border-white/[0.06] px-4 py-3">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="OpenRouter API key (sk-or-…)"
              type="password"
              className="h-8 border-white/10 bg-white/[0.03] text-xs"
              autoFocus
            />
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model (default: anthropic/claude-3.5-sonnet)"
              className="h-8 border-white/10 bg-white/[0.03] text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-zinc-400 hover:text-zinc-100"
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
            <p className="text-[10px] text-zinc-600">
              Stored only in this browser. Requests are proxied through the app
              backend; the key is never persisted server-side.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3">
            <button
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              title="AI settings"
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
              className="h-9 border-white/10 bg-white/[0.03] text-sm placeholder:text-zinc-600"
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
