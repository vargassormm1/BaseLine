"use client";

import { Table } from "antd";
import Image from "next/image";
import styles from "./RankingsTable.module.css";

const RankingsTable = ({ rankings }) => {
  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      align: "center",
    },
    {
      title: "",
      dataIndex: "imageUrl",
      key: "imageUrl",
      align: "center",
      render: (text) => (
        <Image
          className={styles.profilepic}
          src={text}
          width={50}
          height={50}
          alt="Picture of the user"
        />
      ),
    },
    {
      title: "User",
      dataIndex: "username",
      key: "username",
      align: "center",
    },
    {
      title: "Wins",
      key: "totalWins",
      align: "center",
      dataIndex: "totalWins",
    },
    {
      title: "Losses",
      dataIndex: "totalLosses",
      key: "totalLosses",
      align: "center",
    },
    {
      title: "Points",
      dataIndex: "totalPoints",
      key: "totalPoints",
      align: "center",
      render: (text) => <b>{text}</b>,
    },
  ];
  return (
    <Table
      columns={columns}
      dataSource={rankings}
      pagination={false}
      className={styles.rankingTable}
    />
  );
};

export default RankingsTable;
