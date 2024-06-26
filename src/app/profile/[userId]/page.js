import styles from "./profile.module.css";
import prisma from "@/utils/db";
import ProfileCard from "@/components/ProfileCard/ProfileCard";
import ProfileMatchHistory from "@/components/ProfileMatchHistory/ProfileMatchHistory";

const getCurrentUser = async (userId) => {
  if (!userId) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { userId: parseInt(userId, 10) },
  });
  return user;
};

const Profile = async ({ params }) => {
  const userId = params?.userId;
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
      <ProfileCard currentUser={currentUser} />
      <ProfileMatchHistory currentUser={currentUser} />
    </div>
  );
};

export default Profile;
