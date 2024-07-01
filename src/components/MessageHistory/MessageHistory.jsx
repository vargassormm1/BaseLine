"use client";
import { useEffect } from "react";
import styles from "./MessageHistory.module.css";
import MessageHistoryCard from "./MessageHistoryCard/MessageHistoryCard";
import { getAllThreads } from "@/utils/api";

const MessageHistory = ({
  currentUser,
  currentThread,
  setCurrentThread,
  threads,
  setThreads,
}) => {
  useEffect(() => {
    const getData = async (userId) => {
      const data = await getAllThreads(userId);
      setThreads(data);
    };
    if (currentUser?.userId) {
      getData(currentUser?.userId);
    }
  }, [currentUser?.userId, setThreads]);

  return (
    <div className={styles.container}>
      {threads.map((thread) => {
        return (
          <MessageHistoryCard
            key={thread.threadId}
            messageInfo={thread}
            currentUser={currentUser}
            isSelected={thread.threadId === currentThread?.threadId}
            onClick={() => {
              setCurrentThread(thread);
            }}
          />
        );
      })}
    </div>
  );
};

export default MessageHistory;
