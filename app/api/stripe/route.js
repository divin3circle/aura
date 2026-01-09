import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const handleIntentPayment = async (paymentId, success) => {
      const session = await stripe.checkout.sessions.list({
        payment_intent: paymentId,
      });
      const { orderIds, userId, appId } = session.data[0].metadata;

      if (appId !== "AuraEcom") {
        console.log("Ignoring event for different app:", appId);
        return NextResponse.json(
          "Ignored",
          { message: "Event ignored for different app" },
          { status: 200 }
        );
      }

      const orderIdArray = orderIds.split(",");

      if (success) {
        await Promise.all(
          orderIdArray.map(async (orderId) => {
            await prisma.order.update({
              where: { id: orderId },
              data: { isPaid: true },
            });
          })
        );

        await prisma.user.update({
          where: { id: userId },
          data: {
            cart: { cartItems: {}, total: 0 },
          },
        });
      } else {
        await Promise.all(
          orderIdArray.map(async (orderId) => {
            await prisma.order.delete({
              where: { id: orderId },
            });
          })
        );
      }
    };

    switch (event.type) {
      case "payment_intent.succeeded":
        await handleIntentPayment(event.data.object.id, true);
        break;
      case "payment_intent.canceled":
        await handleIntentPayment(event.data.object.id, false);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Error in Stripe webhook:", error);
    return new Response(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
