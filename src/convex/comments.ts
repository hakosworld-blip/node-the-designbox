import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const add = mutation({
  args: {
    fileId: v.id("files"),
    x: v.number(),
    y: v.number(),
    body: v.string(),
  },
  handler: async (ctx, { fileId, x, y, body }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    return await ctx.db.insert("comments", {
      fileId,
      authorId: user._id,
      authorName: user.name ?? user.email?.split("@")[0] ?? "Guest",
      body: body.trim(),
      x,
      y,
      resolved: false,
      createdAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, { id }) => {
    const comment = await ctx.db.get(id);
    if (!comment) return;
    await ctx.db.patch(id, { resolved: !comment.resolved });
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
