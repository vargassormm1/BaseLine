import { SignIn } from "@clerk/nextjs";
import styles from "./sign-in.module.css";

export default function Page() {
  return (
    <div className={styles.container}>
      <SignIn
        appearance={{
          elements: {
            card: styles.clerk,
          },
        }}
      />
    </div>
  );
}
