import imageKit from "@/configs/imageKit";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }
    const formData = await request.formData();
    const name = formData.get("name");
    const username = formData.get("username");
    const description = formData.get("description");
    const email = formData.get("email");
    const contact = formData.get("contact");
    const image = formData.get("image");
    const address = formData.get("address");

    if (
      !name ||
      !description ||
      !address ||
      !image ||
      !username ||
      !email ||
      !contact
    ) {
      return NextResponse.json("Missing required fields for store", {
        status: 400,
      });
    }

    const store = await prisma.store.findFirst({
      where: { userId: userId },
    });

    if (store) {
      return NextResponse.json("Store already exists for this user", {
        status: store.status,
      });
    }

    const isUsernameTaken = await prisma.store.findFirst({
      where: { username: username.toLowerCase() },
    });

    if (isUsernameTaken) {
      return NextResponse.json(
        "Username is already taken",
        {
          error: "USERNAME_TAKEN",
        },
        {
          status: 409,
        }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const response = await imageKit.upload({
      file: buffer,
      fileName: image.name,
      folder: "logos",
    });

    const optimizedImage = imageKit.url({
      path: response.filePath,
      transformation: [
        { quality: "auto" },
        { format: "webp" },
        { width: "512" },
      ],
    });

    const newStore = await prisma.store.create({
      data: {
        userId: userId,
        name: name,
        username: username.toLowerCase(),
        description: description,
        email: email,
        contact: contact,
        logo: optimizedImage,
        address: address,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { store: { connect: { id: newStore.id } } },
    });
    return NextResponse.json(newStore, {
      status: 201,
      message: "Store creation applied successfully. Waiting for approval.",
    });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      {
        error: error.message || "Bad Request",
      },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }
    const store = await prisma.store.findFirst({
      where: { userId: userId },
    });

    if (store) {
      return NextResponse.json({
        status: store.status,
      });
    }

    return NextResponse.json("No store found for this user", {
      status: 404,
    });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      {
        error: error.message || "Bad Request",
      },
      { status: 400 }
    );
  }
}
