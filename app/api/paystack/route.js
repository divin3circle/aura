import prisma from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Paystack webhook. On a successful charge, mark the order(s) paid and clear the cart.
// Verified with the HMAC-SHA512 signature in the `x-paystack-signature` header.
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const expected = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (!signature || signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { orderIds, userId, appId } = event.data?.metadata || {};

      if (appId !== "AuraEcom") {
        return NextResponse.json({ received: true, ignored: true }, { status: 200 });
      }

      const orderIdArray = (orderIds || "").split(",").filter(Boolean);

      await Promise.all(
        orderIdArray.map((orderId) =>
          prisma.order.update({ where: { id: orderId }, data: { isPaid: true } })
        )
      );

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { cart: { cartItems: {}, total: 0 } },
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error in Paystack webhook:", error);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
