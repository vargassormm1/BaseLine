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

export const GET = async (request) => {
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

    // Get user Ids
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

    // Get all user matches
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
    console.error("Error fetching h2h matches:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching h2h matches." },
      { status: 500 }
    );
  }
};
