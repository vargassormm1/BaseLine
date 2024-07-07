import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "30 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const GET = async (request, { params }) => {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const threadId = parseInt(params.threadId, 10);

    if (isNaN(threadId)) {
      return NextResponse.json(
        { error: "Invalid thread ID." },
        { status: 400 }
      );
    }

    const thread = await prisma.messageThread.findUnique({
      where: { threadId: parseInt(threadId, 10) },
      include: {
        messages: true,
        user1: true,
        user2: true,
      },
    });

    return NextResponse.json({ data: thread });
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching thread." },
      { status: 500 }
    );
  }
};
