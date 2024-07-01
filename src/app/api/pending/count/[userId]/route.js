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

    const pendingMatchesCount = await prisma.matches.count({
      where: {
        scoreVisible: false,
        OR: [{ playerOne: userId }, { playerTwo: userId }],
        AND: [{ playerOneConfirmed: true }, { playerTwoConfirmed: false }],
      },
    });

    return NextResponse.json({ data: pendingMatchesCount });
  } catch (error) {
    console.error("Error fetching pending matches count:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching pending matches count." },
      { status: 500 }
    );
  }
};
