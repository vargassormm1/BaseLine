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

    const searchParams = request.nextUrl.searchParams.get("year");
    const year = searchParams === "all" ? "all" : parseInt(searchParams, 10);

    if (year !== "all" && (isNaN(year) || year < 2024)) {
      return NextResponse.json(
        {
          error: "Invalid year parameter. Year must be 'all' or 2024 onwards.",
        },
        { status: 400 }
      );
    }

    // Build the date filter based on the year
    const dateFilter =
      year === "all"
        ? undefined
        : {
            playedAt: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          };

    // Fetch matches
    const matches = await prisma.matches.findMany({
      where: dateFilter,
      include: {
        playerOneUser: true,
        playerTwoUser: true,
      },
    });

    // Aggregate rankings
    const userStats = {};

    matches.forEach((match) => {
      const { playerOneUser, playerTwoUser, winnerId, loserId } = match;

      if (!userStats[playerOneUser.userId]) {
        userStats[playerOneUser.userId] = {
          userId: playerOneUser.userId,
          username: playerOneUser.username,
          totalWins: 0,
          totalLosses: 0,
          totalPoints: playerOneUser.totalPoints,
          imageUrl: playerOneUser.imageUrl,
        };
      }

      if (!userStats[playerTwoUser.userId]) {
        userStats[playerTwoUser.userId] = {
          userId: playerTwoUser.userId,
          username: playerTwoUser.username,
          totalWins: 0,
          totalLosses: 0,
          totalPoints: playerTwoUser.totalPoints,
          imageUrl: playerTwoUser.imageUrl,
        };
      }

      if (winnerId) {
        userStats[winnerId].totalWins += 1;
        userStats[loserId].totalLosses += 1;
      }
    });

    // Convert to an array and sort
    const rankedTable = Object.values(userStats)
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
