import styles from "./page.module.css";
import Link from "next/link";
import { Button } from "antd";
import { auth } from "@clerk/nextjs";

const Home = async () => {
  const { userId } = await auth();
  let href = userId ? "/home" : "/new-user";
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Baseline</h1>
      <p>The Court is Calling</p>
      <p>–</p>
      <p>Track, Compete, Excel.</p>
      <Link href={href}>
        <Button className={styles.getStarted}>Get Started</Button>
      </Link>
    </main>
  );
};

export default Home;
