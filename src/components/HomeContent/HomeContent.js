"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./HomeContent.module.css";
import NewMatchForm from "@/components/NewMatchForm/NewMatchForm";
import Spinner from "@/components/Spinner/Spinner";
import Match from "../Match/Match";
import { getAllMatches } from "@/utils/api";

const HomeContent = ({ currentUser, users }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const loader = useRef(null);

  const handleObserver = (entities) => {
    const target = entities[0];
    if (target.isIntersecting) {
      setPage((prev) => prev + 1);
    }
  };

  const fetchMatches = useCallback(async () => {
    const data = await getAllMatches(page);
    setMatches((prev) => [...prev, ...data]);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 1.0,
    });
    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

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
      <div ref={loader} />
    </div>
  );
};

export default HomeContent;
