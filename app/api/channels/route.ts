import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnerId } from "@/lib/ownerId";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = await getOwnerId();
  if (!ownerId) {
    return NextResponse.json([]);
  }

  const channels = await prisma.channel.findMany({
    where: { ownerId },
    orderBy: { title: "asc" },
    select: { channelId: true, title: true, thumbnail: true },
  });

  return NextResponse.json(channels);
}
