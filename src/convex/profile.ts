import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { displayNameFromEmail } from "./profileNaming";

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

/**
 * Split the local part of an email into name-like words: "full.bear67" →
 * "Full Bear", "jane_doe-dev" → "Jane Doe Dev". See profileNaming.ts for
 * the full, unit-tested rules.
 */

/**
 * One-time bootstrap: if the signed-in user has no display name yet and has
 * an email, derive a human-friendly name from the email ("full.bear67@…" →
 * "Full Bear") and store it. Idempotent — safe to call on every app load.
 *
 * The derivation rules live in profileNaming.ts (unit-tested there).
 */
export const ensureDisplayName = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if ((user.name ?? "").trim()) return user.name; // already named — never overwrite
    const email = user.email ?? "";
    if (!email) return null; // anonymous guests keep no auto name
    const name = displayNameFromEmail(email);
    if (!name) return null;
    await ctx.db.patch(user._id, {
      name,
      displayNameFromEmail: true,
    });
    return name;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => await getCurrentUser(ctx),
});
