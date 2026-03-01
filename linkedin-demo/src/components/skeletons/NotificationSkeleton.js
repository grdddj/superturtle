import React from "react";
import Paper from "@material-ui/core/Paper";
import Skeleton from "@material-ui/lab/Skeleton";

const NotificationSkeleton = () => {
  return (
    <Paper
      elevation={0}
      style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: 10 }}
    >
      <Skeleton variant="circle" width={36} height={36} animation="wave" />
      <div style={{ marginLeft: 12, flex: 1 }}>
        <Skeleton variant="text" width="78%" height={20} animation="wave" />
        <Skeleton variant="text" width="42%" height={18} animation="wave" />
      </div>
    </Paper>
  );
};

export default NotificationSkeleton;
