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

    const store = await prisma.store.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const [
      totalOrders,
      paidOrders,
      orderPlacedCount,
      processingCount,
      shippedCount,
      deliveredCount,
      revenueAgg,
      productsCount,
    ] = await Promise.all([
      prisma.order.count({ where: { storeId: id } }),
      prisma.order.count({ where: { storeId: id, isPaid: true } }),
      prisma.order.count({ where: { storeId: id, status: "ORDER_PLACED" } }),
      prisma.order.count({ where: { storeId: id, status: "PROCESSING" } }),
      prisma.order.count({ where: { storeId: id, status: "SHIPPED" } }),
      prisma.order.count({ where: { storeId: id, status: "DELIVERED" } }),
      prisma.order.aggregate({
        where: { storeId: id, isPaid: true },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { storeId: id } }),
    ]);

    const metrics = {
      revenue: Number(revenueAgg?._sum?.total || 0),
      orders: {
        total: totalOrders,
        paid: paidOrders,
        byStatus: {
          ORDER_PLACED: orderPlacedCount,
          PROCESSING: processingCount,
          SHIPPED: shippedCount,
          DELIVERED: deliveredCount,
        },
      },
      products: { total: productsCount },
    };

    return NextResponse.json({ store, metrics }, { status: 200 });
  } catch (error) {
    console.error("Error fetching store metrics:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
