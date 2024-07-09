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
    if (!data.senderId || !data.receiverId || !data.content) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    // check if message thread already exists
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

    // Create thread if it does not exists
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
