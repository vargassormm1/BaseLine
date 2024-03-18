import Links from "./Links/Links";
import styles from "./Navbar.module.css";
import { auth } from "@clerk/nextjs";

const Navbar = () => {
  const { userId } = auth();
  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.logo}>Baseline</h1>
        <Links userId={userId} />
      </div>
      <div className={styles.mark}></div>
    </div>
  );
};

export default Navbar;
