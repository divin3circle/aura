import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";

export async function GET(request, { params }) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Get all products for this store
    const products = await prisma.product.findMany({
      where: { storeId: id },
      select: { id: true },
    });

    const productIds = products.map((p) => p.id);

    // Get all ratings for these products
    const ratings = await prisma.rating.findMany({
      where: { productId: { in: productIds } },
      include: {
        product: { select: { name: true, id: true } },
        user: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate average rating
    const totalRatings = ratings.length;
    const avgRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    // Group ratings by score (1-5)
    const ratingDistribution = {
      1: ratings.filter((r) => r.rating === 1).length,
      2: ratings.filter((r) => r.rating === 2).length,
      3: ratings.filter((r) => r.rating === 3).length,
      4: ratings.filter((r) => r.rating === 4).length,
      5: ratings.filter((r) => r.rating === 5).length,
    };

    return NextResponse.json(
      {
        avgRating: Number(avgRating.toFixed(2)),
        totalRatings,
        ratingDistribution,
        recentRatings: ratings.slice(0, 10), // Last 10 ratings
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching store ratings:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
