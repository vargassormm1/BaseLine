"use client";
import { useEffect, useState, useCallback } from "react";
import styles from "./MessageContent.module.css";
import { getAllThreads, getThreadById } from "@/utils/api";
import Chat from "../Chat/Chat";
import MessageHistory from "../MessageHistory/MessageHistory";
import { socket } from "@/utils/socket";
import { useMediaQuery } from "react-responsive";
import { useSearchParams } from "next/navigation";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";

const MessageContent = ({ currentUser }) => {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const threadId = searchParams.get("threadId");

  const fetchThreads = useCallback(async (userId) => {
    try {
      const data = await getAllThreads(userId);
      setThreads(data);
    } catch (error) {
      console.error("Error fetching threads:", error);
    }
  }, []);

  const fetchInitialThread = useCallback(async (threadId) => {
    try {
      const thread = await getThreadById(threadId);
      if (!thread) {
        return;
      }
      setCurrentThread(thread);
      setIsChatActive(true);
    } catch (error) {
      console.error("Error fetching initial thread:", error);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);

    if (currentUser?.userId) {
      fetchThreads(currentUser?.userId);
      if (threadId) {
        fetchInitialThread(threadId);
      }
    }
  }, [currentUser?.userId, fetchInitialThread, fetchThreads, threadId]);

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

  const handleThreadClick = (thread) => {
    setCurrentThread(thread);
    setIsChatActive(true);
  };

  const handleBackClick = () => {
    setIsChatActive(false);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className={styles.container}>
      {isMobile ? (
        isChatActive ? (
          <Chat
            currentUser={currentUser}
            currentThread={currentThread}
            onBack={handleBackClick}
          />
        ) : (
          <div className={styles.history}>
            <Link href="/players">
              <button className={styles.find}>
                <SearchOutlined /> Find Players
              </button>
            </Link>
            <MessageHistory
              currentUser={currentUser}
              currentThread={currentThread}
              setCurrentThread={handleThreadClick}
              threads={threads}
            />
          </div>
        )
      ) : (
        <>
          <div className={styles.history}>
            <Link href="/players">
              <button className={styles.find}>
                <SearchOutlined /> Find Players
              </button>
            </Link>
            <MessageHistory
              currentUser={currentUser}
              currentThread={currentThread}
              setCurrentThread={setCurrentThread}
              threads={threads}
            />
          </div>

          {currentThread ? (
            <Chat currentUser={currentUser} currentThread={currentThread} />
          ) : (
            <div className={styles.notice}>
              <p>
                Pick a person from the left menu and start your conversation
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageContent;
