import React from "react";
import { Paper, Avatar, Divider } from "@material-ui/core";
import LabelImportantIcon from "@material-ui/icons/LabelImportant";
import useConvexUser from "../../../hooks/useConvexUser";
import Style from "./Style";

const SidebarTop = () => {
  const classes = Style();
  const user = useConvexUser();
  const connections = user?.connections ?? 0;
  const viewed = Math.floor((user?.connections ?? 100) / 2);

  return (
    <Paper className={classes.sidebar}>
      <div
        className={classes.cover}
        style={{
          backgroundImage: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
        }}
      ></div>
      <Avatar src={user?.photoURL} />
      <h4>{user?.displayName ?? "Guest User"}</h4>
      <p className={classes.subtitle}>{user?.title ?? "Turtle In member"}</p>
      <div className={classes.stats}>
        <Divider />
        <div className={classes.stat}>
          <h4>Who viewed your profile</h4>
          <p>{viewed}</p>
        </div>
        <div className={classes.stat}>
          <h4>Connections</h4>
          <p>{connections}</p>
        </div>
        <Divider />
      </div>
      <div className={classes.myItems}>
        <LabelImportantIcon style={{ transform: "rotate(-90deg)" }} />
        <h4>My Items</h4>
      </div>
    </Paper>
  );
};

export default SidebarTop;
