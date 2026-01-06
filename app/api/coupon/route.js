import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        "Unauthorized",
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json(
        "Coupon code is required",
        { message: "Coupon code is required" },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase(), expiresAt: { gt: new Date() } },
    });

    if (!coupon) {
      return NextResponse.json(
        { message: "Invalid or expired coupon code", coupon: null },
        { status: 400 }
      );
    }

    if (coupon.forNewUser) {
      const userOrders = await prisma.order.count({
        where: { userId: userId },
      });
      if (userOrders > 0) {
        return NextResponse.json(
          { message: "Coupon valid only for new users", coupon: null },
          { status: 400 }
        );
      }
    }

    if (coupon.forMember) {
      const hasPlusPlan = has({ plan: "plus" });
      if (!hasPlusPlan) {
        return NextResponse.json(
          { message: "Coupon valid only for Plus members", coupon: null },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { message: "Coupon applied successfully.", coupon: coupon },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in coupon route:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
