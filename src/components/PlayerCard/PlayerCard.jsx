"use client";

import styles from "./PlayerCard.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createMessageThread } from "@/utils/api";

const PlayerCard = ({ user, currentUser }) => {
  const router = useRouter();

  const handleMessageClick = async () => {
    try {
      const newThread = await createMessageThread({
        participant1: currentUser?.userId,
        participant2: user?.userId,
      });
      if (newThread) {
        router.push(`/messages?threadId=${newThread.threadId}`);
      }
    } catch (error) {
      console.error("Error creating message thread:", error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.userImage}>
        <Link href={`/profile/${user?.userId}`}>
          <Image
            className={styles.profilepic}
            src={user.imageUrl}
            width={60}
            height={60}
            alt="Picture of the user"
          />
        </Link>
      </div>
      <div className={styles.userName}>
        <Link href={`/profile/${user?.userId}`}>
          <h3>
            {user.fname} {user.lname}
          </h3>
        </Link>
        <Link href={`/profile/${user?.userId}`}>
          <p>@{user.username}</p>
        </Link>
      </div>
      <div className={styles.userStats}>
        <div>
          <h4>{user.totalWins}</h4>
          <p>Wins</p>
        </div>
        <div>
          <h4>{user.totalLosses}</h4>
          <p>Losses</p>
        </div>
        <div>
          <h4>{user.totalPoints}</h4>
          <p>Points</p>
        </div>
      </div>
      {currentUser?.userId === user?.userId ? null : (
        <button className={styles.messageButton} onClick={handleMessageClick}>
          Message
        </button>
      )}
    </div>
  );
};

export default PlayerCard;
