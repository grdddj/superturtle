import { useQuery } from "convex/react";
import { Avatar, Button, Paper, Typography } from "@material-ui/core";
import { api } from "../../convex/_generated/api";
import Style from "./Style";

const DEFAULT_PHOTO = "https://i.pravatar.cc/200?img=68";

const resolvePhoto = (photoURL) => {
  if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
    return DEFAULT_PHOTO;
  }

  return photoURL;
};

const Network = ({ onViewProfile }) => {
  const classes = Style();
  const users = useQuery(api.users.listAllUsers);

  if (users === undefined) {
    return (
      <Paper className={classes.stateCard} elevation={1}>
        <Typography variant="body2" color="textSecondary">
          Loading your network...
        </Typography>
      </Paper>
    );
  }

  if (users.length === 0) {
    return (
      <Paper className={classes.stateCard} elevation={1}>
        <Typography variant="body2" color="textSecondary">
          No users found yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <div className={classes.network}>
      <div className={classes.grid}>
        {users.map((user) => (
          <Paper
            key={user._id}
            elevation={1}
            className={classes.card}
            role="button"
            tabIndex={0}
            onClick={() => onViewProfile(user._id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onViewProfile(user._id);
              }
            }}
          >
            <Avatar
              src={resolvePhoto(user.photoURL)}
              alt={user.displayName}
              className={classes.avatar}
            />
            <div className={classes.info}>
              <Typography className={classes.displayName}>{user.displayName}</Typography>
              <Typography className={classes.title}>{user.title}</Typography>
              <Typography className={classes.location}>
                {user.location?.trim().length > 0 ? user.location : "Location not listed"}
              </Typography>
            </div>
            <Button
              variant="outlined"
              size="small"
              className={classes.connectButton}
              onClick={(event) => event.stopPropagation()}
            >
              Connect
            </Button>
          </Paper>
        ))}
      </div>
    </div>
  );
};

export default Network;
