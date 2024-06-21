import styles from "./home.module.css";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import HomeContent from "@/components/HomeContent/HomeContent";

const getCurrentUser = async (clerkId) => {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });
  return user;
};

const getAllUsers = async (clerkId) => {
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      clerkId: true,
      username: true,
    },
  });

  users.map((el) => {
    el.value = el.userId;
    el.label = el.username;
  });
  const finalData = users.filter((el) => el.clerkId !== clerkId);
  return finalData;
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
