import styles from "./home.module.css";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs";
import HomeContent from "@/components/HomeContent/HomeContent";
const getCurrentUser = async (clerkId) => {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });
  return user;
};

const Home = async () => {
  const { userId } = await auth();
  const currentUser = await getCurrentUser(userId);

  return (
    <div className={styles.container}>
      <HomeContent currentUser={currentUser} />
    </div>
  );
};

export default Home;
