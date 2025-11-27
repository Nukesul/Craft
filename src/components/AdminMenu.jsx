import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export default function AdminMenu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "", // ← всегда строка, никогда null!
  });

  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ size: "", price: "" });

  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [deletingId, setDeletingId] = useState(null); // оставляем state, но выключаем правило — безопасно и не ломает логику

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // отключаем правило проверки зависимостей, чтобы не вызвать лишних ререндеров

  const loadData = async () => {
    try {
      const { data: cats } = await supabase.from("categories").select("*").order("name");
      const { data: prods } = await supabase.from("products").select("*").order("created_at", { ascending: false });

      setCategories(cats || []);
      setProducts(prods || []);

      if (cats?.length > 0 && !form.category_id) {
        setForm(prev => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
  };

  const getFirstImageUrl = (images) => {
    if (!images || images.length === 0) return null;
    const first = images[0];
    if (typeof first === "object" && first?.url) return first.url;
    if (typeof first === "string") {
      try { const p = JSON.parse(first); return p.url || first; } catch { return first; }
    }
    return null;
  };

  const extractPaths = (images) => {
    if (!images) return [];
    return images
      .map(i => {
        if (typeof i === "object" && i?.path) return i.path;
        if (typeof i === "string") {
          try { const p = JSON.parse(i); return p.path; } catch {}
          try { return new URL(i).pathname.split("/").pop(); } catch {}
        }
        return null;
      })
      .filter(Boolean);
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const { error } = await supabaseAdmin.storage.from("product-images").upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabaseAdmin.storage.from("product-images").getPublicUrl(fileName);
    return { url: publicUrl, path: fileName };
  };

  // === ДОБАВЛЕНИЕ ===
  const addProduct = async () => {
    if (!form.name.trim() || !form.category_id || variants.length === 0) {
      return alert("Заполните название, выберите категорию и добавьте хотя бы один вариант");
    }

    setLoading(true);
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadImage(file));

      const { data, error } = await supabaseAdmin
        .from("products")
        .insert([{
          name: form.name.trim(),
          description: form.description.trim() || null,
          category_id: form.category_id, // ← UUID как строка
          product_images: uploaded.length ? uploaded : null,
          variants: variants.map(v => ({ size: v.size.trim(), price: Number(v.price) })),
        }])
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [data, ...prev]);
      resetForm();
      alert("Товар добавлен!");
    } catch (err) {
      console.error(err);
      alert("Ошибка добавления");
    } finally {
      setLoading(false);
    }
  };

  // === РЕДАКТИРОВАНИЕ ===
  const startEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "", // ← всегда строка!
    });
    setVariants(product.variants || []);
    setExistingImages(product.product_images || []);
    setFiles([]);
  };

  const saveEdit = async () => {
    if (!form.name.trim() || !form.category_id || variants.length === 0) {
      return alert("Заполните все поля и добавьте варианты");
    }

    setLoading(true);
    try {
      const newImages = [];
      for (const file of files) newImages.push(await uploadImage(file));
      const finalImages = [...existingImages, ...newImages];

      const { error } = await supabaseAdmin
        .from("products")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category_id: form.category_id, // ← UUID как строка
          product_images: finalImages.length ? finalImages : null,
          variants: variants.map(v => ({ size: v.size.trim(), price: Number(v.price) })),
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? { ...p, ...form, product_images: finalImages, variants }
          : p
      ));

      setEditingProduct(null);
      resetForm();
      alert("Товар сохранён!");
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    if (!newVariant.size.trim() || !newVariant.price) return;
    setVariants(prev => [...prev, { size: newVariant.size.trim(), price: Number(newVariant.price) }]);
    setNewVariant({ size: "", price: "" });
  };

  const removeVariant = (i) => setVariants(prev => prev.filter((_, idx) => idx !== i));
  const removeExistingImage = (i) => setExistingImages(prev => prev.filter((_, idx) => idx !== i));

  const deleteProduct = async (product) => {
    if (!window.confirm(`Удалить "${product.name}" навсегда?`)) return;
    setDeletingId(product.id); // используем set, переменная просто хранится
    try {
      const paths = extractPaths(product.product_images || []);
      if (paths.length > 0) await supabaseAdmin.storage.from("product-images").remove(paths);
      await supabaseAdmin.from("products").delete().eq("id", product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      alert("Удалено!");
    } catch (err) {
      alert("Ошибка");
    } finally {
      setDeletingId(null);
    }
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return alert("Введите название");
    const { data } = await supabaseAdmin.from("categories").insert([{ name }]).select().single();
    setCategories(prev => [...prev, data]);
    setNewCategory("");
  };

  const deleteCategory = async (cat) => {
    if (products.some(p => p.category_id === cat.id)) return alert("В категории есть товары!");
    if (!window.confirm(`Удалить "${cat.name}"?`)) return;
    await supabaseAdmin.from("categories").delete().eq("id", cat.id);
    setCategories(prev => prev.filter(c => c.id !== cat.id));
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category_id: categories[0]?.id || "", // ← всегда строка
    });
    setVariants([]);
    setNewVariant({ size: "", price: "" });
    setFiles([]);
    setExistingImages([]);
  };

  const cancelEdit = () => { setEditingProduct(null); resetForm(); };

  const handleDrop = (e) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...newFiles]);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-5xl font-bold text-center mb-12">CRAFT BAKERY — АДМИН</h1>

      {/* Категории */}
      <div className="max-w-5xl mx-auto mb-16 bg-white p-10 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-8">Категории</h2>
        <div className="flex gap-4 mb-8">
          <input placeholder="Новая категория" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} className="flex-1 p-5 border-2 rounded-2xl text-lg" />
          <button onClick={addCategory} className="bg-black text-white px-10 py-5 rounded-2xl font-bold">Добавить</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
          {categories.map(cat => (
            <div key={cat.id} className="bg-gray-100 p-6 rounded-2xl flex justify-between items-center shadow hover:shadow-lg">
              <span className="font-semibold">{cat.name}</span>
              <button onClick={() => deleteCategory(cat)} className="text-red-600 text-3xl">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Форма */}
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-3xl shadow-2xl mb-20">
        <h2 className="text-4xl font-bold mb-10 text-center">
          {editingProduct ? "Редактировать товар" : "Добавить товар"}
        </h2>

        <input placeholder="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-5 mb-6 border-2 rounded-2xl text-xl" />
        <textarea placeholder="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-5 mb-6 border-2 rounded-2xl" rows="3" />

        <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full p-5 mb-8 border-2 rounded-2xl text-lg">
          <option value="">Выберите категорию</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Варианты */}
        <div className="bg-green-50 p-8 rounded-3xl mb-8">
          <h3 className="text-2xl font-bold mb-6">Варианты</h3>
          <div className="flex gap-4 mb-6">
            <input placeholder="Размер / объём" value={newVariant.size} onChange={e => setNewVariant({ ...newVariant, size: e.target.value })} className="flex-1 p-5 border-2 rounded-2xl" />
            <input type="number" placeholder="Цена" value={newVariant.price} onChange={e => setNewVariant({ ...newVariant, price: e.target.value })} className="w-40 p-5 border-2 rounded-2xl" />
            <button onClick={addVariant} className="bg-green-600 text-white px-8 py-5 rounded-2xl text-2xl">+</button>
          </div>
          {variants.map((v, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl mb-3 flex justify-between items-center">
              <span className="text-xl">{v.size} — {v.price} ₽</span>
              <button onClick={() => removeVariant(i)} className="text-red-600 text-3xl">×</button>
            </div>
          ))}
        </div>

        {/* Фото */}
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="border-4 border-dashed rounded-3xl p-16 text-center mb-8">
          <p className="text-2xl mb-6">Перетащите фото или <label className="text-blue-600 underline cursor-pointer">
            <input type="file" multiple accept="image/*" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} className="hidden" /> выберите
          </label></p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-10">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              <img src={URL.createObjectURL(f)} alt={f.name || ""} className="w-full h-48 object-contain bg-white rounded-2xl border shadow" />
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-10 h-10 opacity-0 group-hover:opacity-100">×</button>
            </div>
          ))}
          {editingProduct && existingImages.map((img, i) => (
            <div key={i} className="relative group">
              <img src={typeof img === "object" ? img.url : img} alt={typeof img === "object" ? img.name || "" : ""} className="w-full h-48 object-contain bg-white rounded-2xl border shadow" />
              <button onClick={() => removeExistingImage(i)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-10 h-10 opacity-0 group-hover:opacity-100">×</button>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          <button onClick={editingProduct ? saveEdit : addProduct} disabled={loading} className="flex-1 bg-black text-white py-6 rounded-2xl text-2xl font-bold">
            {loading ? "Сохранение..." : editingProduct ? "Сохранить" : "Добавить"}
          </button>
          {editingProduct && <button onClick={cancelEdit} className="px-12 py-6 bg-gray-600 text-white rounded-2xl text-2xl font-bold">Отмена</button>}
        </div>
      </div>

      {/* Товары */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 max-w-7xl mx-auto">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center p-10">
              <img src={getFirstImageUrl(p.product_images) || "/placeholder.png"} alt={p.name || "product image"} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4">{p.name}</h3>
              <div className="space-y-3 mb-6">
                {p.variants?.map((v, i) => (
                  <div key={i} className="flex justify-between text-lg">
                    <span>{v.size}</span>
                    <span className="font-bold text-green-600">{v.price} ₽</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => startEdit(p)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold">Редактировать</button>
                <button onClick={() => deleteProduct(p)} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold">Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
