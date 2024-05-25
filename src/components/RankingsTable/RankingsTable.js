"use client";

import Image from "next/image";
import styles from "./RankingsTable.module.css";

const RankingsTable = ({ rankings }) => {
  return (
    <div className={styles.rankingTable}>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>Rank</th>
            <th style={{ textAlign: "center" }}></th>
            <th style={{ textAlign: "center" }}>User</th>
            <th style={{ textAlign: "center" }}>Wins</th>
            <th style={{ textAlign: "center" }}>Losses</th>
            <th style={{ textAlign: "center" }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((ranking) => (
            <tr key={ranking.rank}>
              <td style={{ textAlign: "center" }}>{ranking.rank}</td>
              <td style={{ textAlign: "center" }}>
                <Image
                  className={styles.profilepic}
                  src={ranking.imageUrl}
                  width={50}
                  height={50}
                  alt="Picture of the user"
                />
              </td>
              <td style={{ textAlign: "center" }}>{ranking.username}</td>
              <td style={{ textAlign: "center" }}>{ranking.totalWins}</td>
              <td style={{ textAlign: "center" }}>{ranking.totalLosses}</td>
              <td style={{ textAlign: "center" }}>
                <b>{ranking.totalPoints}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingsTable;
