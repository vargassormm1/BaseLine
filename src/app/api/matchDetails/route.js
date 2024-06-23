import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const POST = async (request) => {
  try {
    const data = await request.json();

    if (
      !data.matchId ||
      !data.set ||
      !data.playeroneScore ||
      !data.playertwoScore
    ) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    const newMatchDetail = await prisma.matchDetails.create({
      data: {
        matchId: data.matchId,
        setNumber: parseInt(data.set, 10),
        playerOneScore: data.playeroneScore,
        playerTwoScore: data.playertwoScore,
        playerOneTieBreakerScore: data.playeroneTieBreakerScore || null,
        playerTwoTieBreakerScore: data.playertwoTieBreakerScore || null,
      },
    });

    return NextResponse.json({ data: newMatchDetail });
  } catch (error) {
    console.error("Error creating match detail:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the match detail." },
      { status: 500 }
    );
  }
};

export const GET = async () => {
  try {
    const matchesWithScores = await prisma.matches.findMany({
      where: {
        AND: [
          { playerOneConfirmed: true },
          { playerTwoConfirmed: true },
          { scoreVisible: true },
        ],
      },
      include: {
        matchDetails: true,
      },
      orderBy: {
        playedAt: "desc",
      },
    });

    return NextResponse.json({ data: matchesWithScores });
  } catch (error) {
    console.error("Error fetching matches with scores:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching matches with scores." },
      { status: 500 }
    );
  }
};
