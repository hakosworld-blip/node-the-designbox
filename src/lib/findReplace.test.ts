import { beforeEach, describe, expect, it } from "vitest";
import { defaultNode, type DesignNode } from "./geo";
import { useEditor } from "./store";
import { findMatches, gotoMatch, replaceAll } from "./findReplace";

function seedDoc(nodes: DesignNode[]) {
  useEditor.getState().setDoc(
    {
      pages: [{ id: "p1", name: "Page 1", nodes }],
      activePageId: "p1",
      background: "#ffffff",
    },
    { resetHistory: true },
  );
}

function activeNodes(): DesignNode[] {
  const s = useEditor.getState();
  return s.doc.pages.find((p) => p.id === s.doc.activePageId)?.nodes ?? [];
}

function makeText(name: string, text: string): DesignNode {
  const n = defaultNode("text", 0, 0);
  n.name = name;
  n.text = text;
  n.w = 100;
  return n;
}

beforeEach(() => seedDoc([]));

describe("findMatches", () => {
  it("finds matches in names and text, case-insensitively", () => {
    seedDoc([
      makeText("Header Bar", "Welcome home"),
      makeText("card", "HEADER note"),
    ]);
    const m = findMatches(useEditor.getState().doc, "header");
    expect(m.length).toBe(2);
    expect(m.map((x) => x.kind).sort()).toEqual(["name", "text"]);
  });

  it("returns nothing for empty or no-hit queries", () => {
    seedDoc([makeText("a", "b")]);
    expect(findMatches(useEditor.getState().doc, "")).toEqual([]);
    expect(findMatches(useEditor.getState().doc, "zzz")).toEqual([]);
  });
});

describe("replaceAll", () => {
  it("replaces in names and text and reports the count", () => {
    seedDoc([
      makeText("Header", "old text here"),
      makeText("body", "old old old"),
    ]);
    const n = replaceAll("old", "new");
    expect(n).toBe(2);
    const nodes = activeNodes();
    expect(nodes[0].text).toBe("new text here");
    expect(nodes[1].text).toBe("new new new");
  });

  it("collapses the whole replacement into one undo step", () => {
    seedDoc([makeText("a", "old one"), makeText("b", "old two")]);
    const before = useEditor.getState().past.length;
    replaceAll("old", "new");
    const after = useEditor.getState().past.length;
    expect(after - before).toBeLessThanOrEqual(1);
    useEditor.getState().undo();
    expect(activeNodes()[0].text).toBe("old one");
    expect(activeNodes()[1].text).toBe("old two");
  });

  it("is case-insensitive by default and case-sensitive on demand", () => {
    seedDoc([makeText("Mix", "Foo foo FOO")]);
    replaceAll("foo", "bar");
    expect(activeNodes()[0].text).toBe("bar bar bar");
    seedDoc([makeText("Mix", "Foo foo FOO")]);
    replaceAll("foo", "bar", true);
    expect(activeNodes()[0].text).toBe("Foo bar FOO");
  });

  it("does nothing on empty query", () => {
    seedDoc([makeText("a", "old")]);
    expect(replaceAll("", "x")).toBe(0);
    expect(activeNodes()[0].text).toBe("old");
  });
});

describe("gotoMatch", () => {
  it("selects the matched node", () => {
    const n = makeText("FindMe", "hello");
    seedDoc([n]);
    gotoMatch(n.id);
    expect(useEditor.getState().selectedIds).toEqual([n.id]);
  });
});
