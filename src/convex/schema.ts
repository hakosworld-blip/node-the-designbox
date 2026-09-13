import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      displayNameFromEmail: v.optional(v.boolean()), // true when name was auto-derived from the email
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ---- DesignBox ----

    folders: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      createdAt: v.number(),
    }).index("by_owner", ["ownerId"]),

    projects: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      folderId: v.optional(v.id("folders")),
      createdAt: v.number(),
    }).index("by_owner", ["ownerId"]),

    files: defineTable({
      ownerId: v.id("users"),
      projectId: v.id("projects"),
      name: v.string(),
      doc: v.any(), // DesignDoc — validated in app code
      version: v.number(), // bumped on every doc change
      lastVersionAt: v.optional(v.number()), // last time a doc version was snapshotted
      starred: v.boolean(),
      trashed: v.boolean(),
      published: v.boolean(),
      description: v.optional(v.string()),
      tags: v.array(v.string()),
      authorName: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_owner", ["ownerId"])
      .index("by_project", ["projectId"])
      .index("by_published", ["published"]),

    docVersions: defineTable({
      fileId: v.id("files"),
      version: v.number(),
      doc: v.any(),
      label: v.string(),
      createdAt: v.number(),
    }).index("by_file", ["fileId"]),

    comments: defineTable({
      fileId: v.id("files"),
      authorId: v.id("users"),
      authorName: v.string(),
      body: v.string(),
      x: v.number(),
      y: v.number(),
      resolved: v.boolean(),
      createdAt: v.number(),
    }).index("by_file", ["fileId"]),

    presence: defineTable({
      fileId: v.id("files"),
      userId: v.id("users"),
      name: v.string(),
      color: v.string(),
      x: v.number(),
      y: v.number(),
      selection: v.array(v.string()),
      updatedAt: v.number(),
    })
      .index("by_file", ["fileId"])
      .index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
