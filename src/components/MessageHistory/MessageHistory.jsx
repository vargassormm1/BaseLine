"use client";
import { useContext } from "react";
import styles from "./MessageHistory.module.css";
import MessageHistoryCard from "./MessageHistoryCard/MessageHistoryCard";
import { viewThread, getUnreadMessagesCount } from "@/utils/api";
import { PendingMatchContext } from "../../context/PendingMatchContext";

const MessageHistory = ({
  currentUser,
  currentThread,
  setCurrentThread,
  threads,
}) => {
  const { setUnreadMessageCount } = useContext(PendingMatchContext);
  const readMeassages = async (threadId, userId) => {
    try {
      await viewThread({
        threadId,
        userId,
      });
      const unreadCount = await getUnreadMessagesCount(userId);
      setUnreadMessageCount(unreadCount);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

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
              readMeassages(thread.threadId, currentUser?.userId);
            }}
          />
        );
      })}
    </div>
  );
};

export default MessageHistory;
