import { NextResponse } from "next/server";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import openai from "@/configs/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function generateProductImages(base64Image, mimeType, productName) {
  try {
    const analysisMessages = [
      {
        role: "system",
        content: `You are a product photography AI. Analyze the provided product image and describe it in detail for image generation purposes. 
        Be specific about: color, texture, shape, size, and distinctive features.
        Respond in JSON format with a "description" field containing a detailed description suitable for image generation prompts.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this product image and provide a detailed description for generating similar product variations.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ];

    const analysisResponse = await openai.chat.completions.create({
      model: process.env.OPEN_AI_MODEL,
      messages: analysisMessages,
    });

    const analysisText = analysisResponse.choices[0].message.content;
    let productDescription = productName;

    try {
      const parsed = JSON.parse(analysisText);
      productDescription = parsed.description || productName;
    } catch {
      productDescription = analysisText;
    }

    const generatedImages = [];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    // Generate a single professional product image
    const prompt = `Generate a professional product photography image of: ${productDescription}. 
      The product should be photographed from a slightly elevated 45-degree angle for optimal e-commerce presentation.
      The background must be completely transparent or clean white.
      The image should be studio-quality, professionally lit with soft, diffused lighting.
      Show the exact same product from the reference image with sharp focus.
      The product should be centered and clearly visible in the frame.
      Style: Professional e-commerce product photography, high quality, product-focused.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            // Convert buffer to base64 string
            const base64Data = Buffer.from(part.inlineData.data).toString(
              "base64"
            );
            generatedImages.push(base64Data);
            break;
          }
        }
      }
    }

    if (generatedImages.length !== 1) {
      throw new Error(
        `Failed to generate image. Generated: ${generatedImages.length}`
      );
    }

    return generatedImages;
  } catch (error) {
    console.error("Error generating images:", error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { image, mimeType, productName } = await request.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    const generatedImageUrls = await generateProductImages(
      image,
      mimeType,
      productName || "Product"
    );

    return NextResponse.json({ images: generatedImageUrls }, { status: 200 });
  } catch (error) {
    console.error("Could not process image generation request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate images" },
      { status: 400 }
    );
  }
}
