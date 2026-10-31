import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const today = () => new Date().toISOString().slice(0, 10);

export function assertDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ConvexError("Dates must use YYYY-MM-DD format");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ConvexError("Enter a valid calendar date");
  }
}

export function text(label: string, value: string, max: number, min = 1) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ConvexError(`${label} must be ${min}-${max} characters`);
  }
  return trimmed;
}

/** Authentication: who is calling. Throws if signed out or not provisioned. */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Sign in required");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError("Account not set up yet");
  return user;
}

/** Authorization: role is read from the database, never from client input. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new ConvexError("Admins only");
  return user;
}

/** An approved loan remains active until the owner records its return. */
export async function isOnLoan(ctx: QueryCtx, toolId: Id<"tools">) {
  const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
  const day = today();
  return loans.some((loan) => loan.status === "approved" && loan.startDate <= day);
}

export async function assertNoOverlap(ctx: QueryCtx, toolId: Id<"tools">, start: string, end: string) {
  const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
  const overlaps = loans.some(
    (loan) => loan.status === "approved" && loan.startDate <= end && loan.endDate >= start,
  );
  if (overlaps) throw new ConvexError("Those dates overlap an approved loan");
}
