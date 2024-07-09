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

export const GET = async (request, { params }) => {
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

    const user = parseInt(params.userId, 10);

    if (isNaN(user)) {
      return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    }

    const threads = await prisma.messageThread.findMany({
      where: {
        OR: [{ participant1: user }, { participant2: user }],
      },
      include: {
        user1: true,
        user2: true,
        messages: {
          take: 1,
          orderBy: { timestamp: "desc" },
          include: {
            sender: true,
            receiver: true,
          },
        },
      },
      orderBy: {
        lastUpdated: "desc",
      },
    });

    // Transform threads to include the last message in a simpler structure
    const threadsWithLastMessage = threads.map((thread) => {
      const lastMessage = thread.messages[0] || null;
      return {
        ...thread,
        lastMessage,
      };
    });
    return NextResponse.json({ data: threadsWithLastMessage });
  } catch (error) {
    console.error("Error fetching message threads:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching message threads." },
      { status: 500 }
    );
  }
};
