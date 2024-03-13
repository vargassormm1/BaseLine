import Link from "next/link";
import Links from "./Links/Links";
import styles from "./Navbar.module.css";
import { auth } from "@clerk/nextjs";
const Navbar = () => {
  const { userId } = auth();
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.logo}>
        Baseline
      </Link>
      <Links userId={userId} />
    </div>
  );
};

export default Navbar;
