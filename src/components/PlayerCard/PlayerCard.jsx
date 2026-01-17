"use client";

import styles from "./PlayerCard.module.css";
import Image from "next/image";
import Link from "next/link";

const PlayerCard = ({ user, currentUser }) => {
  return (
    <div className={styles.container}>
      <div className={styles.userImage}>
        <Link href={`/profile/${user?.userId}`}>
          <Image
            className={styles.profilepic}
            src={user.imageUrl}
            width={80}
            height={80}
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
        <Link href={`/profile/${user?.userId}`}>
          <button className={styles.messageButton}>
            View Profile
          </button>
        </Link>
      )}
    </div>
  );
};

export default PlayerCard;
