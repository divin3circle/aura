import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

    const { storeId, status } = await request.json();
    if (!storeId || !status) {
      return NextResponse.json(
        "Store ID and status are required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }

    if (status === "approved") {
      await prisma.store.update({
        where: { id: storeId },
        data: { status: "approved", isActive: true },
      });
    } else if (status === "rejected") {
      await prisma.store.update({
        where: { id: storeId },
        data: { status: "rejected", isActive: false },
      });
    } else {
      return NextResponse.json(
        "Invalid status value",
        { error: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: `Store has been ${status} successfully.` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error approving store:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function GET(request) {
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
    const stores = await prisma.store.findMany({
      where: { status: { in: ["pending", "rejected"] } },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    return NextResponse.json(stores, { status: 200 });
  } catch (error) {
    console.error("Error fetching pending stores:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
