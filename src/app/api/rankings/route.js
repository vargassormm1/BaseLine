import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async () => {
  try {
    const rankingTable = await prisma.user.findMany({
      select: {
        username: true,
        totalWins: true,
        totalLosses: true,
        totalPoints: true,
        imageUrl: true,
      },
    });

    const rankedTable = rankingTable
      .map((user) => ({
        ...user,
        winLossRatio:
          user.totalLosses === 0
            ? user.totalWins
            : user.totalWins / user.totalLosses,
      }))
      .sort((a, b) => {
        if (b.totalPoints === a.totalPoints) {
          return b.winLossRatio - a.winLossRatio;
        }
        return b.totalPoints - a.totalPoints;
      })
      .map((user, index) => ({
        rank: index + 1,
        key: user.username,
        ...user,
      }));

    return NextResponse.json({ data: rankedTable });
  } catch (error) {
    console.error("Error fetching ranking table:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking table" },
      { status: 500 }
    );
  }
};
