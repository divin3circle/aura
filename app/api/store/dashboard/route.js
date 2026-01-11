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
        "Forbidden",
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });

    const products = await prisma.product.findMany({
      where: { storeId },
    });

    const ratings = await prisma.rating.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
      include: { product: true, user: true },
    });

    // Calculate earnings from paid orders only with 17% commission deducted
    const paidOrders = orders.filter((order) => order.isPaid);
    const grossEarnings = paidOrders.reduce(
      (acc, order) => acc + order.total,
      0
    );
    const commission = grossEarnings * 0.17;
    const netEarnings = grossEarnings - commission;

    const dashboardData = {
      orders,
      totalOrders: orders.length,
      totalProducts: products.length,
      totalEarnings: netEarnings,
      grossEarnings: grossEarnings,
      commission: commission,
      paidOrders: paidOrders.length,
      ratings,
    };
    return NextResponse.json(dashboardData, { status: 200 });
  } catch (error) {
    console.error("Error getting seller data:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
