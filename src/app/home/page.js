import styles from "./home.module.css";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import HomeContent from "@/components/HomeContent/HomeContent";

const getUserData = async (clerkId) => {
  const [currentUser, allUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { clerkId },
      select: { userId: true, username: true },
    }),
    prisma.user.findMany({
      select: {
        userId: true,
        clerkId: true,
        username: true,
      },
    }),
  ]);

  const users = allUsers
    .filter((user) => user.clerkId !== clerkId)
    .map((user) => ({
      ...user,
      value: user.userId,
      label: user.username,
    }));

  return { currentUser, users };
};

const Home = async () => {
  const { userId } = auth();
  const { currentUser, users } = await getUserData(userId);

  return (
    <div className={styles.container}>
      <HomeContent currentUser={currentUser} users={users} />
    </div>
  );
};

export default Home;
