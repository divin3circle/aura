import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        "Unauthorized",
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { orderId, productId, rating, review } = await request.json();
    if (!orderId || !productId || !rating) {
      return NextResponse.json(
        "Missing required fields",
        { error: "orderId, productId, and rating are required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { where: { productId } } },
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json(
        "Order not found",
        { error: "Order does not exist or does not belong to user" },
        { status: 404 }
      );
    }

    if (!order.orderItems.length) {
      return NextResponse.json(
        "Product not in order",
        { error: "This product is not part of the specified order" },
        { status: 400 }
      );
    }

    const isAlreadyRated = await prisma.rating.findFirst({
      where: { orderId: orderId, productId: productId },
    });

    if (isAlreadyRated) {
      return NextResponse.json(
        { message: "Product already rated for this order" },
        { error: "This product in the order has already been rated" },
        { status: 400 }
      );
    }

    const response = await prisma.rating.create({
      data: {
        userId,
        orderId,
        productId,
        rating,
        review,
      },
    });

    return NextResponse.json(
      { message: "Rating created successfully", rating: response },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating rating:", error);
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
      return NextResponse.json(
        "Unauthorized",
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    const ratings = await prisma.rating.findMany({
      where: { userId: userId },
    });

    return NextResponse.json({ ratings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
