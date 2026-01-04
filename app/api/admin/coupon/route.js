import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

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
    const { coupon } = await request.json();
    if (!coupon || !coupon.code || !coupon.discount) {
      return NextResponse.json(
        "Coupon code and discount are required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }
    coupon.code = coupon.code.toUpperCase();
    await prisma.coupon
      .create({
        data: coupon,
      })
      .then(async (coupon) => {
        await inngest.send({
          name: "app/coupon.expired",
          data: {
            code: coupon.code,
            expires_at: coupon.expiresAt,
          },
        });
      });

    return NextResponse.json(
      {
        message: `Coupon with code ${coupon.code} created successfully.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in admin coupon route:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(request) {
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

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json(
        "Coupon code is required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }

    await prisma.coupon.delete({
      where: { code: code.toUpperCase() },
    });
    return NextResponse.json({
      message: `Coupon with code ${code.toUpperCase()} deleted successfully.`,
    });
  } catch (error) {
    console.error("Error in admin coupon DELETE route:", error);
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
    const coupons = await prisma.coupon.findMany({});
    return NextResponse.json({ coupons }, { status: 200 });
  } catch (error) {
    console.error("Error in admin coupon DELETE route:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
