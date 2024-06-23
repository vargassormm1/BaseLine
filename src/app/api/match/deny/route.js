import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const DELETE = async (request) => {
  try {
    const data = await request.json();

    if (!data.matchId) {
      return NextResponse.json(
        { error: "Invalid matchId. It must be a number." },
        { status: 400 }
      );
    }

    await prisma.matchDetails.deleteMany({
      where: { matchId: data.matchId },
    });

    const deletedMatch = await prisma.matches.delete({
      where: { matchId: data.matchId },
    });

    return NextResponse.json({ data: deletedMatch });
  } catch (error) {
    console.error("Error in deny match:", error);
    return NextResponse.json(
      { error: "An error occurred while denying the match." },
      { status: 500 }
    );
  }
};
