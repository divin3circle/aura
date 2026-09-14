// Department -> subcategories + suggested brands. Single source for the admin cascade + browse.
export const DEPARTMENTS = {
  COSMETICS: {
    label: "Cosmetics",
    categories: ["Skincare","Masks","Fragrances","Sunscreen","Cleansers","Toners","Serums","Makeup","Haircare"],
    brands: ["COSRX","Innisfree","MISSHA","SKIN1004","AXIS-Y","AHC","Centellian24","LURON"],
  },
  ELECTRONICS: {
    label: "Electronics",
    categories: ["Mobile Phones","Smartwatches","Laptops","Tablets","Earbuds","Accessories"],
    brands: ["Apple","Samsung","Xiaomi","Oppo","Google"],
  },
};

export const departmentKeys = Object.keys(DEPARTMENTS);
export const categoriesFor = (dept) => DEPARTMENTS[dept]?.categories ?? [];
export const brandsFor = (dept) => DEPARTMENTS[dept]?.brands ?? [];
