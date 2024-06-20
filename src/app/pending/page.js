import styles from "./pending.module.css";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import PendingMatches from "@/components/PendingMatches/PendingMatches";

const getCurrentUser = async (clerkId) => {
  if (!clerkId) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });
  return user;
};

const Pending = async () => {
  const { userId } = auth();
  const currentUser = await getCurrentUser(userId);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Review Pending Matches</h2>
      <PendingMatches currentUser={currentUser} />
    </div>
  );
};

export default Pending;
