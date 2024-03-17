"use client";
import { useEffect, useState } from "react";
import prisma from "@/utils/db";
import { Table } from "antd";
import Image from "next/image";
import { getRankings } from "@/utils/api";
import styles from "./Rankings.module.css";

const Rankings = () => {
  const [rankings, setRankings] = useState([]);
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
      title: "Losses",
      dataIndex: "totalLosses",
      key: "totalLosses",
      align: "center",
    },
    {
      title: "Wins",
      key: "totalWins",
      align: "center",
      dataIndex: "totalWins",
    },
    {
      title: "Points",
      dataIndex: "totalPoints",
      key: "totalPoints",
      align: "center",
      render: (text) => <b>{text}</b>,
    },
  ];

  console.log(rankings);

  useEffect(() => {
    const getData = async () => {
      const ranks = await getRankings();
      setRankings(ranks);
    };
    getData();
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>World Rankings</h2>
      <Table
        columns={columns}
        dataSource={rankings}
        pagination={false}
        className={styles.rankingTable}
      />
    </div>
  );
};

export default Rankings;
