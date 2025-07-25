"use client";
import { useState } from "react";
import styles from "./HomeContent.module.css";
import NewMatchForm from "@/components/NewMatchForm/NewMatchForm";
import Match from "../Match/Match";
import { getAllMatches } from "@/utils/api";

const HomeContent = ({ currentUser, users, initialMatches }) => {
  const [matches, setMatches] = useState(initialMatches);

  const refetchMatches = async () => {
    const data = await getAllMatches();
    setMatches(data);
  };

  return (
    <div className={styles.container}>
      <NewMatchForm
        currentUser={currentUser}
        refetchMatches={refetchMatches}
        users={users}
      />
      {matches.map((m) => (
        <Match key={m.matchId} matchData={m} />
      ))}
    </div>
  );
};

export default HomeContent;
