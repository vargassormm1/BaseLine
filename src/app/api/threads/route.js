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

export const POST = async (request) => {
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

    if (!data.participant1 || !data.participant2) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // Find an existing thread
    let thread = await prisma.messageThread.findFirst({
      where: {
        OR: [
          {
            participant1: data.participant1,
            participant2: data.participant2,
          },
          {
            participant1: data.participant2,
            participant2: data.participant1,
          },
        ],
      },
    });

    // If no thread exists, create a new one
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          participant1: data.participant1,
          participant2: data.participant2,
          lastUpdated: new Date(),
        },
      });
    }

    return NextResponse.json({ data: thread });
  } catch (error) {
    console.error("Error creating message thread:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the message thread." },
      { status: 500 }
    );
  }
};
