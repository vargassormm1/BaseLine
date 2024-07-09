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

export const DELETE = async (request) => {
  try {
    const { protect } = auth();
    protect();

    const ip = request.headers.get("x-forwarded-for") ?? "";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const data = await request.json();

    if (!data.matchId) {
      return NextResponse.json(
        { error: "Invalid matchId. It must be a number." },
        { status: 400 }
      );
    }

    await prisma.matchDetails.deleteMany({
      where: { matchId: data.matchId },
    });

    const deletedMatch = await prisma.matches.delete({
      where: { matchId: data.matchId },
    });

    return NextResponse.json({ data: deletedMatch });
  } catch (error) {
    console.error("Error in deny match:", error);
    return NextResponse.json(
      { error: "An error occurred while denying the match." },
      { status: 500 }
    );
  }
};
