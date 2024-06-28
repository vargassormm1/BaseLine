"use client";
import styles from "./Match.module.css";
import Image from "next/image";
import Link from "next/link";

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
      playerImage: matchData.playerOneUser.imageUrl,
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
      playerImage: matchData.playerTwoUser.imageUrl,
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

  console.log(matchData);

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
              <td className={styles.playerInfo} style={{ textAlign: "center" }}>
                <Link href={`/profile/${record.playerUserId}`}>
                  <Image
                    src={record.playerImage}
                    width={40}
                    height={40}
                    alt="Picture of the user"
                    className={styles.profileImage}
                  />
                </Link>
                <Link href={`/profile/${record.playerUserId}`}>
                  {record.playerName}
                </Link>
              </td>
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
