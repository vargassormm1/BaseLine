import styles from "./messages.module.css";
import MessageContent from "@/components/MessageContent/MessageContent";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs/server";

const getUserData = async (clerkId) => {
  if (!clerkId) {
    return null;
  }

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });

  return currentUser;
};

const Messages = async () => {
  const { userId } = auth();
  const currentUser = await getUserData(userId);

  return (
    <div className={styles.container}>
      <MessageContent currentUser={currentUser} />
    </div>
  );
};

export default Messages;
