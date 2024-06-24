"use client";
import { useEffect, useState, Suspense } from "react";
import styles from "./HomeContent.module.css";
import NewMatchForm from "@/components/NewMatchForm/NewMatchForm";
import Spinner from "@/components/Spinner/Spinner";
import Match from "../Match/Match";
import { getAllMatches } from "@/utils/api";

const HomeContent = ({ currentUser, users }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    const data = await getAllMatches();
    setMatches(data);
    setLoading(false);
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
      {loading ? (
        <Spinner />
      ) : (
        matches.map((match) => {
          return <Match key={match.matchId} matchData={match} />;
        })
      )}
    </div>
  );
};

export default HomeContent;
