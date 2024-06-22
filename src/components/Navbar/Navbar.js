import Link from "next/link";
import Links from "./Links/Links";
import styles from "./Navbar.module.css";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/utils/db";

const getCurrentUser = async (clerkId) => {
  if (!clerkId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { userId: true, username: true },
  });
  return user;
};

const Navbar = async () => {
  const { userId } = auth();
  const currentUser = await getCurrentUser(userId);

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <Link href="/">
          <h1 className={styles.logo}>Baseline</h1>
        </Link>
        <Links userId={userId} currentUser={currentUser} />
      </div>
      <div className={styles.mark}></div>
    </div>
  );
};

export default Navbar;
