import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export const GET = async () => {
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      username: true,
    },
  });

  return NextResponse.json({ data: users });
};
