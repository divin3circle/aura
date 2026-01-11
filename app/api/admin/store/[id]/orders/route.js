import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";

export async function GET(request, { params }) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Get query params for pagination and sorting
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Valid sortBy fields
    const validSortFields = ["createdAt", "total", "status"];
    const orderByField = validSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const orderDirection = sortOrder === "asc" ? "asc" : "desc";

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalOrders = await prisma.order.count({
      where: { storeId: id },
    });

    // Fetch orders with pagination and sorting
    const orders = await prisma.order.findMany({
      where: { storeId: id },
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      include: {
        user: true,
        orderItems: { include: { product: true } },
        address: true,
      },
    });

    return NextResponse.json(
      {
        orders,
        pagination: {
          page,
          limit,
          totalOrders,
          totalPages: Math.ceil(totalOrders / limit),
          hasMore: skip + orders.length < totalOrders,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching store orders:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
