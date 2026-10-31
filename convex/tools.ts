import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CATEGORIES, CONDITIONS } from "./constants";
import { isOnLoan, requireUser, text } from "./lib";
import { queueNotification } from "./notifications";

const fields = {
  name: v.string(),
  category: v.string(),
  condition: v.string(),
  description: v.string(),
};

const cleanTool = (input: { name: string; category: string; condition: string; description: string }) => {
  if (!(CATEGORIES as readonly string[]).includes(input.category)) throw new ConvexError("Unknown category");
  if (!(CONDITIONS as readonly string[]).includes(input.condition)) throw new ConvexError("Unknown condition");
  return {
    name: text("Name", input.name, 60),
    category: input.category,
    condition: input.condition,
    description: text("Description", input.description, 280),
  };
};

const publicToolValidator = v.object({ key: v.string(), name: v.string(), category: v.string() });
const browseToolValidator = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: v.string(),
  condition: v.string(),
  description: v.string(),
  ownerName: v.string(),
  ownerTrusted: v.boolean(),
  mine: v.boolean(),
  available: v.boolean(),
});
const ownedToolValidator = v.object({
  _id: v.id("tools"),
  name: v.string(),
  category: v.string(),
  condition: v.string(),
  description: v.string(),
  available: v.boolean(),
});

/** Public: name + category of currently available tools only. No people or descriptions. */
export const listPublic = query({
  args: {},
  returns: v.array(publicToolValidator),
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").order("desc").take(200);
    const available = [];
    for (const tool of tools) {
      if (!tool.archivedAt && !(await isOnLoan(ctx, tool._id))) {
        available.push({ key: tool._id as string, name: tool.name, category: tool.category });
      }
    }
    return available;
  },
});

export const listAll = query({
  args: { category: v.optional(v.string()) },
  returns: v.array(browseToolValidator),
  handler: async (ctx, { category }) => {
    const me = await requireUser(ctx);
    const allTools = category
      ? await ctx.db.query("tools").withIndex("by_category", (q) => q.eq("category", category)).order("desc").take(300)
      : await ctx.db.query("tools").order("desc").take(300);
    const tools = allTools.filter((tool) => !tool.archivedAt);
    return Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          ownerName: owner?.name ?? "Neighbor",
          ownerTrusted: owner?.trustedLender ?? false,
          mine: tool.ownerId === me._id,
          available: !(await isOnLoan(ctx, tool._id)),
        };
      }),
    );
  },
});

export const mine = query({
  args: {},
  returns: v.array(ownedToolValidator),
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", me._id))
      .order("desc")
      .take(200);
    return Promise.all(
      tools.filter((tool) => !tool.archivedAt).map(async (tool) => ({
        _id: tool._id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        description: tool.description,
        available: !(await isOnLoan(ctx, tool._id)),
      })),
    );
  },
});

export const create = mutation({
  args: fields,
  returns: v.id("tools"),
  handler: async (ctx, input) => {
    const me = await requireUser(ctx);
    return ctx.db.insert("tools", { ownerId: me._id, ...cleanTool(input) });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...fields },
  returns: v.null(),
  handler: async (ctx, { toolId, ...input }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool || tool.ownerId !== me._id || tool.archivedAt) throw new ConvexError("Not allowed");
    await ctx.db.patch(toolId, cleanTool(input));
    return null;
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) return null;
    if (tool.ownerId !== me._id && me.role !== "admin") throw new ConvexError("Not allowed");
    if (tool.archivedAt) return null;

    const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
    if (loans.some((loan) => loan.status === "approved")) {
      throw new ConvexError("This tool is out on loan. Mark it returned first");
    }

    for (const loan of loans) {
      if (loan.status === "pending") {
        await ctx.db.patch(loan._id, { status: "cancelled" });
        await queueNotification(ctx, loan._id, "request_cancelled_by_owner");
      }
    }

    // Keep the listing document so historical loan records retain their tool name.
    await ctx.db.patch(toolId, { archivedAt: Date.now() });
    return null;
  },
});
