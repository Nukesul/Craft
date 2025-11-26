import { useEffect, useState } from "react";
import { getCategories, getProductsByCategory } from "../api/products";

export default function TestMenu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
    
  useEffect(() => {
    async function load() {
      const cats = await getCategories();
      setCategories(cats);

      if (cats.length > 0) {
        const prods = await getProductsByCategory(cats[0].id);
        setProducts(prods);
      }
    }

    load();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Проверка Supabase</h1>

      <h2>Категории:</h2>
      <pre>{JSON.stringify(categories, null, 2)}</pre>

      <h2>Товары:</h2>
      <pre>{JSON.stringify(products, null, 2)}</pre>
    </div>
  );
}
