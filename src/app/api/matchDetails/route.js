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

    // Validate the data
    const data = await request.json();
    if (
      !data.matchId ||
      !data.set ||
      data.playeroneScore === undefined ||
      data.playertwoScore === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Create new match detail
    const newMatchDetail = await prisma.matchDetails.create({
      data: {
        matchId: data.matchId,
        setNumber: parseInt(data.set, 10),
        playerOneScore: data.playeroneScore,
        playerTwoScore: data.playertwoScore,
        playerOneTieBreakerScore: data.playeroneTieBreakerScore || null,
        playerTwoTieBreakerScore: data.playertwoTieBreakerScore || null,
      },
    });

    return NextResponse.json({ data: newMatchDetail });
  } catch (error) {
    console.error("Error creating match detail:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the match detail." },
      { status: 500 }
    );
  }
};

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

    const matchesWithScores = await prisma.matches.findMany({
      where: {
        AND: [
          { playerOneConfirmed: true },
          { playerTwoConfirmed: true },
          { scoreVisible: true },
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

    return NextResponse.json({ data: matchesWithScores });
  } catch (error) {
    console.error("Error fetching matches with scores:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching matches with scores." },
      { status: 500 }
    );
  }
};
