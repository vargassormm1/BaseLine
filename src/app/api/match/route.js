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
      playerOneConfirmed: data.playerOneConfirmed,
    },
  });

  return NextResponse.json({ data: newMatch });
};
