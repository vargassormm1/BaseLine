import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async (req, { params }) => {
  try {
    const userId = parseInt(params.userId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    }

    const pendingMatchesCount = await prisma.matches.count({
      where: {
        scoreVisible: false,
        OR: [{ playerOne: userId }, { playerTwo: userId }],
        AND: [{ playerOneConfirmed: true }, { playerTwoConfirmed: false }],
      },
    });

    return NextResponse.json({ data: pendingMatchesCount });
  } catch (error) {
    console.error("Error fetching pending matches count:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching pending matches count." },
      { status: 500 }
    );
  }
};
