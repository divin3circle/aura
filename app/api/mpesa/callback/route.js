import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Safaricom Daraja STK callback. On a successful charge (ResultCode 0) we mark the
// correlated order(s) paid and clear the buyer's cart. We always ack with ResultCode 0
// so Safaricom doesn't keep retrying. Orders are matched by the stored CheckoutRequestID,
// which is the guard against spoofed callbacks (an unknown id matches nothing).
export async function POST(request) {
  try {
    const body = await request.json();
    const cb = body?.Body?.stkCallback;
    // Instrumentation: Safaricom's exact payload (ResultCode/Desc + CheckoutRequestID).
    console.log("M-Pesa callback:", JSON.stringify(cb));
    const checkoutRequestId = cb?.CheckoutRequestID;
    const resultCode = cb?.ResultCode;

    if (checkoutRequestId && Number(resultCode) === 0) {
      const orders = await prisma.order.findMany({
        where: { mpesaCheckoutRequestId: checkoutRequestId },
      });
      if (orders.length > 0) {
        await prisma.order.updateMany({
          where: { mpesaCheckoutRequestId: checkoutRequestId },
          data: { isPaid: true },
        });
        await prisma.user.update({
          where: { id: orders[0].userId },
          data: { cart: { cartItems: {}, total: 0 } },
        });
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Error in M-Pesa callback:", error);
    // Still ack so Safaricom stops retrying; we log for investigation.
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
