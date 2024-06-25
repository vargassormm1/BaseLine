"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import H2HMatches from "../H2HMatches/H2Hmatches";
import { getH2hMatches } from "@/utils/api";
import styles from "./UserSelect.module.css";
import Spinner from "../Spinner/Spinner";

const UserSelect = ({ users }) => {
  const [user1, setUser1] = useState(null);
  const [user1Wins, setUser1Wins] = useState(0);
  const [user2, setUser2] = useState(null);
  const [user2Wins, setUser2Wins] = useState(0);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const loader = useRef(null);

  const handleObserver = (entities) => {
    const target = entities[0];
    if (target.isIntersecting) {
      setPage((prev) => prev + 1);
    }
  };

  const handleSelectUser1Change = (event) => {
    const userId = parseInt(event.target.value);
    const user = users.find((user) => user?.userId === userId);
    setUser1(user);
    setPage(1);
    setMatches([]);
  };

  const handleSelectUser2Change = (event) => {
    const userId = parseInt(event.target.value);
    const user = users.find((user) => user?.userId === userId);
    setUser2(user);
    setPage(1);
    setMatches([]);
  };

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
    const getMatches = async (user1, user2) => {
      if (user1?.userId && user2?.userId) {
        setLoading(true);
        try {
          const allMatches = await getH2hMatches(
            user1?.userId,
            user2?.userId,
            page
          );
          setMatches((prev) => [...prev, ...allMatches]);

          const user1Wins = allMatches?.filter(
            (el) => el.winnerId === user1?.userId
          );
          setUser1Wins(user1Wins?.length);

          const user2Wins = allMatches?.filter(
            (el) => el.winnerId === user2?.userId
          );
          setUser2Wins(user2Wins?.length);
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      }
    };
    getMatches(user1, user2);
  }, [page, user1, user2]);

  return (
    <div className={styles.container}>
      <div className={styles.players}>
        <div className={styles.player}>
          <h3>Player 1</h3>
          <div className={styles.customSelect}>
            <select onChange={handleSelectUser1Change}>
              <option value="">Select Player 1</option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.image}>
            {user1 ? (
              <>
                <Image
                  src={user1.imageUrl}
                  width={300}
                  height={300}
                  alt="Picture of the user"
                  className={styles.profileImage}
                />
                <h3>Wins: {user1Wins}</h3>
              </>
            ) : (
              <p>No player selected</p>
            )}
          </div>
        </div>

        <div className={styles.player}>
          <h3>Player 2</h3>
          <div className={styles.customSelect}>
            <select
              className={styles.select}
              onChange={handleSelectUser2Change}
            >
              <option value="">Select Player 2</option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.image}>
            {user2 ? (
              <>
                <Image
                  src={user2.imageUrl}
                  width={300}
                  height={300}
                  alt="Picture of the user"
                  className={styles.profileImage}
                />
                <h3>Wins: {user2Wins}</h3>
              </>
            ) : (
              <p>No player selected</p>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : user1 && user2 ? (
        <H2HMatches matches={matches} />
      ) : (
        <></>
      )}
      <div ref={loader} />
    </div>
  );
};

export default UserSelect;
