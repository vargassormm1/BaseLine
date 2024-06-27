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

export const GET = async (request, { params }) => {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const userId = parseInt(params.userId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    }

    const userMatches = await prisma.matches.findMany({
      where: {
        AND: [
          { playerOneConfirmed: true },
          { playerTwoConfirmed: true },
          { scoreVisible: true },
          {
            OR: [{ playerOne: userId }, { playerTwo: userId }],
          },
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

    return NextResponse.json({ data: userMatches });
  } catch (error) {
    console.error("Error fetching pending matches:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching pending matches." },
      { status: 500 }
    );
  }
};