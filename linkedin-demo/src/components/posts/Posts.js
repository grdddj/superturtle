import React from "react";
import { useQuery } from "convex/react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import FlipMove from "react-flip-move";
import Post from "./post/Post";
import { DEFAULT_PHOTO } from "../../constants";
import { api } from "../../convex/_generated/api";
import useConvexPosts from "../../hooks/useConvexPosts";
import useConvexUser from "../../hooks/useConvexUser";
import LoadingGate from "../LoadingGate";

const Posts = ({ onNavigateProfile }) => {
  const classes = Style();
  const posts = useConvexPosts();
  const user = useConvexUser();
  const isLoading = posts === undefined;

  const postIds = React.useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) {
      return [];
    }

    const seenPostIds = new Set();
    const resolvedPostIds = [];

    for (const post of posts) {
      const targetPostId = post.targetPostId ?? post._id;
      if (!targetPostId || seenPostIds.has(targetPostId)) {
        continue;
      }

      seenPostIds.add(targetPostId);
      resolvedPostIds.push(targetPostId);
    }

    return resolvedPostIds;
  }, [posts]);

  const userReactions = useQuery(
    api.likes.getUserReactionsByPostIds,
    user?._id && postIds.length > 0 ? { userId: user._id, postIds } : "skip",
  );
  const reactionCounts = useQuery(
    api.likes.getReactionCountsByPostIds,
    postIds.length > 0 ? { postIds } : "skip",
  );

  const getProfilePhoto = (photoURL) => {
    if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
      return DEFAULT_PHOTO;
    }
    return photoURL;
  };

  return (
    <div className={classes.posts}>
      <LoadingGate isLoading={isLoading}>
        {posts?.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No posts yet.
          </Typography>
        ) : (
          <FlipMove style={{ width: "100%" }}>
            {posts?.map((post) => (
              <Post
                key={post.feedItemId ?? post._id}
                postId={post.targetPostId ?? post._id}
                authorId={post.authorId}
                authorUsername={post.author?.username ?? null}
                likesCount={post.likesCount}
                commentsCount={post.commentsCount}
                repostCount={post.repostCount}
                currentReaction={userReactions?.[post.targetPostId ?? post._id] ?? undefined}
                reactionCounts={reactionCounts?.[post.targetPostId ?? post._id]}
                profile={getProfilePhoto(post.authorPhotoURL ?? post.author?.photoURL)}
                username={post.authorName ?? post.author?.displayName}
                timestamp={post.createdAt}
                description={post.description}
                fileType={post.fileType}
                fileData={post.fileData}
                imageUrls={post.imageUrls}
                isRepost={post.feedItemType === "repost"}
                originalPost={post.originalPost ?? null}
                onNavigateProfile={onNavigateProfile}
              />
            ))}
          </FlipMove>
        )}
      </LoadingGate>
    </div>
  );
};

const Style = makeStyles(() => ({
  posts: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
}));

export default Posts;
