import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * User profile fields users may edit themselves (display name for now).
 * Auth-managed fields like email remain read-only.
 */
export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name cannot be empty");
    await ctx.db.patch(user._id, { name: trimmed.slice(0, 60) });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => await getCurrentUser(ctx),
});
