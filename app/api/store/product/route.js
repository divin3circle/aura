import imageKit from "@/configs/imageKit";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { categoriesFor, departmentKeys } from "@/lib/catalog";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const subtitle = formData.get("subtitle") ?? "";
    const mrp = Number(formData.get("mrp"));
    const price = Number(formData.get("price"));
    const images = formData.getAll("images");
    const category = formData.get("category");

    // New taxonomy + variant fields (arrive as JSON strings in formData)
    const department = formData.get("department") || "COSMETICS";
    const brand = formData.get("brand") || null;
    const discountedPriceRaw = formData.get("discountedPrice");
    const discountedPrice =
      discountedPriceRaw !== undefined && discountedPriceRaw !== null && discountedPriceRaw !== ""
        ? Number(discountedPriceRaw)
        : null;

    let options = [];
    try {
      const optionsRaw = formData.get("options");
      if (optionsRaw && optionsRaw !== "") {
        const parsed = JSON.parse(optionsRaw);
        if (Array.isArray(parsed)) options = parsed;
      }
    } catch {
      // ignore malformed options; default to []
    }

    let variants = [];
    try {
      const variantsRaw = formData.get("variants");
      if (variantsRaw && variantsRaw !== "") {
        const parsed = JSON.parse(variantsRaw);
        if (Array.isArray(parsed)) variants = parsed;
      }
    } catch {
      // ignore malformed variants; default to []
    }

    if (
      !name ||
      !description ||
      !mrp ||
      !price ||
      images.length < 1 ||
      !category
    ) {
      return NextResponse.json(
        { error: "Missing required fields for product" },
        { status: 400 }
      );
    }

    // Validate department against the allow-list (only when explicitly provided)
    const departmentProvided = formData.get("department");
    if (departmentProvided && !departmentKeys.includes(department)) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }

    // Validate category belongs to the given department
    const validCategories = categoriesFor(department);
    if (validCategories.length > 0 && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Category "${category}" is not valid for department "${department}"` },
        { status: 400 }
      );
    }

    const imagesUrl = await Promise.all(
      images.map(async (image) => {
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await imageKit.upload({
          file: buffer,
          fileName: image.name,
          folder: "/products",
        });
        const url = imageKit.url({
          path: response.filePath,
          transformation: [
            { quality: "auto" },
            { format: "webp" },
            { width: "1024" },
          ],
        });
        return url;
      })
    );

    await prisma.product.create({
      data: {
        name,
        subtitle,
        description,
        mrp,
        price,
        images: imagesUrl,
        category,
        storeId,
        department,
        brand,
        discountedPrice,
        options,
        ...(variants.length > 0 && {
          variants: {
            create: variants.map((v) => ({
              options: v.options ?? {},
              price: Number(v.price),
              mrp: Number(v.mrp ?? v.price),
              discountedPrice:
                v.discountedPrice !== undefined && v.discountedPrice !== null && v.discountedPrice !== ""
                  ? Number(v.discountedPrice)
                  : null,
              inStock: v.inStock !== undefined ? Boolean(v.inStock) : true,
            })),
          },
        }),
      },
    });

    return NextResponse.json(
      { message: name + " added successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const products = await prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
