"use client";
import { Table, Button } from "antd";
import styles from "./Match.module.css";
const Match = ({ matchData }) => {
  // Dynamically generate columns from the matchDetails, with the first being player names
  const uniqueSets = [
    ...new Set(matchData.matchDetails.map((detail) => detail.setNumber)),
  ];

  const columns = [
    {
      title: "Players",
      dataIndex: "playerName",
      key: "playerName",
      align: "center",
    },
    ...uniqueSets.map((setNumber) => ({
      title: `Set ${setNumber}`,
      dataIndex: `set${setNumber}`,
      key: `set${setNumber}`,
      align: "center",
      render: (score, record) => (
        <>
          {score.main}
          {score.tieBreaker && <sup>{score.tieBreaker}</sup>}
        </>
      ),
    })),
  ];

  // Transforming dataSource to fit the new columns setup
  const dataSource = [
    {
      key: "playerOne",
      playerName: matchData.playerOneUsername,
      playerUserId: matchData.playerOne,
      ...uniqueSets.reduce((acc, setNumber) => {
        const setDetails = matchData.matchDetails.find(
          (detail) => detail.setNumber === setNumber
        );
        acc[`set${setNumber}`] = {
          main: setDetails.playerOneScore,
          tieBreaker: setDetails.playerOneTieBreakerScore,
        };
        return acc;
      }, {}),
    },
    {
      key: "playerTwo",
      playerName: matchData.playerTwoUsername,
      playerUserId: matchData.playerTwo,
      ...uniqueSets.reduce((acc, setNumber) => {
        const setDetails = matchData.matchDetails.find(
          (detail) => detail.setNumber === setNumber
        );
        acc[`set${setNumber}`] = {
          main: setDetails.playerTwoScore,
          tieBreaker: setDetails.playerTwoTieBreakerScore,
        };
        return acc;
      }, {}),
    },
  ];

  const getRowClassName = (record) => {
    return matchData.winnerId === record.playerUserId ? styles.boldRow : "";
  };

  return (
    <div className={styles.match}>
      <p className={styles.date}>
        {new Date(matchData.playedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
      </p>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        rowClassName={getRowClassName}
        className={styles.matchTable}
      />
    </div>
  );
};
export default Match;
