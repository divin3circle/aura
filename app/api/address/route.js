import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: userId },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ addresses }, { status: 200 });
  } catch (error) {
    console.error("Error in address route:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json("Unauthorized", { status: 401 });
    }
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json(
        "Address data is required",
        { error: "MISSING_PARAMETERS" },
        { status: 400 }
      );
    }

    const newAddress = await prisma.address.create({
      data: {
        ...address,
        userId,
      },
    });

    return NextResponse.json(
      { message: "Address added successfully.", address: newAddress },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in address route:", error);
    return NextResponse.json(
      "Bad Request",
      { error: error.message },
      { status: 400 }
    );
  }
}
