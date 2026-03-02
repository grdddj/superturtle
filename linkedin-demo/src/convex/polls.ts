import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MIN_POLL_OPTIONS = 2;
const MAX_POLL_OPTIONS = 4;

const normalizePollQuestion = (question: string) => {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    throw new Error("Poll question is required");
  }
  return normalizedQuestion;
};

const normalizePollOptions = (options: string[]) => {
  const normalizedOptions = options
    .map((option) => option.trim())
    .filter((option) => option.length > 0);

  if (normalizedOptions.length < MIN_POLL_OPTIONS || normalizedOptions.length > MAX_POLL_OPTIONS) {
    throw new Error("Poll must have between 2 and 4 options");
  }

  return normalizedOptions;
};

const assertValidOptionIndex = (optionIndex: number, optionCount: number) => {
  if (!Number.isInteger(optionIndex)) {
    throw new Error("Option index must be an integer");
  }

  if (optionIndex < 0 || optionIndex >= optionCount) {
    throw new Error("Invalid poll option");
  }
};

export const createPoll = mutation({
  args: {
    postId: v.id("posts"),
    question: v.string(),
    options: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.authorId !== userId) {
      throw new Error("Not authorized to create poll for this post");
    }

    const existingPoll = await ctx.db
      .query("polls")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .first();

    if (existingPoll) {
      throw new Error("Poll already exists for this post");
    }

    const question = normalizePollQuestion(args.question);
    const options = normalizePollOptions(args.options);

    return await ctx.db.insert("polls", {
      postId: args.postId,
      question,
      options,
    });
  },
});

export const vote = mutation({
  args: {
    pollId: v.id("polls"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    assertValidOptionIndex(args.optionIndex, poll.options.length);

    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("byPollAndUser", (q) => q.eq("pollId", args.pollId).eq("userId", userId))
      .first();

    if (existingVote) {
      throw new Error("User has already voted on this poll");
    }

    return await ctx.db.insert("pollVotes", {
      pollId: args.pollId,
      userId,
      optionIndex: args.optionIndex,
    });
  },
});

export const changeVote = mutation({
  args: {
    pollId: v.id("polls"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    assertValidOptionIndex(args.optionIndex, poll.options.length);

    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("byPollAndUser", (q) => q.eq("pollId", args.pollId).eq("userId", userId))
      .first();

    if (!existingVote) {
      throw new Error("Vote not found");
    }

    if (existingVote.optionIndex === args.optionIndex) {
      return { changed: false };
    }

    await ctx.db.patch(existingVote._id, {
      optionIndex: args.optionIndex,
    });

    return { changed: true };
  },
});

export const getPoll = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("polls")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .first();
  },
});

export const getResults = query({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      return null;
    }

    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("byPollId", (q) => q.eq("pollId", args.pollId))
      .collect();

    const voteCounts = poll.options.map(() => 0);
    for (const vote of votes) {
      if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
        voteCounts[vote.optionIndex] += 1;
      }
    }

    const totalVotes = votes.length;

    return {
      pollId: poll._id,
      question: poll.question,
      totalVotes,
      options: poll.options.map((option, optionIndex) => {
        const voteCount = voteCounts[optionIndex] ?? 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

        return {
          option,
          optionIndex,
          voteCount,
          percentage,
        };
      }),
    };
  },
});

export const getUserVote = query({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const vote = await ctx.db
      .query("pollVotes")
      .withIndex("byPollAndUser", (q) => q.eq("pollId", args.pollId).eq("userId", userId))
      .first();

    if (!vote) {
      return null;
    }

    return {
      pollId: vote.pollId,
      optionIndex: vote.optionIndex,
    };
  },
});
