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
      .sort((a, b) => (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? ""))
      .map((user) => ({
        _id: user._id,
        displayName: user.displayName ?? user.name ?? "Guest User",
        photoURL: user.photoURL ?? user.image ?? "",
        title: user.title ?? "",
        location: user.location ?? "",
        connections: user.connections ?? 0,
      }));
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = args.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    return [...users]
      .filter((user) =>
        (user.displayName ?? user.name ?? "").toLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? ""))
      .slice(0, 10)
      .map((user) => ({
        _id: user._id,
        displayName: user.displayName ?? user.name ?? "Guest User",
        photoURL: user.photoURL ?? user.image ?? "",
        title: user.title ?? "",
      }));
  },
});
