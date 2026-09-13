import { describe, expect, it, beforeEach } from "vitest";
import { useEditor } from "./store";
import { defaultNode, type DesignNode } from "./geo";
import {
  parsePlan,
  validateOp,
  sanitizeColor,
  opToNode,
  opToPatch,
  applyPlan,
} from "./aiOps";

function activeNodes(): DesignNode[] {
  const s = useEditor.getState();
  return s.doc.pages.find((p) => p.id === s.doc.activePageId)?.nodes ?? [];
}

function seedDoc() {
  const a = defaultNode("rect", 0, 0);
  a.name = "Target";
  useEditor.getState().setDoc(
    {
      pages: [{ id: "p1", name: "Page 1", nodes: [a] }],
      activePageId: "p1",
      background: "#101012",
    },
    { resetHistory: true },
  );
}

describe("sanitizeColor", () => {
  it("accepts hex, rgb, hsl", () => {
    expect(sanitizeColor("#8B5CF6")).toBe("#8b5cf6");
    expect(sanitizeColor("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
    expect(sanitizeColor("hsl(100, 50%, 50%)")).toBe("hsl(100, 50%, 50%)");
  });
  it("rejects junk and non-strings", () => {
    expect(sanitizeColor("javascript:alert(1)")).toBeNull();
    expect(sanitizeColor("#12")).toBeNull();
    expect(sanitizeColor(42)).toBeNull();
    expect(sanitizeColor(undefined)).toBeNull();
  });
});

describe("validateOp", () => {
  it("keeps whitelisted fields only", () => {
    const op = validateOp({
      op: "create",
      type: "rect",
      fill: "#ff0000",
      evil: "drop table",
      onClick: "pwn",
    });
    expect(op).not.toBeNull();
    expect(op?.fill).toBe("#ff0000");
    const raw = op as unknown as Record<string, unknown>;
    expect(raw.evil).toBeUndefined();
    expect(raw.onClick).toBeUndefined();
  });
  it("rejects unknown op kinds", () => {
    expect(validateOp({ op: "explode" })).toBeNull();
    expect(validateOp(null)).toBeNull();
    expect(validateOp("hi")).toBeNull();
  });
});

describe("parsePlan", () => {
  it("parses fenced JSON", () => {
    const plan = parsePlan('```json\n{"say":"ok","ops":[{"op":"create","type":"rect"}]}\n```');
    expect(plan).not.toBeNull();
    expect(plan?.say).toBe("ok");
    expect(plan?.ops).toHaveLength(1);
  });
  it("parses plain objects", () => {
    expect(parsePlan({ say: "hi", ops: [] })?.say).toBe("hi");
  });
  it("returns null for garbage", () => {
    expect(parsePlan("not json at all {")).toBeNull();
  });
  it("filters invalid ops but keeps valid ones", () => {
    const plan = parsePlan({
      ops: [{ op: "create", type: "rect" }, { op: "nope" }, "junk"],
    });
    expect(plan?.ops).toHaveLength(1);
  });
});

describe("opToNode", () => {
  it("creates a valid node with defaults", () => {
    const n = opToNode({ op: "create", type: "rect" }, 0);
    expect(n).not.toBeNull();
    expect(n?.type).toBe("rect");
    expect(n?.w).toBeGreaterThan(0);
    expect(n?.fill).toMatch(/^#/);
  });
  it("falls back to rect for unknown types", () => {
    const n = opToNode({ op: "create", type: "ufo" }, 0);
    expect(n?.type).toBe("rect");
  });
  it("clamps text sizing and polygon points", () => {
    const t = opToNode({ op: "create", type: "text", fontSize: -5 }, 0);
    expect(t?.fontSize).toBeGreaterThanOrEqual(6);
    const p = opToNode({ op: "create", type: "polygon", points: 99 }, 0);
    expect(p?.points).toBeLessThanOrEqual(24);
  });
});

describe("opToPatch", () => {
  it("whitelists and coerces fields", () => {
    const patch = opToPatch({
      op: "update",
      fill: "NOT_A_COLOR",
      opacity: 5,
      w: -10,
      radius: -3,
    });
    expect(patch.fill).toBeNull();
    expect(patch.opacity).toBe(1);
    expect(patch.w).toBe(1);
    expect(patch.radius).toBe(0);
  });
});

describe("applyPlan", () => {
  beforeEach(() => {
    seedDoc();
  });

  it("creates nodes in one undoable step", () => {
    const before = activeNodes().length;
    const pastLen = useEditor.getState().past.length;
    const result = applyPlan(
      parsePlan({
        ops: [
          { op: "create", type: "rect", x: 10, y: 10 },
          { op: "create", type: "text", text: "Hi", x: 20, y: 20 },
        ],
        say: "made 2",
      })!,
    );
    expect(result.created).toBe(2);
    expect(activeNodes().length).toBe(before + 2);
    // Single history entry for the whole plan:
    expect(useEditor.getState().past.length).toBe(pastLen + 1);
  });

  it("updates existing nodes by id", () => {
    const target = activeNodes()[0];
    applyPlan(
      parsePlan({
        ops: [{ op: "update", id: target.id, fill: "#00ff00", name: "Renamed" }],
      })!,
    );
    const after = activeNodes().find((n) => n.id === target.id);
    expect(after?.fill).toBe("#00ff00");
    expect(after?.name).toBe("Renamed");
  });

  it("deletes nodes by id", () => {
    const target = activeNodes()[0];
    const result = applyPlan(parsePlan({ ops: [{ op: "delete", id: target.id }] })!);
    expect(result.deleted).toBe(1);
    expect(activeNodes().find((n) => n.id === target.id)).toBeUndefined();
  });

  it("undo restores the pre-plan doc", () => {
    const before = activeNodes().length;
    applyPlan(parsePlan({ ops: [{ op: "create", type: "rect" }] })!);
    expect(activeNodes().length).toBe(before + 1);
    useEditor.getState().undo();
    expect(activeNodes().length).toBe(before);
  });

  it("no-ops on an empty plan without touching history", () => {
    const pastLen = useEditor.getState().past.length;
    const result = applyPlan(parsePlan({ ops: [], say: "nothing" })!);
    expect(result.created).toBe(0);
    expect(useEditor.getState().past.length).toBe(pastLen);
  });

  it("caps the number of ops in a plan", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      op: "create",
      type: "rect",
      name: `r${i}`,
    }));
    const plan = parsePlan({ ops: many, say: "bulk" })!;
    expect(plan.ops.length).toBeLessThanOrEqual(20);
  });

  it("caps long strings in ops (injection surface bound)", () => {
    const plan = parsePlan({
      ops: [{ op: "update", id: "x".repeat(300), name: "n".repeat(300), text: "t".repeat(1000) }],
      say: "",
    })!;
    expect(plan.ops.length).toBe(1);
    const op = plan.ops[0];
    expect(op.id?.length).toBe(64);
    expect(op.name?.length).toBe(120);
    expect(op.text?.length).toBe(400);
  });
});
