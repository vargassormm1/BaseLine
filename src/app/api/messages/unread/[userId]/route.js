import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "15 s"),
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

    const userId = parseInt(params.userId, 10);

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        read: false,
      },
    });

    return NextResponse.json({ data: unreadCount });
  } catch (error) {
    console.error("Error fetching unread meassages count:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching unread meassages count." },
      { status: 500 }
    );
  }
};
