import { NextResponse } from "next/server";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import openai from "@/configs/openai";

async function generateImageVariation(base64Image, mimeType) {
  const messages = [
    {
      role: "system",
      content: `
        You are a product listing assistant for a cosmetic e-commerce platform.
        Your job is to analyze an image of a cosmetic product and generate a structured JSON data.

        Respond ONLY in JSON format(no code blocks, no markdown, no extra text or explanation). 

        The JSON MUST STRICTLY follow this schema:
        {
            "name": string, // The name of the cosmetic product (max 50 characters)
            "description": string, // A detailed market friendly description of the product (max 200 characters) 
        }

        `,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze the cosmetic product image and generate the product name and description in JSON format as per the schema provided.",
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

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPEN_AI_MODEL,
      messages: messages,
    });

    const raw = response.choices[0].message.content;
    const parsed = raw.replace(/```json | ```/g, "").trim();

    let parsedJSON;
    try {
      parsedJSON = JSON.parse(parsed);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Failed to parse AI response");
    }

    return parsedJSON;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
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

    const { image, mimeType } = await request.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    const aiResponse = await generateImageVariation(image, mimeType);

    return NextResponse.json(aiResponse, { status: 200 });
  } catch (error) {
    console.error("Could not process AI request:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
