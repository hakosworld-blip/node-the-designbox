import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Public catalog metadata for published files. Doc bodies are fetched
 * separately by the client to keep this query light.
 */
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("files")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();

    return rows
      .filter((f) => !f.trashed)
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
      .map((f) => ({
        _id: f._id,
        name: f.name,
        description: f.description,
        tags: f.tags,
        authorName: f.authorName,
        publishedAt: f.publishedAt,
        updatedAt: f.updatedAt,
      }));
  },
});
