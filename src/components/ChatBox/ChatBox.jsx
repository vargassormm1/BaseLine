"use client";
import React, { useEffect, useState, useCallback } from "react";
import styles from "./ChatBox.module.css";
import { getThreadMessages, createMessage } from "@/utils/api";
import { useChannel } from "ably/react";

const ChatBox = ({ channelName, currentThread, currentUser }) => {
  let inputBox = null;
  let messageEnd = null;

  const [messageText, setMessageText] = useState("");
  const [receivedMessages, setMessages] = useState([]);
  const messageTextIsEmpty = messageText.trim().length === 0;

  const normalizeMessage = (message) => {
    if (message.clientId) {
      return {
        content: message.data,
        senderId: parseInt(message.clientId),
        timestamp: message.timestamp,
      };
    } else {
      return {
        content: message.content,
        senderId: message.senderId,
        timestamp: new Date(message.timestamp).getTime(),
      };
    }
  };

  const { channel, ably } = useChannel(channelName, (message) => {
    const normalizedMessage = normalizeMessage(message);
    const history = receivedMessages.slice(-199);
    setMessages([...history, normalizedMessage]);
  });

  const fetchMessages = useCallback(async (threadId) => {
    try {
      const data = await getThreadMessages(threadId);
      const normalizedMessages = data.map((msg) => normalizeMessage(msg));
      setMessages(normalizedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  const sendChatMessage = async (messageText) => {
    try {
      const newMessage = {
        senderId: currentUser?.userId,
        receiverId:
          currentThread.user1.userId === currentUser?.userId
            ? currentThread.user2.userId
            : currentThread.user1.userId,
        content: messageText,
        threadId: currentThread.threadId,
        lastUpdated: new Date(),
      };

      await createMessage(newMessage);

      const receiverChannel = `messages_${newMessage.receiverId}`;
      const senderChannel = `messages_${newMessage.senderId}`;

      ably.channels.get(receiverChannel).publish("new-message", newMessage);
      ably.channels.get(senderChannel).publish("new-message", newMessage);

      channel.publish({
        name: "chat-message",
        data: messageText,
      });
      setMessageText("");
      inputBox.focus();
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  const handleFormSubmission = (event) => {
    event.preventDefault();
    sendChatMessage(messageText);
  };

  const handleKeyPress = (event) => {
    if (event.charCode !== 13 || messageTextIsEmpty) {
      return;
    }
    sendChatMessage(messageText);
    event.preventDefault();
  };

  const messages = receivedMessages.map((message, index) => {
    const author = message.senderId === currentUser?.userId ? "me" : "other";
    return (
      <span
        key={index}
        className={`${styles.message} ${
          author === "me" ? styles.me : styles.other
        }`}
        data-author={author}
      >
        {message.content}
      </span>
    );
  });

  useEffect(() => {
    if (currentThread) {
      fetchMessages(currentThread.threadId);
    }
  }, [currentThread, fetchMessages]);

  useEffect(() => {
    if (messageEnd) {
      messageEnd.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageEnd]);

  return (
    <div className={styles.container}>
      <div className={styles.chatText}>
        {messages}
        <div
          ref={(element) => {
            messageEnd = element;
          }}
        ></div>
      </div>
      <form onSubmit={handleFormSubmission} className={styles.form}>
        <textarea
          ref={(element) => {
            inputBox = element;
          }}
          value={messageText}
          placeholder="Type a message..."
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          className={styles.textarea}
        ></textarea>
        <button
          type="submit"
          className={styles.button}
          disabled={messageTextIsEmpty}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
