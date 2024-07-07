"use client";
import { useEffect, useState } from "react";
import styles from "./ProfileMatchHistory.module.css";
import Match from "../Match/Match";
import { getAllUserMatches } from "@/utils/api";
import Spinner from "@/components/Spinner/Spinner";

const ProfileMatchHistory = ({ currentUser }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async (userId) => {
      const data = await getAllUserMatches(userId);
      setMatches(data);
      setLoading(false);
    };
    getData(currentUser.userId);
  }, [currentUser.userId]);

  return (
    <div className={styles.container}>
      <h3>Match History</h3>
      {loading ? (
        <Spinner />
      ) : matches.length > 0 ? (
        matches.map((match) => {
          return <Match key={match.matchId} matchData={match} />;
        })
      ) : (
        <p className={styles.message}>
          No matches played yet. Start your first game and track your journey
          here!
        </p>
      )}
    </div>
  );
};

export default ProfileMatchHistory;
