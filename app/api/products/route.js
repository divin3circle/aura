import prisma from "@/lib/prisma";
import { applyMargin } from "@/lib/pricing";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    let products = await prisma.product.findMany({
      where: { inStock: true },
      include: {
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        store: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    products = products
      .filter((product) => product.store.isActive)
      // Apply the global margin to every base price before it reaches the client.
      .map((product) => ({
        ...product,
        mrp: applyMargin(product.mrp),
        price: applyMargin(product.price),
      }));
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
