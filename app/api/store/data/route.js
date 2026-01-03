import { prisma } from "@/configs/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username").toLowerCase();

    if (!username) {
      return NextResponse.json(
        "Username query is required",
        { error: "Missing username" },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { username: username, isActive: true },
      include: { Product: { include: { rating: true } } },
    });

    if (!store) {
      return NextResponse.json(
        "Store not found",
        { error: "Store not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ store }, { status: 200 });
  } catch (error) {
    console.error("Error getting store:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
