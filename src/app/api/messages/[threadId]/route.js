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

    const threadId = parseInt(params.threadId, 10);

    if (isNaN(threadId)) {
      return NextResponse.json(
        { error: "Invalid thread ID." },
        { status: 400 }
      );
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { threadId: threadId },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching messages." },
      { status: 500 }
    );
  }
};
