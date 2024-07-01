import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "30 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const GET = async (request) => {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const userId1 = request.nextUrl.searchParams.get("user1");
    const userId2 = request.nextUrl.searchParams.get("user2");

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
        playerOneUser: {
          select: {
            imageUrl: true,
          },
        },
        playerTwoUser: {
          select: {
            imageUrl: true,
          },
        },
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
