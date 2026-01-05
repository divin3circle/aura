import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    const { cart } = await request.json();
    if (!cart) {
      return NextResponse.json(
        "Cart data is required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { cart: cart },
    });

    return NextResponse.json(
      { message: "Cart updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in cart route:", error);
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

    const userCart = await prisma.user.findUnique({
      where: { id: userId },
    });

    return NextResponse.json({ cart: userCart.cart }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
