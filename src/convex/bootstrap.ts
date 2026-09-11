import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

/** Mutation so Convex purity rules are respected (no writes in queries). */
export const ensureUserWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();

    if (existing) return existing._id;

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name: "My designs",
      createdAt: Date.now(),
    });
    return projectId;
  },
});
