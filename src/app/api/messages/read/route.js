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

export const PUT = async (request, response) => {
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

  if (!data.userId || !data.threadId) {
    return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
  }

  try {
    await prisma.message.updateMany({
      where: {
        threadId: data.threadId,
        receiverId: data.userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in confirm match:", error);
    return NextResponse.json(
      { error: "An error occurred while confirming the match." },
      { status: 500 }
    );
  }
};
