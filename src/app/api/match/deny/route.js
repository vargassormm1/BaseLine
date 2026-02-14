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

export const DELETE = async (request) => {
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

    // Validate the data
    const data = await request.json();
    if (!data.matchId) {
      return NextResponse.json(
        { error: "Invalid matchId. It must be a number." },
        { status: 400 }
      );
    }

    // Delete Match and MatchDetails
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
