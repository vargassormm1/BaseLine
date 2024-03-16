import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async () => {
  const rankingTable = await prisma.user.findMany({
    select: {
      username: true,
      totalWins: true,
      totalLosses: true,
      totalPoints: true,
      imageUrl: true,
    },
    orderBy: {
      totalPoints: "desc",
    },
  });
  const rankedTable = rankingTable.map((user, index) => ({
    rank: index + 1,
    key: user.username,
    ...user,
  }));

  return NextResponse.json({ data: rankedTable });
};
