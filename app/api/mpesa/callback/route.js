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

    if (checkoutRequestId != null) {
      const orders = await prisma.order.findMany({
        where: { mpesaCheckoutRequestId: checkoutRequestId },
      });
      if (orders.length > 0) {
        const paid = Number(resultCode) === 0;

        // On success, Safaricom includes CallbackMetadata with the receipt/phone/amount.
        const meta = {};
        for (const item of cb?.CallbackMetadata?.Item || []) {
          if (item?.Name) meta[item.Name] = item.Value;
        }

        // Record the outcome on every callback (success OR failure) so the
        // checkout page can stop polling early and tell the user what happened
        // (1032 cancelled, 1037 timeout, …) instead of waiting the full window.
        await prisma.order.updateMany({
          where: { mpesaCheckoutRequestId: checkoutRequestId },
          data: {
            isPaid: paid,
            mpesaResultCode: resultCode != null ? Number(resultCode) : null,
            mpesaResultDesc: cb?.ResultDesc || null,
            mpesaReceipt: paid ? meta.MpesaReceiptNumber ?? null : null,
            mpesaPhone: paid && meta.PhoneNumber != null ? String(meta.PhoneNumber) : null,
            mpesaAmount: paid && meta.Amount != null ? Number(meta.Amount) : null,
          },
        });
        if (paid) {
          await prisma.user.update({
            where: { id: orders[0].userId },
            data: { cart: { cartItems: {}, total: 0 } },
          });
        }
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Error in M-Pesa callback:", error);
    // Still ack so Safaricom stops retrying; we log for investigation.
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
