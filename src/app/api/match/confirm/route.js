import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { auth } from "@clerk/nextjs/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "15 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const PUT = async (request) => {
  try {
    const { protect, userId } = auth();
    protect();

    const { success } = await ratelimit.limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if the user exists in the database
    const prismaUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Validate the data
    const data = await request.json();
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
    await prisma.$transaction([
      prisma.user.update({
        where: { userId: data.winnerId },
        data: {
          totalPoints: { increment: pointsToAdd },
          totalWins: { increment: 1 },
        },
      }),
      prisma.user.update({
        where: { userId: data.loserId },
        data: {
          totalLosses: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({ data: confirmedMatch });
  } catch (error) {
    console.error("Error in confirm match:", error);
    return NextResponse.json(
      { error: "An error occurred while confirming the match." },
      { status: 500 }
    );
  }
};
