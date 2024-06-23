import styles from "./home.module.css";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import HomeContent from "@/components/HomeContent/HomeContent";

const getCurrentUser = async (clerkId) => {
  return prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });
};

const getAllUsers = async (clerkId) => {
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      clerkId: true,
      username: true,
    },
  });

  return users
    .filter((user) => user.clerkId !== clerkId)
    .map((user) => ({
      ...user,
      value: user.userId,
      label: user.username,
    }));
};

const Home = async () => {
  const { userId } = auth();
  const users = await getAllUsers(userId);
  const currentUser = await getCurrentUser(userId);

  return (
    <div className={styles.container}>
      <HomeContent currentUser={currentUser} users={users} />
    </div>
  );
};

export default Home;
