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

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name: name.trim() || "Untitled project",
      createdAt: Date.now(),
    });
    return projectId;
  },
});
