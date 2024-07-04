"use client";
import { useEffect, useState, useCallback } from "react";
import styles from "./MessageContent.module.css";
import { getAllThreads } from "@/utils/api";
import Chat from "../Chat/Chat";
import MessageHistory from "../MessageHistory/MessageHistory";
import { socket } from "@/utils/socket";

const MessageContent = ({ currentUser }) => {
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);

  const fetchThreads = useCallback(async (userId) => {
    try {
      const data = await getAllThreads(userId);
      setThreads(data);
    } catch (error) {
      console.error("Error fetching threads:", error);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.userId) {
      fetchThreads(currentUser?.userId);
    }
  }, [currentUser?.userId, fetchThreads]);

  useEffect(() => {
    const handleNewMessage = () => {
      if (currentUser?.userId) {
        fetchThreads(currentUser?.userId);
      }
    };

    socket.on("new message", handleNewMessage);

    return () => {
      socket.off("new message", handleNewMessage);
    };
  }, [currentUser?.userId, fetchThreads]);

  return (
    <div className={styles.container}>
      {currentUser?.userId && (
        <MessageHistory
          currentUser={currentUser}
          currentThread={currentThread}
          setCurrentThread={setCurrentThread}
          threads={threads}
          setThreads={setThreads}
        />
      )}
      {currentThread && currentUser?.userId ? (
        <Chat currentUser={currentUser} currentThread={currentThread} />
      ) : (
        <div className={styles.notice}>
          <p>Pick a person from the left menu and start your conversation</p>
        </div>
      )}
    </div>
  );
};

export default MessageContent;
