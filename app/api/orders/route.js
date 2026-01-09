import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";
import { PaymentMethod } from "@prisma/client";

export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        "Unauthorized",
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { addressId, items, couponCode, paymentMethod } =
      await request.json();
    if (!addressId || !items || !paymentMethod) {
      return NextResponse.json(
        "Missing required parameters",
        { error: "Missing required parameters" },
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
          "Invalid coupon code",
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
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      });
      const storeId = product.storeId;

      if (!ordersByStore.has(storeId)) {
        ordersByStore.set(storeId, []);
      }
      ordersByStore.get(storeId).push({ ...item, price: product.price });
    }

    let orderIds = [];
    let fullAmount = 0;

    let isShippingFeeAdded = false;

    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (couponCode) {
        total -= (total * coupon.discount) / 100;
      }

      if (!isPlusMember && !isShippingFeeAdded) {
        const shippingFee = 5.36;
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
            })),
          },
        },
      });
      orderIds.push(order.id);
    }

    if (paymentMethod === PaymentMethod.STRIPE) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const origin = request.headers.get("origin");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Order Payment",
              },
              unit_amount: Math.round(fullAmount * 100),
            },
            quantity: 1,
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        mode: "payment",
        success_url: `${origin}/loading?nextUrl=orders`,
        cancel_url: `${origin}/cart`,
        metadata: {
          orderIds: orderIds.join(","),
          userId: userId,
          appId: "AuraEcom",
        },
      });
      return NextResponse.json({ session }, { status: 200 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        cart: { cartItems: {}, total: 0 },
      },
    });

    return NextResponse.json({
      message: "Order(s) placed successfully.",
      orderIds: orderIds,
      fullAmount: parseFloat(fullAmount.toFixed(2)),
    });
  } catch (error) {
    console.error("Error in orders route:", error);
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
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
        OR: [
          { paymentMethod: PaymentMethod.COD },
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] },
        ],
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
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
