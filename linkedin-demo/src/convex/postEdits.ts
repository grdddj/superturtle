import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const canViewConnectionsOnlyPostEdits = async (
  ctx: QueryCtx,
  viewerId: Id<"users">,
  authorId: Id<"users">,
) => {
  if (viewerId === authorId) {
    return true;
  }

  const [viewerRequestedConnection, viewerReceivedConnection] = await Promise.all([
    ctx.db
      .query("connections")
      .withIndex("byUsers", (q) => q.eq("userId1", viewerId).eq("userId2", authorId))
      .first(),
    ctx.db
      .query("connections")
      .withIndex("byUsers", (q) => q.eq("userId1", authorId).eq("userId2", viewerId))
      .first(),
  ]);

  return (
    viewerRequestedConnection?.status === "accepted" ||
    viewerReceivedConnection?.status === "accepted"
  );
};

export const getEditHistory = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return [];
    }

    if (post.visibility === "connections") {
      if (!viewerId) {
        return [];
      }

      const canView = await canViewConnectionsOnlyPostEdits(
        ctx,
        viewerId,
        post.authorId,
      );

      if (!canView) {
        return [];
      }
    }

    const edits = await ctx.db
      .query("postEdits")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .collect();

    return edits.sort((a, b) => b.editedAt - a.editedAt);
  },
});
