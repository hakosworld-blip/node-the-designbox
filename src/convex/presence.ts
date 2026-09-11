import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const PALETTE = [
  "#8b5cf6", // violet
  "#22d3ee", // cyan
  "#f59e0b", // amber
  "#34d399", // emerald
  "#f472b6", // pink
  "#facc15", // yellow
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const LIVE_WINDOW_MS = 12_000;

export const heartbeat = mutation({
  args: {
    fileId: v.id("files"),
    x: v.number(),
    y: v.number(),
    selection: v.array(v.string()),
  },
  handler: async (ctx, { fileId, x, y, selection }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const name = user.name ?? user.email?.split("@")[0] ?? "Guest";
    const color = PALETTE[hash(user._id) % PALETTE.length];

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect()
      .then((rows) => rows.find((r) => r.userId === user._id));

    if (existing) {
      await ctx.db.patch(existing._id, {
        x,
        y,
        selection,
        name,
        color,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("presence", {
        fileId,
        userId: user._id,
        name,
        color,
        x,
        y,
        selection,
        updatedAt: Date.now(),
      });
    }
  },
});

export const leave = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    for (const row of rows) {
      if (row.userId === user._id) await ctx.db.delete(row._id);
    }
  },
});

export const list = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect();
    const now = Date.now();
    return rows.filter((r) => now - r.updatedAt < LIVE_WINDOW_MS);
  },
});
