import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    // for admin fetch all shipped orders
    const orders = await prisma.order.findMany({
      where: { status: "SHIPPED" },
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        orderItems: {
          include: { product: true },
        },
        address: true,
      },
    });

    return NextResponse.json({ orders: orders }, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        "Order ID and status are required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }
    await prisma.order.update({
      where: { id: orderId },
      data: { status: status },
    });
    return NextResponse.json(
      { message: "Order status updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
