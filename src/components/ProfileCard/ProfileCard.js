"use client";
import styles from "./ProfileCard.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createMessageThread } from "@/utils/api";

const ProfileCard = ({ currentUser, loggedInUser }) => {
  const router = useRouter();

  const handleMessageClick = async () => {
    try {
      const newThread = await createMessageThread({
        participant1: currentUser?.userId,
        participant2: loggedInUser?.userId,
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
        <Image
          className={styles.profilepic}
          src={currentUser.imageUrl}
          width={100}
          height={100}
          alt="Picture of the user"
        />
      </div>
      <div className={styles.userName}>
        <h3>
          {currentUser.fname} {currentUser.lname}
        </h3>
        <p>@{currentUser.username}</p>
      </div>
      <div className={styles.userStats}>
        <div>
          <h4>{currentUser.totalWins}</h4>
          <p>Wins</p>
        </div>
        <div>
          <h4>{currentUser.totalLosses}</h4>
          <p>Losses</p>
        </div>
        <div>
          <h4>{currentUser.totalPoints}</h4>
          <p>Points</p>
        </div>
      </div>
      {loggedInUser?.userId === currentUser?.userId ? null : (
        <button className={styles.messageButton} onClick={handleMessageClick}>
          Message
        </button>
      )}
    </div>
  );
};

export default ProfileCard;
