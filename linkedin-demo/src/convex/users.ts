import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getFeaturedUser = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.find((user) => user.isFeatured) ?? null;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return [...users]
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((user) => ({
        _id: user._id,
        displayName: user.displayName,
        photoURL: user.photoURL,
        title: user.title,
        location: user.location,
        connections: user.connections,
      }));
  },
});
