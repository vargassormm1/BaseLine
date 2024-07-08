import styles from "./players.module.css";
import { auth } from "@clerk/nextjs/server";
import PlayerCard from "../../components/PlayerCard/PlayerCard";
import { redirect } from "next/navigation";

const getUserData = async (clerkId) => {
  if (!clerkId) {
    return null;
  }

  const [currentUser, allUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { clerkId },
      select: { userId: true, username: true },
    }),
    prisma.user.findMany({}),
  ]);

  const users = allUsers.filter((user) => user.clerkId !== clerkId);
  return { currentUser, users };
};

const Players = async () => {
  const { userId } = auth();

  if (!userId) {
    redirect("/");
  }

  const { currentUser, users } = await getUserData(userId);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Explore Players</h2>
      <div className={styles.players}>
        {users.map((user) => (
          <PlayerCard key={user?.fname} user={user} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
};

export default Players;
