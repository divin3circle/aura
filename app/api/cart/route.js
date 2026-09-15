import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cart } = await request.json();
    if (!cart) {
      return NextResponse.json(
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }

    await ensureUser(userId);
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userCart = await ensureUser(userId);

    const cart =
      userCart && typeof userCart.cart === "object" && userCart.cart !== null
        ? userCart.cart
        : { cartItems: {}, total: 0 };

    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
