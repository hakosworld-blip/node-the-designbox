import { beforeEach, describe, expect, it } from "vitest";
// In-memory IndexedDB so tests exercise real IDB semantics.
import "fake-indexeddb/auto";
import {
  deleteFileLocal,
  listFilesLocal,
  loadFileLocal,
  saveFileLocal,
} from "./localStore";

beforeEach(async () => {
  const dbs = await indexedDB.databases();
  for (const d of dbs) {
    if (d.name === "node-designs") indexedDB.deleteDatabase("node-designs");
  }
});

const DOC = {
  background: "#101012",
  activePageId: "p1",
  pages: [{ id: "p1", name: "Page 1", nodes: [] }],
};

describe("localStore (device IndexedDB persistence)", () => {
  it("round-trips a saved file", async () => {
    await saveFileLocal("file-1", "Checkout flow", DOC);
    const loaded = await loadFileLocal("file-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe("file-1");
    expect(loaded!.name).toBe("Checkout flow");
    expect(loaded!.doc).toEqual(DOC);
    expect(typeof loaded!.savedAt).toBe("number");
  });

  it("returns null for files never saved on this device", async () => {
    expect(await loadFileLocal("missing")).toBeNull();
  });

  it("overwrites on re-save (last write wins) and updates savedAt", async () => {
    await saveFileLocal("file-1", "v1", DOC);
    const first = (await loadFileLocal("file-1"))!.savedAt;
    await new Promise((r) => setTimeout(r, 5));
    await saveFileLocal("file-1", "v2 name", {
      ...DOC,
      pages: [{ id: "p1", name: "Page 1", nodes: [] }],
    });
    const second = await loadFileLocal("file-1");
    expect(second!.name).toBe("v2 name");
    expect(second!.savedAt).toBeGreaterThanOrEqual(first);
    // Exactly one row — put() upserts by keyPath id.
    expect(await listFilesLocal()).toHaveLength(1);
  });

  it("lists files newest-first", async () => {
    await saveFileLocal("old", "Old", DOC);
    await new Promise((r) => setTimeout(r, 5));
    await saveFileLocal("new", "New", DOC);
    const rows = await listFilesLocal();
    expect(rows.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("deletes a file and leaves others intact", async () => {
    await saveFileLocal("a", "A", DOC);
    await saveFileLocal("b", "B", DOC);
    await deleteFileLocal("a");
    expect(await loadFileLocal("a")).toBeNull();
    expect(await loadFileLocal("b")).not.toBeNull();
  });

  it("deleteFileLocal resolves even when the key does not exist", async () => {
    await expect(deleteFileLocal("ghost")).resolves.toBeUndefined();
  });

  it("stores arbitrary doc JSON (DesignDoc is v.any in the schema)", async () => {
    const weird = { ...DOC, pages: [{ id: "p1", name: "P", nodes: [{ id: "n1", type: "rect", fill: "#000" }] }] };
    await saveFileLocal("w", "Weird", weird);
    expect((await loadFileLocal("w"))!.doc).toEqual(weird);
  });
});
