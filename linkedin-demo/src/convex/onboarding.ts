import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const normalizeRequiredField = (value: string, fieldName: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmedValue;
};

export const completeOnboarding = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    title: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedUsername = normalizeUsername(args.username);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      throw new Error("Username must be lowercase letters, numbers, and hyphens only");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalizedUsername))
      .unique();

    if (existingUser && existingUser._id !== userId) {
      throw new Error("Username is already taken");
    }

    await ctx.db.patch(userId, {
      username: normalizedUsername,
      displayName: normalizeRequiredField(args.displayName, "Display name"),
      title: args.title.trim(),
      location: args.location.trim(),
    });

    return await ctx.db.get(userId);
  },
});
