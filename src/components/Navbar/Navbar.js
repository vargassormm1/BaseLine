import Link from "next/link";
import Links from "./Links/Links";
import styles from "./Navbar.module.css";
import { auth } from "@clerk/nextjs";

const Navbar = async () => {
  const { userId } = await auth();
  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <Link href="/">
          <h1 className={styles.logo}>Baseline</h1>
        </Link>
        <Links userId={userId} />
      </div>
      <div className={styles.mark}></div>
    </div>
  );
};

export default Navbar;
