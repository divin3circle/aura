import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";

export async function GET(request, { params }) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Load product with variants
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    // 404 if not found or not owned by caller's store
    if (!product || product.storeId !== storeId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Analytics from PAID orders only
    const [orderItems, reviews] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          productId: id,
          order: { isPaid: true },
        },
        include: { order: true },
      }),
      prisma.rating.findMany({
        where: { productId: id },
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const unitsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const revenue = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const orderCount = new Set(orderItems.map((item) => item.orderId)).size;

    return NextResponse.json(
      {
        product,
        analytics: {
          unitsSold,
          revenue,
          orderCount,
          reviews,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching product analytics:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
