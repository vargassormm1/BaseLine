import styles from "./Rankings.module.css";
import RankingsTable from "@/components/RankingsTable/RankingsTable";
import prisma from "@/utils/db";

const getRankings = async () => {
  const rankingTable = await prisma.user.findMany({
    select: {
      username: true,
      totalWins: true,
      totalLosses: true,
      totalPoints: true,
      imageUrl: true,
    },
  });

  const rankedTable = rankingTable
    .map((user) => ({
      ...user,
      winLossRatio:
        user.totalLosses === 0
          ? user.totalWins
          : user.totalWins / user.totalLosses,
    }))
    .sort((a, b) => {
      if (b.totalPoints === a.totalPoints) {
        return b.winLossRatio - a.winLossRatio;
      }
      return b.totalPoints - a.totalPoints;
    })
    .map((user, index) => ({
      rank: index + 1,
      key: user.username,
      ...user,
    }));

  return rankedTable;
};

const Rankings = async () => {
  const rankings = await getRankings();
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>World Rankings</h2>
      <RankingsTable rankings={rankings} />
    </div>
  );
};

export default Rankings;
