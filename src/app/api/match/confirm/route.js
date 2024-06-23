import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const PUT = async (request) => {
  try {
    const data = await request.json();

    // Validate the data
    if (!data.matchId || !data.matchType || !data.winnerId || !data.loserId) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Update the match confirmation status
    const confirmedMatch = await prisma.matches.update({
      where: { matchId: data.matchId },
      data: {
        playerOneConfirmed: true,
        playerTwoConfirmed: true,
        scoreVisible: true,
      },
    });

    // Determine points to add based on match type
    let pointsToAdd = 0;
    switch (parseInt(data.matchType, 10)) {
      case 1:
        pointsToAdd = 5;
        break;
      case 3:
        pointsToAdd = 10;
        break;
      case 5:
        pointsToAdd = 20;
        break;
      default:
        throw new Error("Invalid match type for points increment.");
    }

    // Update the winner's and loser's records
    await prisma.user.update({
      where: { userId: data.winnerId },
      data: {
        totalPoints: { increment: pointsToAdd },
        totalWins: { increment: 1 },
      },
    });

    await prisma.user.update({
      where: { userId: data.loserId },
      data: {
        totalLosses: { increment: 1 },
      },
    });

    return NextResponse.json({ data: confirmedMatch });
  } catch (error) {
    console.error("Error in confirm match:", error);
    return NextResponse.json(
      { error: "An error occurred while confirming the match." },
      { status: 500 }
    );
  }
};
