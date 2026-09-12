import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("folders")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string(), folderId: v.optional(v.id("folders")) },
  handler: async (ctx, { name, folderId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name: name.trim() || "Untitled project",
      folderId: folderId ?? undefined,
      createdAt: Date.now(),
    });
    return projectId;
  },
});

export const createFolder = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const folderId = await ctx.db.insert("folders", {
      ownerId: user._id,
      name: name.trim() || "New folder",
      createdAt: Date.now(),
    });
    return folderId;
  },
});

export const renameFolder = mutation({
  args: { id: v.id("folders"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const folder = await ctx.db.get(id);
    if (!folder || folder.ownerId !== user._id) throw new Error("Not found");
    await ctx.db.patch(id, { name: name.trim() || folder.name });
  },
});

/** Delete a folder. Projects inside are moved out (unfiled), never deleted. */
export const deleteFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const folder = await ctx.db.get(id);
    if (!folder || folder.ownerId !== user._id) throw new Error("Not found");
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const p of projects) {
      if (p.folderId === id) await ctx.db.patch(p._id, { folderId: undefined });
    }
    await ctx.db.delete(id);
  },
});

export const rename = mutation({
  args: { id: v.id("projects"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const project = await ctx.db.get(id);
    if (!project || project.ownerId !== user._id) throw new Error("Not found");
    await ctx.db.patch(id, { name: name.trim() || project.name });
  },
});

/** Move a project into a folder (or out of one when folderId is null). */
export const moveToFolder = mutation({
  args: { id: v.id("projects"), folderId: v.optional(v.id("folders")) },
  handler: async (ctx, { id, folderId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const project = await ctx.db.get(id);
    if (!project || project.ownerId !== user._id) throw new Error("Not found");
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.ownerId !== user._id)
        throw new Error("Folder not found");
    }
    await ctx.db.patch(id, { folderId: folderId ?? undefined });
  },
});

/** Delete a project and every design file inside it. */
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const project = await ctx.db.get(id);
    if (!project || project.ownerId !== user._id) throw new Error("Not found");

    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const f of files) {
      const versions = await ctx.db
        .query("docVersions")
        .withIndex("by_file", (q) => q.eq("fileId", f._id))
        .collect();
      for (const vRow of versions) await ctx.db.delete(vRow._id);
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_file", (q) => q.eq("fileId", f._id))
        .collect();
      for (const c of comments) await ctx.db.delete(c._id);
      const presence = await ctx.db
        .query("presence")
        .withIndex("by_file", (q) => q.eq("fileId", f._id))
        .collect();
      for (const pr of presence) await ctx.db.delete(pr._id);
      await ctx.db.delete(f._id);
    }
    await ctx.db.delete(id);
  },
});
