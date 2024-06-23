import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async (req, { params }) => {
  try {
    const userId = parseInt(params.userId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    }

    const pendingMatches = await prisma.matches.findMany({
      where: {
        scoreVisible: false,
        OR: [{ playerOne: userId }, { playerTwo: userId }],
        AND: [{ playerOneConfirmed: true }, { playerTwoConfirmed: false }],
      },
      include: {
        matchDetails: true,
      },
      orderBy: {
        playedAt: "desc",
      },
    });

    return NextResponse.json({ data: pendingMatches });
  } catch (error) {
    console.error("Error fetching pending matches:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching pending matches." },
      { status: 500 }
    );
  }
};
