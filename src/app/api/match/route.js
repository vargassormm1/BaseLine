import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "30 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const POST = async (request) => {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

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
