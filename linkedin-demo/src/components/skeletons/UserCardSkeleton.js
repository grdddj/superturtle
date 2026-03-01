import React from "react";
import Paper from "@material-ui/core/Paper";
import Skeleton from "@material-ui/lab/Skeleton";

const UserCardSkeleton = () => {
  return (
    <Paper
      elevation={1}
      style={{
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Skeleton variant="circle" width={56} height={56} animation="wave" />
      <Skeleton variant="text" width="70%" height={24} animation="wave" />
      <Skeleton variant="text" width="55%" height={20} animation="wave" />
      <Skeleton
        variant="rect"
        width="80%"
        height={36}
        animation="wave"
        style={{ borderRadius: 18, marginTop: 8 }}
      />
    </Paper>
  );
};

export default UserCardSkeleton;
