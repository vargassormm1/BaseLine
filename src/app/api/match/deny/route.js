import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const DELETE = async (request) => {
  const data = await request.json();

  const deleteMatchDetails = await prisma.matchDetails.deleteMany({
    where: {
      matchId: data.matchId,
    },
  });

  const deleteMatch = await prisma.matches.delete({
    where: {
      matchId: data.matchId,
    },
  });

  return NextResponse.json({ data: deleteMatch });
};
