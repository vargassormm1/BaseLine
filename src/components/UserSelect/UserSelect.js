"use client";
import { useState, useEffect } from "react";
import { Select } from "antd";
import Image from "next/image";
import H2HMatches from "../H2HMatches/H2Hmatches";
import { getH2hMatches } from "@/utils/api";
import styles from "./UserSelect.module.css";

const UserSelect = ({ users }) => {
  const [user1, setUser1] = useState(null);
  const [user1Wins, setUser1Wins] = useState(0);
  const [user2, setUser2] = useState(null);
  const [user2Wins, setUser2Wins] = useState(0);
  const [matches, setMatches] = useState([]);

  const handleSelectUser1Change = (userId) => {
    const user = users.find((user) => user?.userId === userId);
    setUser1(user);
  };

  const handleSelectUser2Change = (userId) => {
    const user = users.find((user) => user?.userId === userId);
    setUser2(user);
  };

  useEffect(() => {
    const getMatches = async (user1, user2) => {
      if (user1?.userId && user2?.userId) {
        const allMatches = await getH2hMatches(user1?.userId, user2?.userId);
        setMatches(allMatches);

        const user1Wins = allMatches?.filter(
          (el) => el.winnerId === user1?.userId
        );
        setUser1Wins(user1Wins?.length);
        const user2Wins = allMatches?.filter(
          (el) => el.winnerId === user2?.userId
        );
        setUser2Wins(user2Wins?.length);
      } else {
        return;
      }
    };
    getMatches(user1, user2);
  }, [user1, user2]);

  return (
    <div className={styles.container}>
      <div className={styles.players}>
        <div className={styles.player}>
          <h3>Player 1</h3>
          <Select
            className={styles.select}
            options={users}
            onChange={(userId) => handleSelectUser1Change(userId)}
          />
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
              <></>
            )}
          </div>
        </div>

        <div className={styles.player}>
          <h3>Player 2</h3>
          <Select
            className={styles.select}
            options={users}
            onChange={(userId) => handleSelectUser2Change(userId)}
          />
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
              <></>
            )}
          </div>
        </div>
      </div>

      <H2HMatches matches={matches} />
    </div>
  );
};

export default UserSelect;
