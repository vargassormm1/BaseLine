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

    const rankingTable = await prisma.user.findMany({
      select: {
        username: true,
        totalWins: true,
        totalLosses: true,
        totalPoints: true,
        imageUrl: true,
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
