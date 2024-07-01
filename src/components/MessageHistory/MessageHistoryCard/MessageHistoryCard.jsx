import styles from "./MessageHistoryCard.module.css";
import Image from "next/image";

const MessageHistoryCard = ({
  messageInfo,
  currentUser,
  isSelected,
  onClick,
}) => {
  const friend =
    messageInfo.user1.userId === currentUser?.userId
      ? messageInfo.user2
      : messageInfo.user1;

  return (
    <div
      className={`${styles.container} ${isSelected ? styles.selected : ""}`}
      onClick={onClick}
    >
      <div className={styles.image}>
        <Image
          src={friend.imageUrl}
          width={70}
          height={70}
          alt="Picture of the user"
          className={styles.profileImage}
        />
      </div>
      <div className={styles.info}>
        <div className={styles.cardTitle}>
          <p className={styles.name}>
            <b>
              {friend.fname} {friend.lname}
            </b>
          </p>
          <p className={styles.date}>
            {new Date(messageInfo.lastUpdated).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <div className={styles.message}>{messageInfo.lastMessage?.content}</div>
      </div>
    </div>
  );
};

export default MessageHistoryCard;
