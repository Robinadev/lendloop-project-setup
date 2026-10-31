import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin, text } from "./lib";

const profileValidator = v.object({
  _id: v.id("users"),
  name: v.string(),
  role: v.union(v.literal("admin"), v.literal("user")),
  trustedLender: v.boolean(),
});

/** Called after sign-in. The role is always assigned server-side. */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Sign in required");
    if (!identity.email) throw new ConvexError("The Clerk convex JWT template must include an email claim");
    if (identity.email_verified !== true && identity.email_verified !== "true") {
      throw new ConvexError("Verify your email address with Clerk before using LendLoop");
    }

    const email = text("Email", identity.email, 254).toLowerCase();
    const name = text("Name", identity.name ?? email, 80);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      if (existing.name !== name || existing.email !== email) await ctx.db.patch(existing._id, { name, email });
      return existing._id;
    }

    return ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

export const me = query({
  args: {},
  returns: v.union(v.null(), profileValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    return user ? { _id: user._id, name: user.name, role: user.role, trustedLender: user.trustedLender } : null;
  },
});

export const setTrusted = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");
    await ctx.db.patch(userId, { trustedLender: trusted });
    return null;
  },
});

/** Operator-only bootstrap. A user must sign in once before promotion. */
export const promoteToAdmin = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const normalizedEmail = text("Email", email, 254).toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (!user) throw new ConvexError("The user must sign in once before promotion");
    await ctx.db.patch(user._id, { role: "admin" });
    return null;
  },
});
