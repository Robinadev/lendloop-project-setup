import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib";
import { loanSummaryValidator, view } from "./loans";

export const overview = query({
  args: {},
  returns: v.object({
    loans: v.array(loanSummaryValidator),
    users: v.array(v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: v.union(v.literal("admin"), v.literal("user")),
      trustedLender: v.boolean(),
    })),
    failedDeliveries: v.array(v.object({
      _id: v.id("deliveries"),
      eventId: v.string(),
      type: v.string(),
      attempts: v.number(),
      lastError: v.optional(v.string()),
    })),
    workflowErrors: v.array(v.object({
      _id: v.id("workflowErrors"),
      executionId: v.string(),
      workflow: v.string(),
      node: v.string(),
      message: v.string(),
    })),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await view(ctx, await ctx.db.query("loans").order("desc").take(200));
    const users = (await ctx.db.query("users").order("desc").take(500)).map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      trustedLender: user.trustedLender,
    }));
    const failedDeliveries = (await ctx.db
      .query("deliveries")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(50))
      .map(({ _id, eventId, type, attempts, lastError }) => ({ _id, eventId, type, attempts, lastError }));
    const workflowErrors = (await ctx.db.query("workflowErrors").order("desc").take(20)).map(
      ({ _id, executionId, workflow, node, message }) => ({ _id, executionId, workflow, node, message }),
    );
    return { loans, users, failedDeliveries, workflowErrors };
  },
});
