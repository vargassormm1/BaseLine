"use client";
import { useEffect, useState } from "react";
import styles from "./PendingMatches.module.css";
import PendingMatch from "./PendingMatch/PendingMatch";
import { getPendingMatches } from "@/utils/api";

const PendingMatches = ({ currentUser }) => {
  const [pendingMatches, setPendingMatches] = useState([]);
  const [pendingMatchHandled, setPendingMatchHandled] = useState(false);

  const fetchPendingMatches = async (currentUser) => {
    const data = await getPendingMatches(currentUser);
    setPendingMatches(data);
  };

  useEffect(() => {
    if (currentUser) {
      fetchPendingMatches(currentUser.userId);
    }
  }, [currentUser, pendingMatchHandled]);

  return (
    <div className={styles.container}>
      {pendingMatches?.length > 0 ? (
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
