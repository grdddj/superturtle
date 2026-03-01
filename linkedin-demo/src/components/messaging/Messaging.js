import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Avatar,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import SendIcon from "@material-ui/icons/Send";
import { api } from "../../convex/_generated/api";
import useConvexUser from "../../hooks/useConvexUser";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    height: "calc(100vh - 170px)",
    minHeight: 460,
    display: "flex",
    flexDirection: "column",
    borderRadius: 8,
    overflow: "hidden",
    [theme.breakpoints.down("xs")]: {
      borderRadius: 0,
      height: "calc(100vh - 120px)",
    },
  },
  listView: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
  },
  listHeader: {
    padding: "16px 18px 8px",
    borderBottom: "1px solid #eceff1",
    position: "sticky",
    top: 0,
    backgroundColor: "#fff",
    zIndex: 1,
  },
  conversationItem: {
    width: "100%",
    border: 0,
    background: "transparent",
    textAlign: "left",
    padding: "12px 16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid #f1f3f4",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#f4f8f4",
    },
  },
  conversationMain: {
    flex: 1,
    minWidth: 0,
  },
  conversationTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  conversationName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1d2226",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  conversationTime: {
    color: "#6b7280",
    fontSize: 11,
    whiteSpace: "nowrap",
  },
  conversationPreview: {
    marginTop: 2,
    color: "#5f6368",
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emptyState: {
    flex: 1,
    minHeight: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#5f6368",
    padding: 20,
    textAlign: "center",
  },
  loadingState: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  threadHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #eceff1",
    backgroundColor: "#fff",
  },
  threadTitle: {
    fontWeight: 600,
    fontSize: 15,
    color: "#1d2226",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 12px",
    backgroundColor: "#fafafa",
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  ownRow: {
    justifyContent: "flex-end",
  },
  otherRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    padding: "8px 12px",
    borderRadius: 14,
    boxShadow: "0 1px 1px rgba(0, 0, 0, 0.08)",
  },
  ownBubble: {
    backgroundColor: "#2e7d32",
    color: "#fff",
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: "#e0e0e0",
    color: "#1d2226",
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  messageMeta: {
    marginTop: 4,
    fontSize: 11,
    opacity: 0.85,
  },
  inputBar: {
    borderTop: "1px solid #eceff1",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  inputField: {
    flex: 1,
  },
  sendButton: {
    minWidth: 90,
    backgroundColor: "#2e7d32",
    color: "#fff",
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#1b5e20",
    },
    "&.Mui-disabled": {
      color: "rgba(255,255,255,0.8)",
      backgroundColor: "#9e9e9e",
    },
  },
}));

const DEFAULT_PHOTO = "https://i.pravatar.cc/100?img=68";

const truncatePreview = (value = "", maxLength = 50) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}...`;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  const now = Date.now();
  const seconds = Math.max(1, Math.floor((now - timestamp) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString();
};

const resolvePhoto = (photoURL) => {
  if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
    return DEFAULT_PHOTO;
  }
  return photoURL;
};

const Messaging = () => {
  const classes = useStyles();
  const user = useConvexUser();
  const sendMessage = useMutation(api.messaging.sendMessage);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [body, setBody] = useState("");
  const messageEndRef = useRef(null);

  const conversations = useQuery(
    api.messaging.listConversations,
    user?._id ? { userId: user._id } : "skip"
  );

  const selectedConversation = useMemo(
    () => conversations?.find((conversation) => conversation._id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const messages = useQuery(
    api.messaging.listMessages,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );

  useEffect(() => {
    if (!selectedConversationId || !conversations) {
      return;
    }

    const stillExists = conversations.some((conversation) => conversation._id === selectedConversationId);
    if (!stillExists) {
      setSelectedConversationId(null);
      setBody("");
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !messageEndRef.current) {
      return;
    }

    messageEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, selectedConversationId]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmedBody = body.trim();
    if (!trimmedBody || !selectedConversationId || !user?._id) {
      return;
    }

    try {
      await sendMessage({
        conversationId: selectedConversationId,
        senderId: user._id,
        body: trimmedBody,
      });
      setBody("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!user?._id) {
    return (
      <Paper className={classes.root} elevation={1}>
        <div className={classes.emptyState}>
          <Typography variant="body2">Sign in to use messaging.</Typography>
        </div>
      </Paper>
    );
  }

  if (conversations === undefined) {
    return (
      <Paper className={classes.root} elevation={1}>
        <div className={classes.loadingState}>
          <CircularProgress size={26} style={{ color: "#2e7d32" }} />
        </div>
      </Paper>
    );
  }

  if (!selectedConversationId) {
    return (
      <Paper className={classes.root} elevation={1}>
        <div className={classes.listView}>
          <div className={classes.listHeader}>
            <Typography variant="h6" style={{ fontSize: 18, fontWeight: 700 }}>
              Messaging
            </Typography>
          </div>
          {conversations.length === 0 ? (
            <div className={classes.emptyState}>
              <Typography variant="body2">No conversations yet.</Typography>
            </div>
          ) : (
            conversations.map((conversation) => {
              const preview = conversation.latestMessage?.body ?? "No messages yet";
              const displayName = conversation.otherParticipant?.displayName ?? "Unknown user";
              const photoURL = resolvePhoto(conversation.otherParticipant?.photoURL);
              const timestamp = conversation.latestMessage?.createdAt ?? conversation.createdAt;

              return (
                <button
                  type="button"
                  key={conversation._id}
                  className={classes.conversationItem}
                  onClick={() => setSelectedConversationId(conversation._id)}
                >
                  <Avatar src={photoURL} alt={displayName} />
                  <div className={classes.conversationMain}>
                    <div className={classes.conversationTopRow}>
                      <p className={classes.conversationName}>{displayName}</p>
                      <span className={classes.conversationTime}>{formatTimeAgo(timestamp)}</span>
                    </div>
                    <p className={classes.conversationPreview}>{truncatePreview(preview, 50)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Paper>
    );
  }

  const threadTitle = selectedConversation?.otherParticipant?.displayName ?? "Conversation";

  return (
    <Paper className={classes.root} elevation={1}>
      <div className={classes.threadHeader}>
        <IconButton
          size="small"
          onClick={() => {
            setSelectedConversationId(null);
            setBody("");
          }}
          aria-label="Back to conversations"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography className={classes.threadTitle}>{threadTitle}</Typography>
      </div>

      <div className={classes.messageList}>
        {messages === undefined ? (
          <div className={classes.loadingState}>
            <CircularProgress size={22} style={{ color: "#2e7d32" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className={classes.emptyState}>
            <Typography variant="body2">No messages yet. Start the conversation.</Typography>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === user._id;

            return (
              <div
                key={message._id}
                className={`${classes.messageRow} ${isOwnMessage ? classes.ownRow : classes.otherRow}`}
              >
                <div
                  className={`${classes.bubble} ${
                    isOwnMessage ? classes.ownBubble : classes.otherBubble
                  }`}
                >
                  <Typography className={classes.messageText}>{message.body}</Typography>
                  <Typography className={classes.messageMeta}>
                    {formatTimeAgo(message.createdAt)}
                  </Typography>
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <form className={classes.inputBar} onSubmit={handleSendMessage}>
        <TextField
          className={classes.inputField}
          variant="outlined"
          size="small"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Type a message"
        />
        <Button
          className={classes.sendButton}
          type="submit"
          variant="contained"
          endIcon={<SendIcon />}
          disabled={!body.trim()}
        >
          Send
        </Button>
      </form>
    </Paper>
  );
};

export default Messaging;
