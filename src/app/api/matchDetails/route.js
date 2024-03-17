import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const POST = async (request) => {
  const data = await request.json();
  const newMatchDetail = await prisma.matchDetails.create({
    data: {
      matchId: data.matchId,
      setNumber: parseInt(data.set),
      playerOneScore: data.playeroneScore,
      playerTwoScore: data.playertwoScore,
      playerOneTieBreakerScore: data.playeroneTieBreakerScore
        ? data.playeroneTieBreakerScore
        : null,
      playerTwoTieBreakerScore: data.playertwoTieBreakerScore
        ? data.playertwoTieBreakerScore
        : null,
    },
  });

  return NextResponse.json({ data: newMatchDetail });
};

export const GET = async () => {
  const matchesWithScores = await prisma.matches.findMany({
    include: {
      matchDetails: true,
    },
    orderBy: {
      playedAt: "desc",
    },
  });

  return NextResponse.json({ data: matchesWithScores });
};
