"use client";
import { Table } from "antd";

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

  return (
    <div>
      <div>
        <strong>Played At:</strong>{" "}
        {new Date(matchData.playedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
        <br />
        <strong>Winner:</strong>{" "}
        {matchData.winnerId === matchData.playerOne
          ? matchData.playerOneUsername
          : matchData.playerTwoUsername}
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        align
      />
    </div>
  );
};
export default Match;
