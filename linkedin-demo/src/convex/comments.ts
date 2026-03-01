import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    authorId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: args.authorId,
      body: args.body,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.postId, {
      commentsCount: post.commentsCount + 1,
    });

    await ctx.runMutation(internal.notifications.createNotification, {
      userId: post.authorId,
      type: "comment",
      fromUserId: args.authorId,
      postId: args.postId,
    });
  },
});

export const listComments = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .collect();

    const sortedComments = [...comments].sort((a, b) => a.createdAt - b.createdAt);

    return await Promise.all(
      sortedComments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          author: author
            ? {
                displayName: author.displayName ?? author.name ?? "Guest User",
                photoURL: author.photoURL ?? author.image ?? "",
                title: author.title ?? "",
              }
            : null,
        };
      }),
    );
  },
});
