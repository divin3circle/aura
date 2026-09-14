import prisma from "@/lib/prisma";
import { withDisplayPricing } from "@/lib/variants";
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
        variants: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    products = products
      .filter((product) => product.store.isActive)
      .map(withDisplayPricing);
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
