import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const PUT = async (request) => {
  const data = await request.json();

  const confirmedMatch = await prisma.matches.update({
    where: { matchId: data.matchId },
    data: {
      playerOneConfirmed: true,
      playerTwoConfirmed: true,
      scoreVisible: true,
    },
  });

  let pointsToAdd = 0;
  switch (parseInt(data.matchType)) {
    case 1:
      pointsToAdd = 5;
      break;
    case 3:
      pointsToAdd = 10;
      break;
    case 5:
      pointsToAdd = 20;
      break;
    default:
      console.log("Invalid match type for points increment.");
  }

  await prisma.user.update({
    where: { userId: data.winnerId },
    data: {
      totalPoints: { increment: pointsToAdd },
      totalWins: { increment: 1 },
    },
  });

  await prisma.user.update({
    where: { userId: data.loserId },
    data: {
      totalLosses: { increment: 1 },
    },
  });

  return NextResponse.json({ data: confirmedMatch });
};
