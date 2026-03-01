import React from "react";
import Paper from "@material-ui/core/Paper";
import Skeleton from "@material-ui/lab/Skeleton";

const PostSkeleton = ({ showImage = true }) => {
  return (
    <Paper elevation={1} style={{ borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <Skeleton variant="circle" width={40} height={40} animation="wave" />
        <div style={{ marginLeft: 12, flex: 1 }}>
          <Skeleton variant="text" width="48%" height={20} animation="wave" />
          <Skeleton variant="text" width="32%" height={18} animation="wave" />
        </div>
      </div>
      <Skeleton
        variant="rect"
        width="100%"
        height={60}
        animation="wave"
        style={{ borderRadius: 8, marginBottom: showImage ? 12 : 0 }}
      />
      {showImage ? (
        <Skeleton
          variant="rect"
          width="100%"
          height={200}
          animation="wave"
          style={{ borderRadius: 8 }}
        />
      ) : null}
    </Paper>
  );
};

export default PostSkeleton;
