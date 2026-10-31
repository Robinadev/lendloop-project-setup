import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { verify } from "./crypto";

const http = httpRouter();
const MAX_BODY_BYTES = 16 * 1024;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});
const secret = () => process.env.LENDLOOP_SHARED_SECRET;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

async function readSignedBody(req: Request) {
  const length = req.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY_BYTES) return null;
  const body = await req.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return null;
  if (!(await verify(req, body, secret()))) return undefined;
  return body;
}

http.route({
  path: "/n8n/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await verify(request, "", secret()))) return json({ error: "invalid signature" }, 401);
    return json({ loans: await ctx.runQuery(internal.loans.overdue, {}) });
  }),
});

http.route({
  path: "/n8n/reminder",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readSignedBody(request);
    if (body === null) return json({ error: "request too large" }, 413);
    if (body === undefined) return json({ error: "invalid signature" }, 401);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    if (!isRecord(parsed)) return json({ error: "invalid payload" }, 400);
    const { loanId, day, status, channel } = parsed;
    if (
      typeof loanId !== "string" ||
      typeof day !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      (status !== "sent" && status !== "failed") ||
      (channel !== undefined && (typeof channel !== "string" || channel.length > 32))
    ) {
      return json({ error: "invalid payload" }, 400);
    }
    try {
      const result = await ctx.runMutation(internal.loans.recordReminder, {
        loanId: loanId as Id<"loans">,
        day,
        status,
        channel: channel ?? "log",
      });
      return json(result);
    } catch {
      return json({ error: "rejected" }, 422);
    }
  }),
});

http.route({
  path: "/n8n/error",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await readSignedBody(request);
    if (body === null) return json({ error: "request too large" }, 413);
    if (body === undefined) return json({ error: "invalid signature" }, 401);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    if (!isRecord(parsed)) return json({ error: "invalid payload" }, 400);
    const { executionId, workflow, node, message } = parsed;
    if (
      typeof executionId !== "string" || executionId.length === 0 || executionId.length > 64 ||
      typeof workflow !== "string" || workflow.length === 0 || workflow.length > 120 ||
      (node !== undefined && (typeof node !== "string" || node.length > 120)) ||
      typeof message !== "string" || message.length === 0 || message.length > 500
    ) {
      return json({ error: "invalid payload" }, 400);
    }
    try {
      return json(await ctx.runMutation(internal.loans.recordWorkflowError, {
        executionId,
        workflow,
        node: node ?? "",
        message,
      }));
    } catch {
      return json({ error: "rejected" }, 422);
    }
  }),
});

export default http;
