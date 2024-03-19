"use client";
import { useEffect, useState } from "react";
import styles from "./HomeContent.module.css";
import NewMatchForm from "@/components/NewMatchForm/NewMatchForm";
import Match from "../Match/Match";
import { getAllMatches } from "@/utils/api";

const HomeContent = ({ currentUser, users }) => {
  const [matches, setMatches] = useState([]);

  const fetchMatches = async () => {
    const data = await getAllMatches();
    setMatches(data);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <div className={styles.container}>
      <NewMatchForm
        currentUser={currentUser}
        refetchMatches={fetchMatches}
        users={users}
      />
      {matches.map((match) => {
        return <Match key={match.matchId} matchData={match} />;
      })}
    </div>
  );
};

export default HomeContent;
