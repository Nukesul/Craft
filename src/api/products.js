import { supabase } from "../lib/supabase";

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categoryId) {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(image_url)")
    .eq("category_id", categoryId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}
