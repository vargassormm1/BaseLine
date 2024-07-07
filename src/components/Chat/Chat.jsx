"use client";
import React, { useEffect, useState, useCallback } from "react";
import styles from "./Chat.module.css";
import { getThreadMessages, createMessage, viewThread } from "@/utils/api";
import { socket } from "@/utils/socket";
import { ArrowLeftOutlined, SendOutlined } from "@ant-design/icons";
import Image from "next/image";
import Link from "next/link";

const Chat = ({ currentUser, currentThread, onBack }) => {
  let messageEnd = null;
  const [messageText, setMessageText] = useState("");
  const [receivedMessages, setMessages] = useState([]);
  const messageTextIsEmpty = messageText.trim().length === 0;

  const fetchMessages = useCallback(async (threadId) => {
    try {
      const data = await getThreadMessages(threadId);
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  const readMeassages = useCallback(async (threadId, userId) => {
    try {
      await viewThread({
        threadId,
        userId,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, []);

  const messages = receivedMessages.map((message, index) => {
    const author = message.senderId === currentUser?.userId ? "me" : "other";
    return (
      <div
        key={index}
        className={`${styles.message} ${
          author === "me" ? styles.me : styles.other
        }`}
        data-author={author}
      >
        <p>{message.content}</p>
      </div>
    );
  });

  const roomId = [
    currentUser?.userId,
    currentThread?.user1.userId === currentUser?.userId
      ? currentThread?.user2.userId
      : currentThread?.user1.userId,
  ]
    .sort()
    .join("-");

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

      socket.emit("chat message", { roomId, newMessage });
      setMessageText("");
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

  useEffect(() => {
    if (currentThread) {
      fetchMessages(currentThread.threadId);
      socket.emit("join", { roomId });
    }
  }, [currentThread, currentUser?.userId, fetchMessages, roomId]);

  useEffect(() => {
    const handleMessage = (newMessage) => {
      if (currentThread) {
        fetchMessages(currentThread.threadId);
        readMeassages(currentThread.threadId, currentUser?.userId);
      }
    };

    socket.on("new message", handleMessage);

    return () => {
      socket.off("new message", handleMessage);
    };
  }, [currentThread, currentUser?.userId, fetchMessages, readMeassages]);

  const otherUser =
    currentUser?.userId === currentThread?.user1?.userId
      ? currentThread?.user2
      : currentThread?.user1;

  useEffect(() => {
    messageEnd.scrollIntoView({ behaviour: "smooth" });
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ArrowLeftOutlined onClick={onBack} className={styles.backButton} />
      </div>
      <div className={styles.friendInfo}>
        <Link href={`/profile/${otherUser.userId}`}>
          <Image
            src={otherUser.imageUrl}
            width={40}
            height={40}
            alt="Picture of the user"
            className={styles.profileImage}
          />
        </Link>
        <p>
          {otherUser.fname} {otherUser.lname}
        </p>
      </div>
      <div className={styles.chatText}>
        {messages}
        <div
          ref={(element) => {
            messageEnd = element;
          }}
        ></div>
      </div>
      <form onSubmit={handleFormSubmission} className={styles.form}>
        <div className={styles.send}>
          <input
            type="text"
            value={messageText}
            placeholder="Type a message..."
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.textarea}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={messageTextIsEmpty}
          >
            <SendOutlined />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
