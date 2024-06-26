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
      !data.matchId ||
      !data.set ||
      !data.playeroneScore ||
      !data.playertwoScore
    ) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

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
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
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
