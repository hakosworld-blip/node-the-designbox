// Design lint panel — the UI for OpenPencil-style `lint` in Node: static
// analysis of the current page with click-to-select navigation.

import { useMemo, useState } from "react";
import { useEditor } from "@/lib/store";
import {
  lintDoc,
  LINT_RULE_LABELS,
  SEVERITY_ORDER,
  type LintIssue,
  type LintSeverity,
} from "@/lib/designLint";
import { screenToPage } from "@/lib/geo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, ScanSearch, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SEV_STYLE: Record<LintSeverity, { icon: typeof XCircle; cls: string }> = {
  error: { icon: XCircle, cls: "text-red-400" },
  warning: { icon: AlertTriangle, cls: "text-amber-400" },
  info: { icon: Info, cls: "text-sky-400" },
};

export function LintPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const doc = useEditor((s) => s.doc);
  const [filter, setFilter] = useState<"all" | LintSeverity>("all");
  const [renamed, setRenamed] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const result = useMemo(() => lintDoc(doc), [doc]);
  const issues = useMemo(
    () =>
      result.issues
        .filter((i) => filter === "all" || i.severity === filter)
        .filter((i) => !dismissed.has(dedupeKey(i)))
        .sort(
          (a, b) =>
            SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
        ),
    [result, filter, dismissed],
  );

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const i of result.issues) c[i.severity]++;
    return c;
  }, [result]);

  const selectIssue = (issue: LintIssue) => {
    if (!issue.nodeId) return;
    const s = useEditor.getState();
    s.select([issue.nodeId]);
    // Frame the node if it's off-screen: center viewport on its bounds.
    const page = s.doc.pages.find((p) => p.id === s.doc.activePageId);
    const node = page?.nodes.find((n) => n.id === issue.nodeId);
    if (node && s.zoom > 0) {
      const el = document.querySelector<HTMLElement>("[data-canvas-center]");
      const cw = el?.clientWidth ?? window.innerWidth / 2;
      const ch = el?.clientHeight ?? window.innerHeight / 2;
      const cx = node.x + node.w / 2;
      const cy = node.y + node.h / 2;
      s.setViewport(s.zoom, cw / 2 - cx * s.zoom, ch / 2 - cy * s.zoom);
    }
    onOpenChange(false);
  };

  const applyRename = (issue: LintIssue) => {
    if (!issue.nodeId || !issue.fix?.name) return;
    const s = useEditor.getState();
    s.pushHistory();
    s.updateNodesLive([issue.nodeId], { name: issue.fix.name as string });
    setRenamed((prev) => new Set(prev).add(issue.nodeId!));
  };

  const dismiss = (issue: LintIssue) => {
    setDismissed((prev) => new Set(prev).add(dedupeKey(issue)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[70vh] flex-col gap-0 overflow-hidden bg-[#131318] p-0 text-zinc-100 sm:max-w-xl">
        <DialogHeader className="border-b border-white/[0.06] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanSearch className="size-4 text-violet-400" />
            Design lint
            <span className="ml-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              {result.checked} nodes
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Naming, accessibility, layout, and structure checks — adapted from
            OpenPencil's linter. Click an issue to jump to the node.
          </DialogDescription>
        </DialogHeader>

        {/* Severity filter */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-4 py-2">
          {(["all", "error", "warning", "info"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "rounded-md px-2 py-1 text-xs capitalize transition-colors",
                filter === f
                  ? "bg-white/[0.08] font-medium text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : `${f}s`}
              {f !== "all" && counts[f] > 0 && (
                <span className="ml-1 text-[10px] text-zinc-500">{counts[f]}</span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-500">
            {issues.length} issue{issues.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Issue list */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CheckCircle2 className="size-8 text-emerald-400" />
              <p className="text-sm font-medium text-zinc-200">
                {result.issues.length === 0 ? "No issues found" : "All clear"}
              </p>
              <p className="text-xs text-zinc-500">
                {result.issues.length === 0
                  ? `Linted ${result.checked} nodes across naming, contrast, layout, and structure.`
                  : "Dismissed issues are hidden until the panel reopens."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {issues.map((issue, idx) => {
                const sev = SEV_STYLE[issue.severity];
                const Icon = sev.icon;
                const isRenamed = issue.nodeId ? renamed.has(issue.nodeId) : false;
                return (
                  <div
                    key={`${issue.rule}-${issue.nodeId ?? idx}`}
                    className="group rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-violet-400/40 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={cn("mt-0.5 size-4 shrink-0", sev.cls)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200">{issue.message}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                          {LINT_RULE_LABELS[issue.rule] ?? issue.rule} · {issue.severity}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {issue.rule === "naming/generic-name" && issue.fix?.name && !isRenamed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                            onClick={() => applyRename(issue)}
                          >
                            Rename → {String(issue.fix.name).slice(0, 14)}
                          </Button>
                        )}
                        {issue.nodeId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                            onClick={() => selectIssue(issue)}
                          >
                            Show
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-zinc-500 hover:bg-white/[0.06]"
                          onClick={() => dismiss(issue)}
                        >
                          Dismiss
                        </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function dedupeKey(issue: LintIssue): string {
  return `${issue.rule}|${issue.nodeId ?? ""}|${issue.message}`;
}
