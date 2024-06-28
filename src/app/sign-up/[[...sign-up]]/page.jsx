import styles from "./signup.module.css";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className={styles.container}>
      <SignUp path="/sign-up" />
    </div>
  );
}
