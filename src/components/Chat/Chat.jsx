"use client";
import React, { useEffect, useState, useCallback } from "react";
import styles from "./Chat.module.css";
import { getThreadMessages, createMessage } from "@/utils/api";

const Chat = ({ channelName, currentThread, currentUser }) => {
  const [messageText, setMessageText] = useState("");
  const [receivedMessages, setMessages] = useState([]);

  const fetchMessages = useCallback(async (threadId) => {
    try {
      const data = await getThreadMessages(threadId);
      const normalizedMessages = data.map((msg) => normalizeMessage(msg));
      setMessages(normalizedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

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

  return (
    <div className={styles.container}>
      <div className={styles.chatText}>{messages}</div>
      <form className={styles.form}>
        <textarea
          value={messageText}
          placeholder="Type a message..."
          onChange={(e) => setMessageText(e.target.value)}
          className={styles.textarea}
        ></textarea>
        <button type="submit" className={styles.button}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
