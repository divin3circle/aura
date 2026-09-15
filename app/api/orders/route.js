import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { applyMargin, shippingFor } from "@/lib/pricing";
import { activePricing, variantLabel } from "@/lib/variants";
import { initiateStkPush } from "@/lib/mpesa";
import { ensureUser } from "@/lib/ensureUser";

export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Safety net: guarantee a DB User row exists before creating FK-bound orders,
    // even if the Inngest clerk/user.created sync hasn't run for this signup yet.
    await ensureUser(userId);

    const { addressId, items, couponCode, paymentMethod, phone } =
      await request.json();
    if (!addressId || !items || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "M-Pesa phone number is required" },
        { status: 400 }
      );
    }

    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: {
          code: couponCode.toUpperCase(),
          expiresAt: { gt: new Date() },
        },
      });

      if (!coupon) {
        return NextResponse.json(
          { error: "Invalid coupon code" },
          { status: 400 }
        );
      }
    }

    if (couponCode && coupon.forNewUser) {
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
    const isPlusMember = has({ plan: "plus" });

    if (couponCode && coupon.forMember) {
      if (!isPlusMember) {
        return NextResponse.json(
          { message: "Coupon valid only for Plus members", coupon: null },
          { status: 400 }
        );
      }
    }

    const ordersByStore = new Map();

    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: "Invalid quantity" },
          { status: 400 }
        );
      }

      const product = await prisma.product.findUnique({
        where: { id: item.id },
        include: { variants: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 400 }
        );
      }

      const storeId = product.storeId;
      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : null;

      if (product.variants.length > 0 && !variant) {
        return NextResponse.json(
          { error: "Please select a variant" },
          { status: 400 }
        );
      }

      const source = variant ?? product;
      const unitBase = applyMargin(source.price);
      const unitDiscounted = source.discountedPrice == null ? null : applyMargin(source.discountedPrice);
      const unitPrice = activePricing(unitBase, unitDiscounted).price;
      const label = variant ? variantLabel(variant, product.options) : null;

      if (!ordersByStore.has(storeId)) ordersByStore.set(storeId, []);
      ordersByStore.get(storeId).push({
        ...item,
        quantity,
        price: unitPrice,
        variantId: variant ? variant.id : null,
        variantLabel: label,
      });
    }

    let orderIds = [];
    let fullAmount = 0;

    // Shipping: free within Nairobi, flat KES 500 elsewhere — added once per checkout.
    const deliveryAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });
    const shippingFee = shippingFor(deliveryAddress?.state);
    let isShippingFeeAdded = false;

    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (couponCode) {
        total -= (total * coupon.discount) / 100;
      }

      if (!isShippingFeeAdded) {
        total += shippingFee;
        isShippingFeeAdded = true;
      }

      fullAmount += parseFloat(total.toFixed(2));

      const order = await prisma.order.create({
        data: {
          userId: userId,
          storeId: storeId,
          addressId: addressId,
          total: parseFloat(total.toFixed(2)),
          paymentMethod: paymentMethod,
          isCouponUsed: coupon ? true : false,
          coupon: coupon ? coupon : {},
          orderItems: {
            create: sellerItems.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              variantId: item.variantId ?? null,
              variantLabel: item.variantLabel ?? null,
            })),
          },
        },
      });
      orderIds.push(order.id);
    }

    // Trigger an M-Pesa STK push for the full amount. Orders stay unpaid until the
    // Safaricom callback (/api/mpesa/callback) confirms; we store CheckoutRequestID to correlate.
    const origin = request.headers.get("origin");
    const callbackUrl =
      process.env.MPESA_CALLBACK_URL || `${origin}/api/mpesa/callback`;

    // TEMP DEMO OVERRIDE: if MPESA_DEMO_AMOUNT is set (>0), charge that fixed
    // amount (e.g. 1) via STK so a real number can complete a live demo without
    // paying the full price. The order's `total` still records the real amount.
    // Remove/unset this env var to charge the real total.
    const demoAmount = Number(process.env.MPESA_DEMO_AMOUNT) || 0;
    const chargeAmount = demoAmount > 0 ? demoAmount : Math.round(fullAmount);

    const stk = await initiateStkPush({
      phone,
      amount: chargeAmount,
      accountRef: "AURA",
      description: "Aura order",
      callbackUrl,
    });

    if (stk.ResponseCode !== "0") {
      // The STK request itself failed — roll back the just-created pending orders.
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      return NextResponse.json(
        { error: stk.ResponseDescription || "Failed to start M-Pesa payment" },
        { status: 400 }
      );
    }

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { mpesaCheckoutRequestId: stk.CheckoutRequestID },
    });

    return NextResponse.json(
      {
        checkoutRequestId: stk.CheckoutRequestID,
        orderIds,
        message:
          stk.CustomerMessage ||
          "Check your phone and enter your M-Pesa PIN to complete payment.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in orders route:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
        isPaid: true,
      },
      include: {
        orderItems: { include: { product: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders: orders }, { status: 200 });
  } catch (error) {
    console.error("Error in orders route:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
