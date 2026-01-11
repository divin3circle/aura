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

    const orders = await prisma.order.findMany({
      where: { storeId: id },
      orderBy: { createdAt: "desc" },
    });

    const paidOrders = orders.filter((order) => order.isPaid);
    const totalRevenue = paidOrders.reduce(
      (acc, order) => acc + order.total,
      0
    );

    const revenueByStatus = {
      ORDER_PLACED: orders
        .filter((o) => o.status === "ORDER_PLACED" && o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
      PROCESSING: orders
        .filter((o) => o.status === "PROCESSING" && o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
      SHIPPED: orders
        .filter((o) => o.status === "SHIPPED" && o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
      DELIVERED: orders
        .filter((o) => o.status === "DELIVERED" && o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
    };

    const revenueByPaymentMethod = {
      STRIPE: orders
        .filter((o) => o.paymentMethod === "STRIPE" && o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
      COD: orders
        .filter((o) => o.paymentMethod === "COD" && o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
    };

    const revenueData = {
      totalRevenue,
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      pendingRevenue: orders
        .filter((o) => !o.isPaid)
        .reduce((acc, o) => acc + o.total, 0),
      revenueByStatus,
      revenueByPaymentMethod,
    };

    return NextResponse.json(revenueData, { status: 200 });
  } catch (error) {
    console.error("Error fetching store revenue:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
