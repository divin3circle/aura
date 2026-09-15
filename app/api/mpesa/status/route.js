import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Lets the checkout page poll whether the STK payment has been confirmed yet.
// Scoped to the caller's own order.
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const checkoutRequestId = new URL(request.url).searchParams.get(
      "checkoutRequestId"
    );
    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: "Missing checkoutRequestId" },
        { status: 400 }
      );
    }
    const order = await prisma.order.findFirst({
      where: { mpesaCheckoutRequestId: checkoutRequestId, userId },
    });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ paid: order.isPaid, status: order.status });
  } catch (error) {
    console.error("Error in M-Pesa status:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
