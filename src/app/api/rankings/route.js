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

    // Get rankings and format
    const rankingTable = await prisma.user.findMany({
      select: {
        username: true,
        totalWins: true,
        totalLosses: true,
        totalPoints: true,
        imageUrl: true,
        userId: true,
      },
    });

    const rankedTable = rankingTable
      .map((user) => ({
        ...user,
        winLossRatio:
          user.totalLosses === 0
            ? user.totalWins
            : user.totalWins / user.totalLosses,
      }))
      .sort((a, b) => {
        if (b.totalPoints === a.totalPoints) {
          return b.winLossRatio - a.winLossRatio;
        }
        return b.totalPoints - a.totalPoints;
      })
      .map((user, index) => ({
        rank: index + 1,
        key: user.username,
        ...user,
      }));

    return NextResponse.json({ data: rankedTable });
  } catch (error) {
    console.error("Error fetching ranking table:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking table" },
      { status: 500 }
    );
  }
};
