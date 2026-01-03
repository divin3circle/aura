import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import prisma from "@/lib/prisma";

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

    const totalUsers = await prisma.user.count();
    const totalStores = await prisma.store.count();
    const totalProducts = await prisma.product.count();
    const allOrders = await prisma.order.findMany({
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    });
    let totalRevenue = 0;
    allOrders.forEach((order) => {
      totalRevenue += order.total;
    });

    const dashboardData = {
      users: totalUsers,
      stores: totalStores,
      products: totalProducts,
      orders: allOrders.length,
      allOrders,
      revenue: totalRevenue.toFixed(2),
    };

    return NextResponse.json(
      dashboardData,
      { data: dashboardData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in admin dashboard route:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
