import prisma from "@/lib/prisma";
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
    products = products.filter((product) => {
      return product.store.isActive;
    });
    console.log("Fetched products:", products.length);
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
