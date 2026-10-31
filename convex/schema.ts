import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const loanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
  v.literal("cancelled"),
);

const notificationType = v.union(
  v.literal("request_created"),
  v.literal("request_approved"),
  v.literal("request_declined"),
  v.literal("loan_returned"),
  v.literal("request_cancelled_by_borrower"),
  v.literal("request_cancelled_by_owner"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    // Roles are provisioned only by trusted server-side functions.
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  loans: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatus,
  })
    .index("by_tool", ["toolId"])
    .index("by_owner", ["ownerId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status", ["status"]),

  // Outbox for Convex -> n8n. The event index makes queueing an event idempotent.
  deliveries: defineTable({
    eventId: v.string(),
    type: notificationType,
    loanId: v.id("loans"),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_status", ["status"]),

  // n8n -> Convex write-back. key = `${loanId}:${day}` makes retries harmless.
  reminders: defineTable({
    key: v.string(),
    loanId: v.id("loans"),
    day: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    channel: v.string(),
  }).index("by_key", ["key"]),

  workflowErrors: defineTable({
    executionId: v.string(),
    workflow: v.string(),
    node: v.string(),
    message: v.string(),
  }).index("by_execution", ["executionId"]),
});
