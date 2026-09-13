import { describe, expect, it } from "vitest";
import { displayNameFromEmail } from "./profileNaming";

describe("displayNameFromEmail", () => {
  it("splits dots into words and title-cases, dropping digit tails", () => {
    expect(displayNameFromEmail("full.bear67@gmail.com")).toBe("Full Bear");
  });

  it("handles underscores, plus, and hyphens", () => {
    expect(displayNameFromEmail("jane_doe-dev@mail.com")).toBe("Jane Doe Dev");
    expect(displayNameFromEmail("sam+news@mail.com")).toBe("Sam");
  });

  it("splits camelCase local parts", () => {
    expect(displayNameFromEmail("JaneDoe@mail.com")).toBe("Jane Doe");
  });

  it("keeps digits glued to non-final words", () => {
    expect(displayNameFromEmail("4k.team@mail.com")).toBe("4k Team");
  });

  it("falls back to User for unusable local parts", () => {
    expect(displayNameFromEmail("12345@mail.com")).toBe("User");
    expect(displayNameFromEmail("...@mail.com")).toBe("User");
  });

  it("caps length at 60 chars", () => {
    const long = "a".repeat(80);
    expect(displayNameFromEmail(long + "@mail.com").length).toBeLessThanOrEqual(60);
  });
});
