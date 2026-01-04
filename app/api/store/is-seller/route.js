import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json(
        { isSeller: false, store: null },
        { status: 200 }
      );
    }

    const storeInfo = await prisma.store.findUnique({
      where: { id: storeId },
    });
    return NextResponse.json({
      isSeller: true,
      store: storeInfo,
    });
  } catch (error) {
    console.error("Error getting seller data:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
