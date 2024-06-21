"use client";
import styles from "./PendingMatch.module.css";
import { confirmPendingMatch, denyPendingMatch } from "@/utils/api";

const PendingMatch = ({
  pendingMatchData,
  setPendingMatchHandled,
  pendingMatchHandled,
  currentUser,
}) => {
  const uniqueSets = [
    ...new Set(pendingMatchData.matchDetails.map((detail) => detail.setNumber)),
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
      playerName: pendingMatchData.playerOneUsername,
      playerUserId: pendingMatchData.playerOne,
      ...uniqueSets.reduce((acc, setNumber) => {
        const setDetails = pendingMatchData.matchDetails.find(
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
      playerName: pendingMatchData.playerTwoUsername,
      playerUserId: pendingMatchData.playerTwo,
      ...uniqueSets.reduce((acc, setNumber) => {
        const setDetails = pendingMatchData.matchDetails.find(
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
    return pendingMatchData.winnerId === record.playerUserId
      ? styles.boldRow
      : "";
  };

  const handleConfirm = async () => {
    try {
      await confirmPendingMatch(pendingMatchData);
      setPendingMatchHandled(!pendingMatchHandled);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeny = async () => {
    try {
      await denyPendingMatch(pendingMatchData);
      setPendingMatchHandled(!pendingMatchHandled);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className={styles.match}>
      <p className={styles.date}>
        {new Date(pendingMatchData.playedAt).toLocaleDateString("en-US", {
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
      {pendingMatchData?.playerTwo !== currentUser?.userId ? (
        <div className={styles.pendingMessage}>Waiting for approval...</div>
      ) : (
        <div className={styles.pendingButtons}>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            Confirm
          </button>
          <button className={styles.denyButton} onClick={handleDeny}>
            Deny
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingMatch;
