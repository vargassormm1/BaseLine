import styles from "./home.module.css";
import prisma from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import HomeContent from "@/components/HomeContent/HomeContent";

export const revalidate = 60;

const Home = async () => {
  const { userId } = auth();

  const [currentUser, allUsers, matches] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { clerkId: userId },
      select: { userId: true, username: true },
    }),
    prisma.user.findMany({
      select: { userId: true, clerkId: true, username: true },
    }),
    prisma.matches.findMany({
      where: {
        playerOneConfirmed: true,
        playerTwoConfirmed: true,
        scoreVisible: true,
      },
      orderBy: { playedAt: "desc" },
      include: {
        matchDetails: true,
        playerOneUser: { select: { imageUrl: true } },
        playerTwoUser: { select: { imageUrl: true } },
      },
    }),
  ]);

  const users = allUsers
    .filter((u) => u.clerkId !== userId)
    .map((u) => ({ ...u, label: u.username, value: u.userId }));

  return (
    <div className={styles.container}>
      <HomeContent currentUser={currentUser} users={users} initialMatches={matches} />
    </div>
  );
};

export default Home;
