"use client";
import { useEffect } from "react";
import { useChannel } from "ably/react";
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
  const channelName = `messages_${currentUser?.userId}`;

  const { channel, ably } = useChannel(channelName, (message) => {
    // When a new message is received, update the message history
    setThreads((prevThreads) => {
      const updatedThreads = [...prevThreads];
      const threadIndex = updatedThreads.findIndex(
        (thread) => thread.threadId === message.data.threadId
      );
      if (threadIndex !== -1) {
        updatedThreads[threadIndex].lastMessage = message.data;
        updatedThreads[threadIndex].lastUpdated = message.data.lastUpdated;
      } else {
        // Add new thread if it doesn't exist
        updatedThreads.unshift({
          threadId: message.data.threadId,
          participant1: message.data.senderId,
          participant2: message.data.receiverId,
          user1: { userId: message.data.senderId },
          user2: { userId: message.data.receiverId },
          lastMessage: message.data,
          lastUpdated: message.data.lastUpdated,
        });
      }
      return updatedThreads;
    });
  });

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
