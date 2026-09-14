"use client";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { IconAi } from "@tabler/icons-react";
import {
  DEPARTMENTS,
  departmentKeys,
  categoriesFor,
  brandsFor,
} from "@/lib/catalog";

// Flat list of all categories across all departments — kept for CategoriesMarquee compatibility
export const categories = [
  ...new Set(departmentKeys.flatMap((d) => categoriesFor(d))),
];

const newVariantRow = () => ({ value: "", price: "", inStock: true });

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
    department: "",
    category: "",
    brand: "",
    brandOther: "",
    discountedPrice: "",
  });

  // Variant editor state
  const [hasVariants, setHasVariants] = useState(false);
  const [axisName, setAxisName] = useState("Size");
  const [variantRows, setVariantRows] = useState([newVariantRow()]);

  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [imageGenerationConsent, setImageGenerationConsent] = useState(false);

  const onChangeHandler = (e) => {
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });
  };

  const onDepartmentChange = (e) => {
    setProductInfo({
      ...productInfo,
      department: e.target.value,
      category: "",
      brand: "",
      brandOther: "",
    });
  };

  // --- Variant row helpers ---
  const updateVariantRow = (index, field, value) => {
    setVariantRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addVariantRow = () => setVariantRows((prev) => [...prev, newVariantRow()]);

  const removeVariantRow = (index) =>
    setVariantRows((prev) => prev.filter((_, i) => i !== index));

  // --- Image upload ---
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
              { image: base64String, mimeType },
              { headers: { Authorization: `Bearer ${token}` } }
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

  // --- Submit ---
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

      // Taxonomy
      formData.append("department", productInfo.department);
      formData.append("category", productInfo.category);
      const resolvedBrand =
        productInfo.brand === "Other"
          ? productInfo.brandOther
          : productInfo.brand;
      formData.append("brand", resolvedBrand);

      // Optional discount
      formData.append("discountedPrice", productInfo.discountedPrice ?? "");

      // Variants
      let options = [];
      let variants = [];
      if (hasVariants && variantRows.length > 0) {
        const validRows = variantRows.filter(
          (r) => r.value.trim() !== "" && r.price !== ""
        );
        if (validRows.length > 0) {
          options = [
            {
              name: axisName,
              values: validRows.map((r) => r.value.trim()),
            },
          ];
          variants = validRows.map((r) => ({
            options: { [axisName]: r.value.trim() },
            price: parseFloat(r.price),
            mrp: parseFloat(r.price),
            inStock: r.inStock,
          }));
        }
      }
      formData.append("options", JSON.stringify(options));
      formData.append("variants", JSON.stringify(variants));

      // Images
      for (let i = 1; i <= 4; i++) {
        if (images[i]) {
          if (images[i] instanceof File) {
            formData.append("images", images[i]);
          } else if (typeof images[i] === "string") {
            const response = await fetch(images[i]);
            const blob = await response.blob();
            const file = new File([blob], `ai-generated-image-${i}.png`, {
              type: "image/png",
            });
            formData.append("images", file);
          }
        }
      }

      await axios.post("/api/store/product", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(productInfo.name + " added successfully");
      setProductInfo({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        department: "",
        category: "",
        brand: "",
        brandOther: "",
        discountedPrice: "",
      });
      setImages({ 1: null, 2: null, 3: null, 4: null });
      setImagesGenerated(false);
      setImageGenerationConsent(false);
      setHasVariants(false);
      setAxisName("Size");
      setVariantRows([newVariantRow()]);
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
                mimeType,
                productName: productInfo.name || "Product",
              },
              { headers: { Authorization: `Bearer ${token}` } }
            ),
            {
              loading: "Generating AI product images from different angles...",
              success: (res) => {
                const imageBase64Array = res.data.images;
                if (imageBase64Array && imageBase64Array.length === 1) {
                  const imageDataUrl = `data:image/png;base64,${imageBase64Array[0]}`;
                  setImages((prev) => ({ ...prev, 2: imageDataUrl }));
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

  const currentBrands = brandsFor(productInfo.department);
  const currentCategories = categoriesFor(productInfo.department);

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

      {/* Image upload row */}
      <div className="flex gap-3 mt-4">
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`}>
            <Image
              width={300}
              height={300}
              className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
              src={
                images[key]
                  ? images[key] instanceof File
                    ? URL.createObjectURL(images[key])
                    : images[key]
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

      {/* AI image generation */}
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
            AI image generated successfully! You now have 1 original + 1 AI
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

      {/* Name */}
      <label className="flex flex-col gap-2 my-6">
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

      {/* Description */}
      <label className="flex flex-col gap-2 my-6">
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

      {/* Department → Category → Brand cascade */}
      <div className="flex flex-col gap-4 my-6 max-w-sm">
        {/* Department */}
        <div className="flex flex-col gap-2">
          <label className="text-sm">Department</label>
          <select
            value={productInfo.department}
            onChange={onDepartmentChange}
            className="w-full p-2 px-4 outline-none border border-slate-200 rounded"
            required
          >
            <option value="">Select a department</option>
            {departmentKeys.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENTS[d].label}
              </option>
            ))}
          </select>
        </div>

        {/* Category — filtered by department */}
        <div className="flex flex-col gap-2">
          <label className="text-sm">Category</label>
          <select
            value={productInfo.category}
            onChange={(e) =>
              setProductInfo({ ...productInfo, category: e.target.value })
            }
            className="w-full p-2 px-4 outline-none border border-slate-200 rounded"
            required
            disabled={!productInfo.department}
          >
            <option value="">
              {productInfo.department
                ? "Select a category"
                : "Select a department first"}
            </option>
            {currentCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Brand — filtered by department + Other option */}
        <div className="flex flex-col gap-2">
          <label className="text-sm">Brand</label>
          <select
            value={productInfo.brand}
            onChange={(e) =>
              setProductInfo({
                ...productInfo,
                brand: e.target.value,
                brandOther: "",
              })
            }
            className="w-full p-2 px-4 outline-none border border-slate-200 rounded"
            disabled={!productInfo.department}
          >
            <option value="">
              {productInfo.department
                ? "Select a brand"
                : "Select a department first"}
            </option>
            {currentBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          {productInfo.brand === "Other" && (
            <input
              type="text"
              name="brandOther"
              value={productInfo.brandOther}
              onChange={onChangeHandler}
              placeholder="Enter brand name"
              className="w-full p-2 px-4 outline-none border border-slate-200 rounded"
              required
            />
          )}
        </div>
      </div>

      {/* Base pricing */}
      <div className="flex gap-5 my-6">
        <label className="flex flex-col gap-2">
          Actual Price (KES)
          <input
            type="number"
            name="mrp"
            onChange={onChangeHandler}
            value={productInfo.mrp}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          Offer Price (KES)
          <input
            type="number"
            name="price"
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
          />
        </label>
      </div>

      {/* Optional product-level discounted price */}
      <label className="flex flex-col gap-2 my-6 max-w-sm">
        Discounted Price (optional, KES)
        <input
          type="number"
          name="discountedPrice"
          onChange={onChangeHandler}
          value={productInfo.discountedPrice}
          placeholder="Leave blank if no extra discount"
          className="w-full p-2 px-4 outline-none border border-slate-200 rounded"
        />
      </label>

      {/* Variant / size editor */}
      <div className="my-6 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <Checkbox
            id="has-variants"
            checked={hasVariants}
            onCheckedChange={(checked) => {
              setHasVariants(!!checked);
              if (!checked) {
                setVariantRows([newVariantRow()]);
                setAxisName("Size");
              }
            }}
          />
          <Label htmlFor="has-variants" className="text-sm cursor-pointer">
            This product has sizes / options
          </Label>
        </div>

        {hasVariants && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            {/* Axis name */}
            <label className="flex flex-col gap-1 mb-4 max-w-xs">
              <span className="text-sm">Option axis name</span>
              <input
                type="text"
                value={axisName}
                onChange={(e) => setAxisName(e.target.value)}
                placeholder="e.g. Size, Color, Volume"
                className="p-2 px-4 outline-none border border-slate-200 rounded bg-white"
              />
            </label>

            {/* Variant rows */}
            <div className="flex flex-col gap-3">
              {variantRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) =>
                      updateVariantRow(idx, "value", e.target.value)
                    }
                    placeholder={`${axisName} value (e.g. S, M, L)`}
                    className="p-2 px-3 outline-none border border-slate-200 rounded bg-white text-sm w-36"
                  />
                  <input
                    type="number"
                    value={row.price}
                    onChange={(e) =>
                      updateVariantRow(idx, "price", e.target.value)
                    }
                    placeholder="Price (KES)"
                    className="p-2 px-3 outline-none border border-slate-200 rounded bg-white text-sm w-32"
                  />
                  <div className="flex items-center gap-1">
                    <Checkbox
                      id={`instock-${idx}`}
                      checked={row.inStock}
                      onCheckedChange={(checked) =>
                        updateVariantRow(idx, "inStock", !!checked)
                      }
                    />
                    <Label
                      htmlFor={`instock-${idx}`}
                      className="text-xs cursor-pointer"
                    >
                      In stock
                    </Label>
                  </div>
                  {variantRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      className="text-red-400 hover:text-red-600 transition"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addVariantRow}
              className="mt-3 flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 transition"
            >
              <Plus className="h-4 w-4" />
              Add option
            </button>
          </div>
        )}
      </div>

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
        *AI Generated content may be inaccurate.
      </p>
    </form>
  );
}
