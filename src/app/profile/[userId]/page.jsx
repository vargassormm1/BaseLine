import styles from "./profile.module.css";
import prisma from "@/utils/db";
import ProfileCard from "@/components/ProfileCard/ProfileCard";
import ProfileMatchHistory from "@/components/ProfileMatchHistory/ProfileMatchHistory";
import { auth } from "@clerk/nextjs/server";

const getCurrentUser = async (userId) => {
  if (!userId) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { userId: parseInt(userId, 10) },
  });
  return user;
};

const getLoggedInUser = async (clerkId) => {
  if (!clerkId) {
    return null;
  }

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });

  return currentUser;
};

const Profile = async ({ params }) => {
  const userId = params?.userId;
  const data = auth();
  const loggedInUser = await getLoggedInUser(data.userId);

  if (!userId) {
    redirect("/");
  }

  const currentUser = await getCurrentUser(userId);
  if (!currentUser) {
    console.error("User not found in the database");
    return null;
  }

  return (
    <div className={styles.container}>
      <ProfileCard currentUser={currentUser} loggedInUser={loggedInUser} />
      <ProfileMatchHistory currentUser={currentUser} />
    </div>
  );
};

export default Profile;
