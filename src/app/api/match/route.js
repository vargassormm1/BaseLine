import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "15 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const POST = async (request) => {
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
    if (
      !data.playerOne ||
      !data.playerTwo ||
      !data.playerOneUsername ||
      !data.playerTwoUsername ||
      !data.matchType ||
      !data.winner ||
      !data.playerOneConfirmed
    ) {
      return NextResponse.json(
        { error: "Invalid match data" },
        { status: 400 }
      );
    }

    // Create new match
    const loserId =
      data.playerOne === data.winner ? data.playerTwo : data.playerOne;

    const newMatch = await prisma.matches.create({
      data: {
        playerOne: data.playerOne,
        playerTwo: data.playerTwo,
        playerOneUsername: data.playerOneUsername,
        playerTwoUsername: data.playerTwoUsername,
        matchType: parseInt(data.matchType, 10),
        winnerId: data.winner,
        loserId: loserId,
        playerOneConfirmed: data.playerOneConfirmed,
      },
    });

    return NextResponse.json({ data: newMatch });
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the match" },
      { status: 500 }
    );
  }
};
