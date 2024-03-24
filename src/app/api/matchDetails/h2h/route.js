import { NextResponse } from "next/server";
import prisma from "../../../../utils/db";

export const GET = async (req) => {
  const userId1 = req.nextUrl.searchParams.get("user1");
  const userId2 = req.nextUrl.searchParams.get("user2");

  const numUserId1 = userId1 ? parseInt(userId1, 10) : 0;
  const numUserId2 = userId2 ? parseInt(userId2, 10) : 0;

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
};
