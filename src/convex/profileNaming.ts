// Pure display-name derivation from an email local part. Kept free of Convex
// imports so it can be unit-tested directly and reused anywhere.

/** Longest word fragment we keep from a camelCase/digit-glued token. */
const MAX_NAME = 60;

export function displayNameFromEmail(email: string): string {
  let local = email.split("@")[0] ?? "";
  // Drop plus-addressing tags: "sam+news" is just "sam".
  local = local.split("+")[0] ?? local;
  const words = local
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    // Strip trailing digit suffixes from the final token ("bear67" → "bear",
    // "designer42" → "designer"); digits elsewhere stay ("4kteam").
    .map((w, i, arr) => (i === arr.length - 1 ? w.replace(/\d+$/, "") : w))
    // Drop tokens that are now empty or were pure digits ("67").
    .filter((w) => w && !/^\d+$/.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const name = words.join(" ").trim();
  return name.slice(0, MAX_NAME) || "User";
}
