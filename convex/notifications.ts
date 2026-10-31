import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./lib";
import { sign } from "./crypto";

const MAX_ATTEMPTS = 5;
export type EventType =
  | "request_created"
  | "request_approved"
  | "request_declined"
  | "loan_returned"
  | "request_cancelled_by_borrower"
  | "request_cancelled_by_owner";

const eventTypeValidator = v.union(
  v.literal("request_created"),
  v.literal("request_approved"),
  v.literal("request_declined"),
  v.literal("loan_returned"),
  v.literal("request_cancelled_by_borrower"),
  v.literal("request_cancelled_by_owner"),
);

/** Store the event transactionally, then deliver it asynchronously through the outbox. */
export async function queueNotification(ctx: MutationCtx, loanId: Id<"loans">, type: EventType) {
  const eventId = `${loanId}:${type}`;
  const existing = await ctx.db.query("deliveries").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique();
  if (existing) return;
  const deliveryId = await ctx.db.insert("deliveries", { eventId, type, loanId, status: "pending", attempts: 0 });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver, { deliveryId });
}

/** Data minimisation: n8n receives only what it needs to send one message. */
export const payload = internalQuery({
  args: { deliveryId: v.id("deliveries") },
  returns: v.union(v.null(), v.object({
    eventId: v.string(),
    type: eventTypeValidator,
    occurredAt: v.string(),
    recipient: v.object({ name: v.string(), email: v.string() }),
    counterpartName: v.string(),
    toolName: v.string(),
    loan: v.object({ id: v.string(), startDate: v.string(), endDate: v.string(), status: v.string() }),
  })),
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery || delivery.status !== "pending") return null;
    const loan = await ctx.db.get(delivery.loanId);
    if (!loan) return null;
    const [tool, owner, borrower] = await Promise.all([
      ctx.db.get(loan.toolId),
      ctx.db.get(loan.ownerId),
      ctx.db.get(loan.borrowerId),
    ]);
    const toOwner = delivery.type === "request_created" || delivery.type === "request_cancelled_by_borrower";
    const recipient = toOwner ? owner : borrower;
    const counterpart = toOwner ? borrower : owner;
    if (!recipient) return null;

    return {
      eventId: delivery.eventId,
      type: delivery.type,
      occurredAt: new Date(delivery._creationTime).toISOString(),
      recipient: { name: recipient.name, email: recipient.email },
      counterpartName: counterpart?.name ?? "a neighbor",
      toolName: tool?.name ?? "a tool",
      loan: { id: loan._id as string, startDate: loan.startDate, endDate: loan.endDate, status: loan.status },
    };
  },
});

export const deliver = internalAction({
  args: { deliveryId: v.id("deliveries") },
  returns: v.null(),
  handler: async (ctx, { deliveryId }) => {
    const payload = await ctx.runQuery(internal.notifications.payload, { deliveryId });
    if (!payload) return null;

    try {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      const secret = process.env.LENDLOOP_SHARED_SECRET;
      if (!webhookUrl || !secret) throw new Error("n8n webhook is not configured");
      const url = new URL(webhookUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("n8n URL must use HTTP or HTTPS");
      if (secret.length < 32) throw new Error("Shared secret must be at least 32 characters");

      const body = JSON.stringify(payload);
      const timestamp = String(Date.now());
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-timestamp": timestamp,
          "x-lendloop-signature": `sha256=${await sign(secret, timestamp, body)}`,
          "x-lendloop-event-id": payload.eventId,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`n8n responded ${response.status}`);
      await ctx.runMutation(internal.notifications.markResult, { deliveryId, ok: true });
    } catch (error) {
      await ctx.runMutation(internal.notifications.markResult, {
        deliveryId,
        ok: false,
        error: error instanceof Error ? error.message.slice(0, 300) : "Webhook delivery failed",
      });
    }
    return null;
  },
});

export const markResult = internalMutation({
  args: { deliveryId: v.id("deliveries"), ok: v.boolean(), error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { deliveryId, ok, error }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery || delivery.status !== "pending") return null;
    const attempts = delivery.attempts + 1;
    if (ok) {
      await ctx.db.patch(deliveryId, { status: "delivered", attempts, lastError: undefined });
      return null;
    }
    if (attempts >= MAX_ATTEMPTS) {
      await ctx.db.patch(deliveryId, { status: "failed", attempts, lastError: error });
      return null;
    }
    await ctx.db.patch(deliveryId, { attempts, lastError: error });
    await ctx.scheduler.runAfter(30_000 * 2 ** (attempts - 1), internal.notifications.deliver, { deliveryId });
    return null;
  },
});

/** Admin-only retry keeps failed events visible and prevents double scheduling. */
export const retry = mutation({
  args: { deliveryId: v.id("deliveries") },
  returns: v.null(),
  handler: async (ctx, { deliveryId }) => {
    await requireAdmin(ctx);
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery || delivery.status !== "failed") throw new ConvexError("Only failed notifications can be retried");
    await ctx.db.patch(deliveryId, { status: "pending", attempts: 0, lastError: undefined });
    await ctx.scheduler.runAfter(0, internal.notifications.deliver, { deliveryId });
    return null;
  },
});
