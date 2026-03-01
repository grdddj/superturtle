import React, { forwardRef } from "react";
import { useMutation, useQuery } from "convex/react";
import Avatar from "@material-ui/core/Avatar";
import Paper from "@material-ui/core/Paper";
import MoreHorizOutlinedIcon from "@material-ui/icons/MoreHorizOutlined";
import ThumbUpAltIcon from "@material-ui/icons/ThumbUpAlt";
import ThumbUpAltOutlinedIcon from "@material-ui/icons/ThumbUpAltOutlined";
import ReplyOutlinedIcon from "@material-ui/icons/ReplyOutlined";
import FiberManualRecordRoundedIcon from "@material-ui/icons/FiberManualRecordRounded";
import SendIcon from "@material-ui/icons/Send";
import CommentOutlinedIcon from "@material-ui/icons/CommentOutlined";
import ReactPlayer from "react-player";
import ReactTimeago from "react-timeago";
import * as images from "../../../assets/images/images";
import { api } from "../../../convex/_generated/api";
import useConvexUser from "../../../hooks/useConvexUser";
import Style from "./Style";

const Post = forwardRef(
  (
    {
      postId,
      likesCount = 0,
      commentsCount = 0,
      profile,
      username,
      timestamp,
      description,
      fileType,
      fileData,
      onNavigateProfile,
    },
    ref
  ) => {
    const classes = Style();
    const isFeaturedUser = username === "Alex Turner";
    const handleProfileClick = isFeaturedUser ? onNavigateProfile : undefined;
    const user = useConvexUser();
    const toggleLike = useMutation(api.likes.toggleLike);
    const liked = useQuery(
      api.likes.getLikeStatus,
      user?._id ? { userId: user._id, postId } : "skip"
    );
    const isLiked = liked ?? false;

    const capitalize = (_string = "") => {
      return _string.charAt(0).toUpperCase() + _string.slice(1);
    };

    const postImageRef = React.useRef(null);

    const PostImage = React.forwardRef((props, ref) => {
      return <img src={props.src} alt="post" ref={ref} />;
    });

    const handleLikeClick = async () => {
      if (!user?._id) {
        return;
      }

      try {
        await toggleLike({ userId: user._id, postId });
      } catch (error) {
        console.error("Failed to toggle like:", error);
      }
    };

    const Reactions = () => {
      return (
        <div className={classes.footer__stats}>
          <div>
            <img src={images.LinkedInLike} alt="linked-in-reaction-1" />
            <img src={images.LinkedInLove} alt="linked-in-reaction-2" />
            <img src={images.LinkedInApplaud} alt="linked-in-reaction-3" />
          </div>
          <h4>{likesCount}</h4>
          <FiberManualRecordRoundedIcon
            style={{ fontSize: 8, color: "grey", paddingLeft: "3px" }}
          />
          <h4>{commentsCount} comments</h4>
        </div>
      );
    };

    return (
      <Paper ref={ref} className={classes.post}>
        <div className={classes.post__header}>
          <Avatar
            src={profile}
            onClick={handleProfileClick}
            style={isFeaturedUser ? { cursor: "pointer" } : undefined}
          />
          <div className={classes.header__info}>
            <h4
              onClick={handleProfileClick}
              style={isFeaturedUser ? { cursor: "pointer" } : { cursor: "default" }}
            >
              {capitalize(username)}
            </h4>
            <p>
              <ReactTimeago date={new Date(timestamp?.toDate()).toUTCString()} units="minute" />
            </p>
          </div>
          <MoreHorizOutlinedIcon />
        </div>
        <div className={classes.post__body}>
          <div className={classes.body__description}>
            <p>{description}</p>
          </div>
          {fileData && (
            <div className={classes.body__image}>
              {fileType === "image" ? (
                // <img src={fileData} alt="post" />
                <PostImage ref={postImageRef} src={fileData} />
              ) : (
                <ReactPlayer url={fileData} controls={true} style={{ height: "auto !important" }} />
              )}
            </div>
          )}
        </div>
        <div className={classes.post__footer}>
          <Reactions />
          <div className={classes.footer__actions}>
            <div className={classes.action__icons} onClick={handleLikeClick}>
              {isLiked ? (
                <ThumbUpAltIcon style={{ transform: "scaleX(-1)", color: "#2e7d32" }} />
              ) : (
                <ThumbUpAltOutlinedIcon style={{ transform: "scaleX(-1)" }} />
              )}
              <h4 style={isLiked ? { color: "#2e7d32" } : undefined}>Like</h4>
            </div>
            <div className={classes.action__icons}>
              <CommentOutlinedIcon />
              <h4>Comment</h4>
            </div>
            <div className={classes.action__icons}>
              <ReplyOutlinedIcon style={{ transform: "scaleX(-1)" }} />
              <h4>Share</h4>
            </div>
            <div className={classes.action__icons}>
              <SendIcon style={{ transform: "rotate(-45deg)" }} />
              <h4>Send</h4>
            </div>
          </div>
        </div>
      </Paper>
    );
  }
);

export default Post;
