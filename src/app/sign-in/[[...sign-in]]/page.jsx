import styles from "./signin.module.css";
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className={styles.container}>
      <SignIn routing="hash" />
    </div>
  );
}
