import prisma from "@/utils/db";
import UserSelect from "@/components/UserSelect/UserSelect";
import styles from "./h2h.module.css";

const getAllUsers = async () => {
  const users = await prisma.user.findMany({});
  return users.map((user) => ({
    ...user,
    value: user.userId,
    label: user.username,
  }));
};

const H2H = async () => {
  const users = await getAllUsers();
  return (
    <div className={styles.container}>
      <h1>H2H</h1>
      <UserSelect users={users} />
    </div>
  );
};

export default H2H;
