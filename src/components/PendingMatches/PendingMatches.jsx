"use client";
import { useEffect, useState } from "react";
import styles from "./PendingMatches.module.css";
import PendingMatch from "./PendingMatch/PendingMatch";
import { getPendingMatches } from "@/utils/api";
import Spinner from "../Spinner/Spinner";

const PendingMatches = ({ currentUser }) => {
  const [pendingMatches, setPendingMatches] = useState([]);
  const [pendingMatchHandled, setPendingMatchHandled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPendingMatches = async (currentUser) => {
    try {
      const data = await getPendingMatches(currentUser);
      setPendingMatches(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchPendingMatches(currentUser?.userId);
    }
  }, [currentUser, pendingMatchHandled]);

  return (
    <div className={styles.container}>
      {loading ? (
        <Spinner />
      ) : pendingMatches?.length > 0 ? (
        pendingMatches.map((match) => {
          return (
            <PendingMatch
              key={match.matchId}
              pendingMatchData={match}
              setPendingMatchHandled={setPendingMatchHandled}
              pendingMatchHandled={pendingMatchHandled}
              currentUser={currentUser}
            />
          );
        })
      ) : (
        <p className={styles.message}>
          All caught up! <br /> There are no pending matches to confirm right
          now.
        </p>
      )}
    </div>
  );
};

export default PendingMatches;
