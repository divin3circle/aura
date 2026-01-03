import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        "Forbidden",
        { error: "Not authorized" },
        { status: 403 }
      );
    }
    const { storeId } = await request.json();
    if (!storeId) {
      return NextResponse.json(
        "Store ID and isActive status are required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { products: true },
    });

    if (!store) {
      return NextResponse.json(
        "Store not found",
        { error: "STORE_NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.store.update({
      where: { id: storeId },
      data: { isActive: !store.isActive },
    });
    return NextResponse.json(
      {
        message: `Store has been ${
          !store.isActive ? "activated" : "deactivated"
        } successfully.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling store status:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
