import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async (req) => {
  try {
    const userId1 = req.nextUrl.searchParams.get("user1");
    const userId2 = req.nextUrl.searchParams.get("user2");

    if (!userId1 || !userId2) {
      return NextResponse.json(
        { error: "Missing required query parameters." },
        { status: 400 }
      );
    }

    const numUserId1 = parseInt(userId1, 10);
    const numUserId2 = parseInt(userId2, 10);

    if (isNaN(numUserId1) || isNaN(numUserId2)) {
      return NextResponse.json(
        { error: "Query parameters must be valid numbers." },
        { status: 400 }
      );
    }

    const matches = await prisma.matches.findMany({
      where: {
        OR: [
          { AND: [{ playerOne: numUserId1 }, { playerTwo: numUserId2 }] },
          { AND: [{ playerOne: numUserId2 }, { playerTwo: numUserId1 }] },
        ],
      },
      include: {
        matchDetails: true,
      },
      orderBy: {
        playedAt: "desc",
      },
    });

    return NextResponse.json({ data: matches });
  } catch (error) {
    console.error("Error fetching head-to-head matches:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching head-to-head matches." },
      { status: 500 }
    );
  }
};
