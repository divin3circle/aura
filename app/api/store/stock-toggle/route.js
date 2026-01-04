import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json(
        "Product ID is required",
        { error: "MISSING_PRODUCT_ID" },
        { status: 400 }
      );
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json(
        "Forbidden",
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
    });
    if (!product) {
      return NextResponse.json(
        "Product not found",
        { error: "PRODUCT_NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: { inStock: !product.inStock },
    });
    return NextResponse.json(
      { message: "Product stock status updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling product stock status:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
