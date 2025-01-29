"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import styles from "./RankingsTable.module.css";
import { getRankings } from "../../utils/api";
import Spinner from "../Spinner/Spinner";
import Link from "next/link";

const RankingsTable = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getUserRankings = useCallback(async (year) => {
    try {
      const response = await getRankings(year); 
      setRankings(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getUserRankings(selectedYear); 
  }, [getUserRankings, selectedYear]);

  return (
    <div className={styles.rankingTable}>
      <div className={styles.filterContainer}>
        <select
          id="yearFilter"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="all">All Time</option>
          {Array.from(
            { length: new Date().getFullYear() - 2024 + 1 },
            (_, i) => 2024 + i
          ).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
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
            {rankings.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                  Still waiting for the first game of the year!
                </td>
              </tr>
            ) : (
              rankings?.map((ranking) => (
                <tr key={ranking.rank}>
                  <td style={{ textAlign: "center" }}>{ranking.rank}</td>
                  <td style={{ textAlign: "center" }}>
                    <Link href={`/profile/${ranking.userId}`}>
                      <Image
                        className={styles.profilepic}
                        src={ranking.imageUrl}
                        width={50}
                        height={50}
                        alt="Picture of the user"
                      />
                    </Link>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Link href={`/profile/${ranking.userId}`}>
                      {ranking.username}
                    </Link>
                  </td>
                  <td style={{ textAlign: "center" }}>{ranking.totalWins}</td>
                  <td style={{ textAlign: "center" }}>{ranking.totalLosses}</td>
                  <td style={{ textAlign: "center" }}>
                    <b>{ranking.totalPoints}</b>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RankingsTable;
