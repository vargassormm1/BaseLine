import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async (req, { params }) => {
  const userId = params.userId;

  const pendingMatches = await prisma.matches.count({
    where: {
      scoreVisible: false,
      OR: [{ playerOne: parseInt(userId) }, { playerTwo: parseInt(userId) }],
      AND: [{ playerOneConfirmed: true }, { playerTwoConfirmed: false }],
    },
  });

  return NextResponse.json({ data: pendingMatches });
};
