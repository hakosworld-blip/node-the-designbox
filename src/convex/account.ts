import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Permanent account deletion. Requires the user to type their display name
 * as explicit consent; cascades every piece of owned data, then signs the
 * user out by removing their sessions and refresh tokens.
 */
export const deleteAccount = mutation({
  args: { consent: v.string() },
  handler: async (ctx, { consent }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Not signed in");

    // Explicit consent: the exact display name must be typed.
    const expected = (user.name ?? "").trim();
    if (!expected || consent.trim() !== expected) {
      throw new Error(
        "Consent mismatch: type your display name exactly to confirm deletion.",
      );
    }

    // 1. Delete presence rows.
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of presence) await ctx.db.delete(p._id);

    // 2. Delete files (with versions, comments, presence) and projects/folders.
    const files = await ctx.db
      .query("files")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
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
      const filePresence = await ctx.db
        .query("presence")
        .withIndex("by_file", (q) => q.eq("fileId", f._id))
        .collect();
      for (const p of filePresence) await ctx.db.delete(p._id);
      await ctx.db.delete(f._id);
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const p of projects) await ctx.db.delete(p._id);

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const f of folders) await ctx.db.delete(f._id);

    // 3. Sign out: remove refresh tokens and sessions for this user.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const s of sessions) {
      const refreshTokenId = (s as { refreshTokenId?: Id<"authRefreshTokens"> })
        .refreshTokenId;
      if (refreshTokenId) {
        const token = await ctx.db.get(refreshTokenId);
        if (token) await ctx.db.delete(token._id);
      }
      await ctx.db.delete(s._id);
    }

    // 4. Finally, delete the user record itself.
    await ctx.db.delete(userId);

    return { deleted: true };
  },
});
