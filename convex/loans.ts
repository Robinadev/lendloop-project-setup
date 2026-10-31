import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { assertDate, assertNoOverlap, requireUser, text, today } from "./lib";
import { queueNotification } from "./notifications";

const MAX_DAYS = 60;
const loanStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
  v.literal("cancelled"),
);

export const loanSummaryValidator = v.object({
  _id: v.id("loans"),
  toolName: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  status: loanStatusValidator,
  ownerName: v.string(),
  borrowerName: v.string(),
  overdue: v.boolean(),
});

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  returns: v.id("loans"),
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const me = await requireUser(ctx);
    assertDate(startDate);
    assertDate(endDate);
    if (endDate < startDate) throw new ConvexError("End date must be on or after the start date");
    if (startDate < today()) throw new ConvexError("Start date can't be in the past");
    const durationDays = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
    if (durationDays > MAX_DAYS) throw new ConvexError(`Loans are limited to ${MAX_DAYS} days`);

    const tool = await ctx.db.get(toolId);
    if (!tool || tool.archivedAt) throw new ConvexError("Tool not found or no longer listed");
    if (tool.ownerId === me._id) throw new ConvexError("That's your own tool");
    await assertNoOverlap(ctx, toolId, startDate, endDate);

    const existing = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
    if (existing.some((loan) =>
      loan.borrowerId === me._id &&
      loan.status === "pending" &&
      loan.startDate <= endDate &&
      loan.endDate >= startDate
    )) {
      throw new ConvexError("You already have a pending request for overlapping dates");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: me._id,
      startDate,
      endDate,
      status: "pending",
    });
    await queueNotification(ctx, loanId, "request_created");
    return loanId;
  },
});

export const decide = mutation({
  args: { loanId: v.id("loans"), approve: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { loanId, approve }) => {
    const me = await requireUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan || loan.ownerId !== me._id) throw new ConvexError("Not allowed");
    if (loan.status !== "pending") throw new ConvexError("This request was already handled");
    if (approve) await assertNoOverlap(ctx, loan.toolId, loan.startDate, loan.endDate);
    await ctx.db.patch(loanId, { status: approve ? "approved" : "declined" });
    await queueNotification(ctx, loanId, approve ? "request_approved" : "request_declined");
    return null;
  },
});

export const cancelRequest = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan || loan.borrowerId !== me._id) throw new ConvexError("Not allowed");
    if (loan.status !== "pending") throw new ConvexError("Only pending requests can be cancelled");
    await ctx.db.patch(loanId, { status: "cancelled" });
    await queueNotification(ctx, loanId, "request_cancelled_by_borrower");
    return null;
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan || loan.ownerId !== me._id) throw new ConvexError("Not allowed");
    if (loan.status === "returned") return null;
    if (loan.status !== "approved") throw new ConvexError("Only approved loans can be marked returned");
    await ctx.db.patch(loanId, { status: "returned" });
    await queueNotification(ctx, loanId, "loan_returned");
    return null;
  },
});

export async function view(ctx: QueryCtx, loans: Doc<"loans">[]) {
  const day = today();
  return Promise.all(
    loans.map(async (loan) => {
      const [tool, owner, borrower] = await Promise.all([
        ctx.db.get(loan.toolId),
        ctx.db.get(loan.ownerId),
        ctx.db.get(loan.borrowerId),
      ]);
      return {
        _id: loan._id,
        toolName: tool?.name ?? "(removed tool)",
        startDate: loan.startDate,
        endDate: loan.endDate,
        status: loan.status,
        ownerName: owner?.name ?? "Neighbor",
        borrowerName: borrower?.name ?? "Neighbor",
        overdue: loan.status === "approved" && loan.endDate < day,
      };
    }),
  );
}

export const myRequests = query({
  args: {},
  returns: v.array(loanSummaryValidator),
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", me._id))
      .order("desc")
      .take(100);
    return view(ctx, loans);
  },
});

export const incoming = query({
  args: {},
  returns: v.array(loanSummaryValidator),
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", me._id))
      .order("desc")
      .take(100);
    return view(ctx, loans);
  },
});

// These internal functions are called only by signed n8n HTTP endpoints.
export const overdue = internalQuery({
  args: {},
  returns: v.array(v.object({
    loanId: v.string(),
    day: v.string(),
    toolName: v.string(),
    endDate: v.string(),
    daysOverdue: v.number(),
    borrower: v.object({ name: v.string(), email: v.string() }),
  })),
  handler: async (ctx) => {
    const day = today();
    const approved = await ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
    const reminders = await ctx.db.query("reminders").withIndex("by_key").collect();
    const sentToday = new Set(reminders.filter((item) => item.day === day && item.status === "sent").map((item) => item.key));
    const out = [];

    for (const loan of approved) {
      if (loan.endDate >= day || sentToday.has(`${loan._id}:${day}`)) continue;
      const [tool, borrower] = await Promise.all([ctx.db.get(loan.toolId), ctx.db.get(loan.borrowerId)]);
      if (!borrower) continue;
      out.push({
        loanId: loan._id as string,
        day,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        daysOverdue: Math.floor((Date.parse(day) - Date.parse(loan.endDate)) / 86_400_000),
        borrower: { name: borrower.name, email: borrower.email },
      });
    }
    return out;
  },
});

export const recordReminder = internalMutation({
  args: {
    loanId: v.id("loans"),
    day: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    channel: v.string(),
  },
  returns: v.object({ ok: v.boolean(), duplicate: v.boolean() }),
  handler: async (ctx, { loanId, day, status, channel }) => {
    assertDate(day);
    if (day > today()) throw new ConvexError("Reminder date cannot be in the future");
    const loan = await ctx.db.get(loanId);
    if (!loan || loan.status !== "approved" || loan.endDate >= day) throw new ConvexError("Loan is not overdue for that date");

    const key = `${loanId}:${day}`;
    const existing = await ctx.db.query("reminders").withIndex("by_key", (q) => q.eq("key", key)).unique();
    const cleanChannel = text("Channel", channel, 32);
    if (existing) {
      if (existing.status === "failed" && status === "sent") {
        await ctx.db.patch(existing._id, { status, channel: cleanChannel });
      }
      return { ok: true, duplicate: true };
    }
    await ctx.db.insert("reminders", { key, loanId, day, status, channel: cleanChannel });
    return { ok: true, duplicate: false };
  },
});

export const recordWorkflowError = internalMutation({
  args: { executionId: v.string(), workflow: v.string(), node: v.string(), message: v.string() },
  returns: v.object({ ok: v.boolean(), duplicate: v.boolean() }),
  handler: async (ctx, input) => {
    const executionId = text("Execution ID", input.executionId, 64);
    const workflow = text("Workflow", input.workflow, 120);
    const node = text("Node", input.node, 120, 0);
    const message = text("Error message", input.message, 500);
    const duplicate = await ctx.db
      .query("workflowErrors")
      .withIndex("by_execution", (q) => q.eq("executionId", executionId))
      .first();
    if (!duplicate) await ctx.db.insert("workflowErrors", { executionId, workflow, node, message });
    return { ok: true, duplicate: Boolean(duplicate) };
  },
});
