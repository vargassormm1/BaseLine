import styles from "./home.module.css";
import NewMatchForm from "@/components/NewMatchForm/NewMatchForm";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs";

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
      <h1>Games Played</h1>
      <NewMatchForm currentUser={currentUser} />
    </div>
  );
};

export default Home;
