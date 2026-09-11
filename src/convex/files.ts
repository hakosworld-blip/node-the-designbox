import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/** Auto-snapshot a doc version at most every 2 minutes (plus explicit saves). */
const VERSION_INTERVAL_MS = 2 * 60 * 1000;

export const recent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const files = await ctx.db
      .query("files")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return files.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    template: v.string(), // "blank" | "mobile" | "web" — doc built client-side
    doc: v.any(),
  },
  handler: async (ctx, { projectId, name, doc }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const now = Date.now();
    const fileId = await ctx.db.insert("files", {
      ownerId: user._id,
      projectId,
      name: name.trim() || "Untitled",
      doc,
      version: 1,
      lastVersionAt: now,
      starred: false,
      trashed: false,
      published: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("docVersions", {
      fileId,
      version: 1,
      doc,
      label: "Created",
      createdAt: now,
    });
    return fileId;
  },
});

/** Live multiplayer doc update — called ~throttled from the editor. */
export const updateDoc = mutation({
  args: { id: v.id("files"), doc: v.any() },
  handler: async (ctx, { id, doc }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const file = await ctx.db.get(id);
    if (!file) throw new Error("File not found");
    const now = Date.now();
    const version = file.version + 1;
    await ctx.db.patch(id, { doc, version, updatedAt: now });
    // Automatic cloud versioning
    if ((file.lastVersionAt ?? 0) < now - VERSION_INTERVAL_MS) {
      await ctx.db.insert("docVersions", {
        fileId: id,
        version,
        doc,
        label: "Auto-saved",
        createdAt: now,
      });
      await ctx.db.patch(id, { lastVersionAt: now });
    }
    return version;
  },
});

export const rename = mutation({
  args: { id: v.id("files"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await ctx.db.patch(id, { name: name.trim() || "Untitled", updatedAt: Date.now() });
  },
});

export const setStarred = mutation({
  args: { id: v.id("files"), starred: v.boolean() },
  handler: async (ctx, { id, starred }) => {
    await ctx.db.patch(id, { starred });
  },
});

export const trash = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { trashed: true, updatedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { trashed: false, updatedAt: Date.now() });
  },
});

export const removeForever = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    const versions = await ctx.db
      .query("docVersions")
      .withIndex("by_file", (q) => q.eq("fileId", id))
      .collect();
    for (const vRow of versions) await ctx.db.delete(vRow._id);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_file", (q) => q.eq("fileId", id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_file", (q) => q.eq("fileId", id))
      .collect();
    for (const p of presence) await ctx.db.delete(p._id);
    await ctx.db.delete(id);
  },
});

export const publish = mutation({
  args: {
    id: v.id("files"),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { id, description, tags }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    await ctx.db.patch(id, {
      published: true,
      description,
      tags,
      authorName: user.name ?? user.email ?? "Anonymous",
      publishedAt: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { published: false });
  },
});

/** Remix: copy any published file's doc into the caller's workspace. */
export const duplicate = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const source = await ctx.db.get(id);
    if (!source || source.trashed) throw new Error("File not found");

    // The remixing user's default project (same bootstrap the Dashboard uses).
    const project = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();
    if (!project) throw new Error("Create a workspace first");

    const now = Date.now();
    const fileId = await ctx.db.insert("files", {
      ownerId: user._id,
      projectId: project._id,
      name: `${source.name} (remix)`,
      doc: source.doc,
      version: 1,
      lastVersionAt: now,
      starred: false,
      trashed: false,
      published: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("docVersions", {
      fileId,
      version: 1,
      doc: source.doc,
      label: `Remixed from "${source.name}"`,
      createdAt: now,
    });
    return fileId;
  },
});

/** Public catalog of published, non-trashed files. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    return files
      .filter((f) => !f.trashed)
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  },
});

export const listVersions = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const rows = await ctx.db
      .query("docVersions")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  },
});

export const snapshot = mutation({
  args: { id: v.id("files"), label: v.string() },
  handler: async (ctx, { id, label }) => {
    const file = await ctx.db.get(id);
    if (!file) throw new Error("File not found");
    const now = Date.now();
    await ctx.db.insert("docVersions", {
      fileId: id,
      version: file.version,
      doc: file.doc,
      label: label.trim() || "Manual save",
      createdAt: now,
    });
    await ctx.db.patch(id, { lastVersionAt: now });
  },
});

export const restoreVersion = mutation({
  args: { versionId: v.id("docVersions") },
  handler: async (ctx, { versionId }) => {
    const row = await ctx.db.get(versionId);
    if (!row) throw new Error("Version not found");
    const file = await ctx.db.get(row.fileId);
    if (!file) throw new Error("File not found");
    await ctx.db.patch(row.fileId, {
      doc: row.doc,
      version: file.version + 1,
      updatedAt: Date.now(),
    });
  },
});
