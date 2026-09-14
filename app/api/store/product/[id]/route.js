import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { categoriesFor } from "@/lib/catalog";

export async function GET(request, { params }) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Load product with variants
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    // 404 if not found or not owned by caller's store
    if (!product || product.storeId !== storeId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Analytics from PAID orders only
    const [orderItems, reviews] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          productId: id,
          order: { isPaid: true },
        },
        include: { order: true },
      }),
      prisma.rating.findMany({
        where: { productId: id },
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const unitsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const revenue = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const orderCount = new Set(orderItems.map((item) => item.orderId)).size;

    return NextResponse.json(
      {
        product,
        analytics: {
          unitsSold,
          revenue,
          orderCount,
          reviews,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching product analytics:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Ownership check
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.storeId !== storeId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      subtitle,
      description,
      category,
      department,
      brand,
      price,
      mrp,
      discountedPrice: discountedPriceRaw,
      options,
      variants,
    } = body;

    // Validate category vs department when both are provided
    const effectiveDept = department ?? existing.department;
    if (category) {
      const validCategories = categoriesFor(effectiveDept);
      if (validCategories.length > 0 && !validCategories.includes(category)) {
        return NextResponse.json(
          {
            error: `Category "${category}" is not valid for department "${effectiveDept}"`,
          },
          { status: 400 }
        );
      }
    }

    const discountedPrice =
      discountedPriceRaw !== undefined && discountedPriceRaw !== null && discountedPriceRaw !== ""
        ? Number(discountedPriceRaw)
        : null;

    // Build scalar update payload — only include fields that were provided
    const scalarUpdate = {};
    if (name !== undefined) scalarUpdate.name = name;
    if (subtitle !== undefined) scalarUpdate.subtitle = subtitle;
    if (description !== undefined) scalarUpdate.description = description;
    if (category !== undefined) scalarUpdate.category = category;
    if (department !== undefined) scalarUpdate.department = department;
    if (brand !== undefined) scalarUpdate.brand = brand;
    if (price !== undefined) scalarUpdate.price = Number(price);
    if (mrp !== undefined) scalarUpdate.mrp = Number(mrp);
    if (discountedPriceRaw !== undefined) scalarUpdate.discountedPrice = discountedPrice;
    if (options !== undefined) scalarUpdate.options = Array.isArray(options) ? options : [];

    // Normalize variants to an array when provided (non-array → empty)
    const variantsProvided = variants !== undefined;
    const parsedVariants = Array.isArray(variants) ? variants : [];

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...scalarUpdate,
        // Atomic replace: delete existing + create new in a single update
        ...(variantsProvided && {
          variants: {
            deleteMany: {},
            create: parsedVariants.map((v) => ({
              options: v.options ?? {},
              price: Number(v.price),
              mrp: Number(v.mrp ?? v.price),
              discountedPrice:
                v.discountedPrice !== undefined &&
                v.discountedPrice !== null &&
                v.discountedPrice !== ""
                  ? Number(v.discountedPrice)
                  : null,
              inStock: v.inStock !== undefined ? Boolean(v.inStock) : true,
            })),
          },
        }),
      },
      include: { variants: true },
    });

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
