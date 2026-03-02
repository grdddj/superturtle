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
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import SendIcon from "@material-ui/icons/Send";
import { api } from "../../convex/_generated/api";
import useConvexUser from "../../hooks/useConvexUser";
import useErrorToast from "../../hooks/useErrorToast";
import { encryptMessage, decryptMessageSafe } from "../../utils/crypto";
import { resolvePhoto } from "../../utils/photo";
import LoadingGate from "../LoadingGate";
import useStyles from "./Style";

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

const Messaging = () => {
  const classes = useStyles();
  const user = useConvexUser();
  const sendMessage = useMutation(api.messaging.sendMessage);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [body, setBody] = useState("");
  const messageEndRef = useRef(null);
  const { showError, ErrorToast } = useErrorToast();

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

  const [decryptedBodies, setDecryptedBodies] = useState({});
  const [decryptedPreviews, setDecryptedPreviews] = useState({});

  useEffect(() => {
    if (!messages || !selectedConversation?.encryptionKey) {
      return;
    }

    const encryptionKey = selectedConversation.encryptionKey;
    let cancelled = false;

    const decryptAll = async () => {
      const results = {};
      for (const message of messages) {
        if (message.encrypted && encryptionKey) {
          results[message._id] = await decryptMessageSafe(message.body, encryptionKey);
        }
      }
      if (!cancelled) {
        setDecryptedBodies(results);
      }
    };

    decryptAll();
    return () => { cancelled = true; };
  }, [messages, selectedConversation?.encryptionKey]);

  useEffect(() => {
    if (!conversations) {
      return;
    }

    let cancelled = false;

    const decryptPreviews = async () => {
      const results = {};
      for (const conversation of conversations) {
        const msg = conversation.latestMessage;
        if (msg?.encrypted && conversation.encryptionKey) {
          results[conversation._id] = await decryptMessageSafe(msg.body, conversation.encryptionKey);
        }
      }
      if (!cancelled) {
        setDecryptedPreviews(results);
      }
    };

    decryptPreviews();
    return () => { cancelled = true; };
  }, [conversations]);

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
      const encryptionKey = selectedConversation?.encryptionKey;
      if (encryptionKey) {
        const ciphertext = await encryptMessage(trimmedBody, encryptionKey);
        await sendMessage({
          conversationId: selectedConversationId,
          senderId: user._id,
          body: ciphertext,
          encrypted: true,
        });
      } else {
        await sendMessage({
          conversationId: selectedConversationId,
          senderId: user._id,
          body: trimmedBody,
        });
      }
      setBody("");
    } catch (error) {
      console.error("Failed to send message:", error);
      showError("Failed to send message. Please try again.");
    }
  };

  if (!user?._id) {
    return (
      <>
        <Paper className={classes.root} elevation={1}>
          <div className={classes.emptyState}>
            <Typography variant="body2">Sign in to use messaging.</Typography>
          </div>
        </Paper>
        <ErrorToast />
      </>
    );
  }

  if (!selectedConversationId) {
    return (
      <>
        <Paper className={classes.root} elevation={1}>
          <LoadingGate isLoading={conversations === undefined}>
            <div className={classes.listView}>
              <div className={classes.listHeader}>
                <Typography variant="h6" style={{ fontSize: 18, fontWeight: 700 }}>
                  Messaging
                </Typography>
              </div>
              {conversations?.length === 0 ? (
                <div className={classes.emptyState}>
                  <Typography variant="body2">No conversations yet.</Typography>
                </div>
              ) : (
                conversations?.map((conversation) => {
                  const rawPreview = conversation.latestMessage?.body ?? "No messages yet";
                  const preview = conversation.latestMessage?.encrypted
                    ? (decryptedPreviews[conversation._id] ?? "[encrypted]")
                    : rawPreview;
                  const displayName = conversation.otherParticipant?.displayName ?? "Unknown user";
                  const photoURL = resolvePhoto(conversation.otherParticipant?.photoURL);
                  const timestamp = conversation.latestMessage?.createdAt ?? conversation.createdAt;

                  return (
                    <Button
                      type="button"
                      key={conversation._id}
                      className={classes.conversationItem}
                      onClick={() => setSelectedConversationId(conversation._id)}
                      disableRipple
                    >
                      <Avatar src={photoURL} alt={displayName} />
                      <div className={classes.conversationMain}>
                        <div className={classes.conversationTopRow}>
                          <p className={classes.conversationName}>{displayName}</p>
                          <span className={classes.conversationTime}>{formatTimeAgo(timestamp)}</span>
                        </div>
                        <p className={classes.conversationPreview}>{truncatePreview(preview, 50)}</p>
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          </LoadingGate>
        </Paper>
        <ErrorToast />
      </>
    );
  }

  const threadTitle = selectedConversation?.otherParticipant?.displayName ?? "Conversation";

  return (
    <>
      <Paper className={classes.root} elevation={1}>
        <div className={classes.threadHeader}>
          <IconButton
            className={classes.backButton}
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
            <CircularProgress size={22} color="primary" />
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
                    <Typography className={classes.messageText}>
                      {message.encrypted ? (decryptedBodies[message._id] ?? "[decrypting...]") : message.body}
                    </Typography>
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
      <ErrorToast />
    </>
  );
};

export default Messaging;
