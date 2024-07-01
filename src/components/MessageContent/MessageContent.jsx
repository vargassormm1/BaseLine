"use client";
import { useEffect, useState } from "react";
import styles from "./MessageContent.module.css";
import { getAllThreads } from "@/utils/api";
import dynamic from "next/dynamic";

const Chat = dynamic(() => import("../Chat/Chat"));
const History = dynamic(() => import("../History/History"));

const MessageContent = ({ currentUser }) => {
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);

  useEffect(() => {
    const getData = async (userId) => {
      const data = await getAllThreads(userId);
      setThreads(data);
    };
    if (currentUser?.userId) {
      getData(currentUser?.userId);
    }
  }, [currentUser?.userId]);

  return (
    <div className={styles.container}>
      {currentUser?.userId && (
        <History
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
