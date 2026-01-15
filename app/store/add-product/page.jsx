"use client";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { IconAi, IconBrandParsinta } from "@tabler/icons-react";

export const categories = [
  "Skincare",
  "Makeup",
  "Haircare",
  "Fragrances",
  "Hygiene",
  "Bath",
  "Nails",
  "Accessories",
  "Grooming",
  "Sunscreen",
  "Wellness",
  "Supplements",
  "Others",
];

export default function StoreAddProduct() {
  const { getToken } = useAuth();

  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [imagesGenerated, setImagesGenerated] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);

  const [productInfo, setProductInfo] = useState({
    name: "",
    description: "",
    mrp: 0,
    price: 0,
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [imageGenerationConsent, setImageGenerationConsent] = useState(false);

  const onChangeHandler = (e) => {
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (key, file) => {
    setImages((prev) => ({ ...prev, [key]: file }));

    if (key === "1" && file && !aiUsed) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64String = reader.result.split(",")[1];
          const mimeType = file.type;
          const token = await getToken();

          await toast.promise(
            axios.post(
              "/api/store/ai",
              {
                image: base64String,
                mimeType: mimeType,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),
            {
              loading: "Analyzing image for product details...",
              success: (res) => {
                const data = res.data;
                if (data.name && data.description) {
                  setProductInfo((prev) => ({
                    ...prev,
                    name: data.name,
                    description: data.description,
                  }));
                  setAiUsed(true);
                  return "Product details generated successfully!";
                }
                return "Could not generate product details.";
              },
              error: "Failed to analyze image for product details.",
            }
          );
        } catch (error) {
          console.error("AI image analysis failed:", error);
          toast.error("Failed to analyze image for product details.");
        }
      };
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!images[1] && !images[2] && !images[3] && !images[4]) {
        toast.error("Please upload at least one product image.");
        return;
      }
      setLoading(true);
      const formData = new FormData();
      formData.append("name", productInfo.name);
      formData.append("description", productInfo.description);
      formData.append("mrp", productInfo.mrp);
      formData.append("price", productInfo.price);
      formData.append("category", productInfo.category);

      // Handle both uploaded files and AI-generated image URLs
      for (let i = 1; i <= 4; i++) {
        if (images[i]) {
          if (images[i] instanceof File) {
            // It's an uploaded file
            formData.append("images", images[i]);
          } else if (typeof images[i] === "string") {
            // It's an AI-generated image URL
            // Fetch the image and convert to blob
            const response = await fetch(images[i]);
            const blob = await response.blob();
            const file = new File([blob], `ai-generated-image-${i}.png`, {
              type: "image/png",
            });
            formData.append("images", file);
          }
        }
      }

      const { data } = await axios.post("/api/store/product", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success(productInfo.name + " added successfully");
      setProductInfo({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
      });
      setImages({ 1: null, 2: null, 3: null, 4: null });
      setImagesGenerated(false);
      setImageGenerationConsent(false);
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error(
        "Failed to add product" +
          (error.response?.data?.error ? `: ${error.response.data.error}` : "")
      );
    } finally {
      setLoading(false);
    }
  };

  const generateImages = async () => {
    if (!images[1]) {
      toast.error("Please upload at least one product image first.");
      return;
    }
    try {
      setImageGenerating(true);
      const reader = new FileReader();
      reader.readAsDataURL(images[1]);
      reader.onloadend = async () => {
        try {
          const base64String = reader.result.split(",")[1];
          const mimeType = images[1].type;
          const token = await getToken();

          await toast.promise(
            axios.post(
              "/api/store/ai/images",
              {
                image: base64String,
                mimeType: mimeType,
                productName: productInfo.name || "Product",
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),
            {
              loading: "Generating AI product images from different angles...",
              success: (res) => {
                const imageBase64Array = res.data.images;
                if (imageBase64Array && imageBase64Array.length === 1) {
                  // Convert base64 string to data URL for display
                  const imageDataUrl = `data:image/png;base64,${imageBase64Array[0]}`;
                  // Store generated image in slot 2
                  setImages((prev) => ({
                    ...prev,
                    2: imageDataUrl,
                  }));
                  setImagesGenerated(true);
                  return "Product image generated successfully!";
                }
                return "Could not generate product image.";
              },
              error: "Failed to generate product images.",
            }
          );
        } catch (error) {
          console.error("AI image generation failed:", error);
          toast.error("Failed to generate product images.");
        } finally {
          setImageGenerating(false);
        }
      };
    } catch (error) {
      console.error("Error generating images:", error);
      toast.error("Failed to generate images.");
      setImageGenerating(false);
    }
  };

  return (
    <form
      onSubmit={(e) =>
        toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })
      }
      className="text-slate-500 mb-28"
    >
      <h1 className="text-2xl">
        Add New <span className="text-slate-800 font-medium">Products</span>
      </h1>
      <p className="mt-7">Product Images</p>

      <div htmlFor="" className="flex gap-3 mt-4">
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`}>
            <Image
              width={300}
              height={300}
              className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
              src={
                images[key]
                  ? URL.createObjectURL(images[key])
                  : assets.upload_area
              }
              alt=""
            />
            <input
              type="file"
              accept="image/*"
              id={`images${key}`}
              onChange={(e) => handleImageUpload(key, e.target.files[0])}
              hidden
            />
          </label>
        ))}
      </div>
      {!imagesGenerated && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-3">
            <Checkbox
              id="image-generation-consent"
              checked={imageGenerationConsent}
              onCheckedChange={setImageGenerationConsent}
            />
            <Label
              htmlFor="image-generation-consent"
              className="text-gray-500 text-sm cursor-pointer"
            >
              I consent to AI services generating product images based on the
              uploaded image
            </Label>
          </div>
          <button
            type="button"
            onClick={generateImages}
            disabled={!imageGenerationConsent || imageGenerating}
            className="p-2 flex items-center gap-2 bg-slate-800 rounded-2xl text-sm mb-2 hover:bg-slate-900 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {imageGenerating ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Generating...
              </>
            ) : (
              <>
                <IconAi className="h-6 w-6" />
                Generate AI Image
              </>
            )}
          </button>
          <p className="text-gray-500 text-xs max-w-sm">
            AI will generate 1 professional product image with optimal lighting
            and a clean background based on your uploaded image.
          </p>
        </div>
      )}

      {imagesGenerated && (
        <div className="mt-8 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm font-medium">
            ✓ AI image generated successfully! You now have 1 original + 1 AI
            generated image ready to submit.
          </p>
          <button
            type="button"
            onClick={() => {
              setImagesGenerated(false);
              setImageGenerationConsent(false);
              setImages((prev) => ({ ...prev, 2: null }));
            }}
            className="mt-2 text-sm text-green-700 hover:text-green-800 underline"
          >
            Generate different image
          </button>
        </div>
      )}

      <label htmlFor="" className="flex flex-col gap-2 my-6 ">
        Name
        <input
          type="text"
          name="name"
          onChange={onChangeHandler}
          value={productInfo.name}
          placeholder="Enter product name"
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
          required
        />
      </label>

      <label htmlFor="" className="flex flex-col gap-2 my-6 ">
        Description
        <textarea
          name="description"
          onChange={onChangeHandler}
          value={productInfo.description}
          placeholder="Enter product description"
          rows={5}
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none"
          required
        />
      </label>

      <div className="flex gap-5">
        <label htmlFor="" className="flex flex-col gap-2 ">
          Actual Price ($)
          <input
            type="number"
            name="mrp"
            onChange={onChangeHandler}
            value={productInfo.mrp}
            placeholder="0"
            rows={5}
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none"
            required
          />
        </label>
        <label htmlFor="" className="flex flex-col gap-2 ">
          Offer Price ($)
          <input
            type="number"
            name="price"
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder="0"
            rows={5}
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded resize-none"
            required
          />
        </label>
      </div>

      <select
        onChange={(e) =>
          setProductInfo({ ...productInfo, category: e.target.value })
        }
        value={productInfo.category}
        className="w-full max-w-sm p-2 px-4 my-6 outline-none border border-slate-200 rounded"
        required
      >
        <option value="">Select a category</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <br />

      <button
        disabled={loading}
        className="bg-slate-800 w-full md:max-w-xs text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded-2xl transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="animate-spin mr-2 h-5 w-5 inline-block" />
        ) : (
          "Add Product"
        )}
      </button>
      <p className="text-sm text-muted-foreground mt-4">
        *AI Generated content maybe inaccurate.
      </p>
    </form>
  );
}
