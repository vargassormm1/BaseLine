"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./RankingsTable.module.css";
import { getRankings } from "../../utils/api";
import Spinner from "../Spinner/Spinner";

const RankingsTable = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRankings = async () => {
      try {
        const response = await getRankings();
        setRankings(response);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    getUserRankings();
  }, []);

  return (
    <div className={styles.rankingTable}>
      {loading ? (
        <div className={styles.spinnerContainer}>
          <Spinner />
        </div>
      ) : (
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
            {rankings?.map((ranking) => (
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
      )}
    </div>
  );
};

export default RankingsTable;
