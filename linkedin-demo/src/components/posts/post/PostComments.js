import React from "react";
import { useMutation, useQuery } from "convex/react";
import Avatar from "@material-ui/core/Avatar";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import ReactTimeago from "react-timeago";
import { api } from "../../../convex/_generated/api";

const PostComments = ({
  classes,
  postId,
  canInteract,
  currentUserId,
  resolvePhoto,
  onError,
}) => {
  const addComment = useMutation(api.comments.addComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const comments = useQuery(api.comments.listComments, { postId });
  const [commentText, setCommentText] = React.useState("");
  const commentsList = comments ?? [];

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!canInteract || !currentUserId) {
      return;
    }

    const body = commentText.trim();
    if (!body) {
      return;
    }

    try {
      await addComment({ postId, authorId: currentUserId, body });
      setCommentText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
      onError("Failed to save comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!currentUserId) {
      return;
    }

    await deleteComment({ commentId, userId: currentUserId });
  };

  return (
    <div className={classes.comments__section}>
      <div className={classes.comments__list}>
        {commentsList.map((comment) => (
          <div key={comment._id} className={classes.comment__item}>
            <Avatar
              className={classes.comment__avatar}
              src={resolvePhoto(comment.author?.photoURL)}
              alt={comment.author?.displayName ?? "Comment author"}
            />
            <div className={classes.comment__content}>
              <div className={classes.comment__meta}>
                <h5>{comment.author?.displayName ?? "Unknown user"}</h5>
                <span>
                  <ReactTimeago
                    date={new Date(comment.createdAt).toUTCString()}
                    units="minute"
                  />
                </span>
                {currentUserId && comment.authorId === currentUserId && (
                  <DeleteOutlineIcon
                    className={classes.comment__delete}
                    onClick={() => handleDeleteComment(comment._id)}
                    titleAccess="Delete comment"
                  />
                )}
              </div>
              <p>{comment.body}</p>
            </div>
          </div>
        ))}
      </div>

      {canInteract && (
        <form className={classes.comment__form} onSubmit={handleCommentSubmit}>
          <input
            type="text"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add a comment"
            aria-label="Add a comment"
          />
          <button type="submit" disabled={!commentText.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
};

export default PostComments;
