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

    if (!data.senderId || !data.receiverId || !data.content) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    let thread = await prisma.messageThread.findFirst({
      where: {
        OR: [
          {
            participant1: data.senderId,
            participant2: data.receiverId,
          },
          {
            participant1: data.receiverId,
            participant2: data.senderId,
          },
        ],
      },
    });

    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          participant1: data.senderId,
          participant2: data.receiverId,
          lastUpdated: new Date(),
        },
      });
    }

    const newMessage = await prisma.message.create({
      data: {
        threadId: thread.threadId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        timestamp: new Date(),
      },
    });

    await prisma.messageThread.update({
      where: { threadId: thread.threadId },
      data: { lastUpdated: new Date() },
    });

    return NextResponse.json({ data: newMessage });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the message." },
      { status: 500 }
    );
  }
};
