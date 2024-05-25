"use client";
import styles from "./Match.module.css";

const Match = ({ matchData }) => {
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
    })),
  ];

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
          month: "long",
          day: "2-digit",
        })}
      </p>
      <table className={styles.matchTable}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: column.align }}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record) => (
            <tr key={record.key} className={getRowClassName(record)}>
              <td style={{ textAlign: "center" }}>{record.playerName}</td>
              {uniqueSets.map((setNumber) => (
                <td key={setNumber} style={{ textAlign: "center" }}>
                  {record[`set${setNumber}`].main}
                  {record[`set${setNumber}`].tieBreaker && (
                    <sup>{record[`set${setNumber}`].tieBreaker}</sup>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Match;
