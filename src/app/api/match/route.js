import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const POST = async (request) => {
  const data = await request.json();

  const loserId =
    data.playerOne === data.winner ? data.playerTwo : data.playerOne;

  const newMatch = await prisma.matches.create({
    data: {
      playerOne: data.playerOne,
      playerTwo: data.playerTwo,
      playerOneUsername: data.playerOneUsername,
      playerTwoUsername: data.playerTwoUsername,
      matchType: parseInt(data.matchType),
      winnerId: data.winner,
      loserId: loserId,
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
    where: { userId: data.winner },
    data: {
      totalPoints: { increment: pointsToAdd },
      totalWins: { increment: 1 },
    },
  });

  await prisma.user.update({
    where: { userId: loserId },
    data: {
      totalLosses: { increment: 1 },
    },
  });

  return NextResponse.json({ data: newMatch });
};
