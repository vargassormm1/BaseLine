import styles from "./Rankings.module.css";
import RankingsTable from "@/components/RankingsTable/RankingsTable";

const Rankings = async () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>World Rankings</h2>
      <RankingsTable />
    </div>
  );
};

export default Rankings;
