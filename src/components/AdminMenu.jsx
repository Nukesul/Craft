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
    category_id: "",
  });

  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ size: "", price: "" });

  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
      console.error("読み込みエラー:", err);
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

  // === 追加 ===
  const addProduct = async () => {
    if (!form.name.trim() || !form.category_id || variants.length === 0) {
      return alert("商品名、カテゴリー、バリエーションを入力してください。");
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
          category_id: form.category_id,
          product_images: uploaded.length ? uploaded : null,
          variants: variants.map(v => ({ size: v.size.trim(), price: Number(v.price) })),
        }])
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [data, ...prev]);
      resetForm();
      alert("商品を追加しました！");
    } catch (err) {
      console.error(err);
      alert("追加エラー");
    } finally {
      setLoading(false);
    }
  };
  const editProduct = (p) => {
    setEditingProduct(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      category_id: p.category_id,
    });
    setVariants(p.variants || []);
    setExistingImages(p.product_images || []);
    setFiles([]);
  };

  const updateProduct = async () => {
    if (!form.name.trim() || !form.category_id) {
      return alert("必要な項目を入力してください。");
    }

    setLoading(true);
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadImage(file));

      const updatedImages = [...existingImages, ...uploaded];

      const { error } = await supabaseAdmin
        .from("products")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category_id: form.category_id,
          product_images: updatedImages.length ? updatedImages : null,
          variants: variants.map(v => ({ size: v.size.trim(), price: Number(v.price) })),
        })
        .eq("id", editingProduct);

      if (error) throw error;

      loadData();
      resetForm();
      alert("商品が更新されました！");
    } catch (err) {
      console.error(err);
      alert("更新エラー");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("本当に削除しますか？")) return;

    setDeletingId(id);
    try {
      const product = products.find(p => p.id === id);
      const paths = extractPaths(product.product_images);

      if (paths.length > 0) {
        await supabaseAdmin.storage.from("product-images").remove(paths);
      }

      const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== id));
      alert("削除しました。");
    } catch (err) {
      console.error(err);
      alert("削除エラー");
    } finally {
      setDeletingId(null);
    }
  };

  const removeExistingImage = async (index) => {
    const img = existingImages[index];
    if (!img) return;

    if (!window.confirm("この画像を削除しますか？")) return;

    try {
      const path = img.path;
      if (path) {
        await supabaseAdmin.storage.from("product-images").remove([path]);
      }

      const updated = existingImages.filter((_, i) => i !== index);
      setExistingImages(updated);

      if (editingProduct) {
        await supabaseAdmin
          .from("products")
          .update({ product_images: updated })
          .eq("id", editingProduct);
      }
    } catch (err) {
      console.error(err);
      alert("画像削除エラー");
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", category_id: categories[0]?.id || "" });
    setVariants([]);
    setNewVariant({ size: "", price: "" });
    setFiles([]);
    setExistingImages([]);
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return alert("カテゴリー名を入力してください。");

    try {
      const { data, error } = await supabaseAdmin
        .from("categories")
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data]);
      setNewCategory("");
      alert("カテゴリーを追加しました！");
    } catch (err) {
      console.error(err);
      alert("カテゴリー追加エラー");
    }
  };
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>管理メニュー</h1>

      {/* === カテゴリー追加 === */}
      <div style={{ marginBottom: 30 }}>
        <h2>カテゴリー追加</h2>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            type="text"
            placeholder="カテゴリー名"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={addCategory}>追加</button>
        </div>
      </div>

      {/* === 商品フォーム === */}
      <div style={{ padding: 20, border: "1px solid #ccc", borderRadius: 8, marginBottom: 30 }}>
        <h2>{editingProduct ? "商品を編集" : "商品を追加"}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>

          {/* 商品名 */}
          <input
            type="text"
            placeholder="商品名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ padding: 8 }}
          />

          {/* 説明文 */}
          <textarea
            placeholder="説明文（任意）"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={{ padding: 8 }}
          />

          {/* カテゴリー選択 */}
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            style={{ padding: 8 }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* === バリエーション追加 === */}
          <div style={{ marginTop: 10 }}>
            <h3>バリエーション（サイズ・価格）</h3>

            <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
              <input
                type="text"
                placeholder="サイズ"
                value={newVariant.size}
                onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                style={{ flex: 1, padding: 8 }}
              />
              <input
                type="number"
                placeholder="価格"
                value={newVariant.price}
                onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                style={{ width: 100, padding: 8 }}
              />
              <button
                onClick={() => {
                  if (!newVariant.size || !newVariant.price) return alert("サイズと価格を入力してください。");
                  setVariants((prev) => [...prev, newVariant]);
                  setNewVariant({ size: "", price: "" });
                }}
              >
                追加
              </button>
            </div>

            {/* バリエーション一覧 */}
            {variants.length > 0 && (
              <ul style={{ marginTop: 10 }}>
                {variants.map((v, idx) => (
                  <li key={idx} style={{ marginBottom: 5 }}>
                    {v.size} - ¥{v.price}
                    <button
                      onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ marginLeft: 10 }}
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* === 画像アップロード === */}
          <div style={{ marginTop: 15 }}>
            <h3>商品画像</h3>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles([...e.target.files])}
            />

            {/* 既存画像 */}
            {existingImages.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <h4>既存の画像</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {existingImages.map((img, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img
                        src={img.url}
                        alt=""
                        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                      />
                      <button
                        onClick={() => removeExistingImage(i)}
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          background: "red",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* === 追加 / 更新 ボタン === */}
          <button
            onClick={editingProduct ? updateProduct : addProduct}
            disabled={loading}
            style={{ marginTop: 15, padding: 10 }}
          >
            {loading
              ? "処理中..."
              : editingProduct
              ? "更新する"
              : "追加する"}
          </button>

          {editingProduct && (
            <button onClick={resetForm} style={{ marginTop: 10 }}>
              キャンセル
            </button>
          )}
        </div>
      </div>
      {/* === 商品一覧 === */}
      <div>
        <h2>商品一覧</h2>

        {products.length === 0 && <p>商品がありません。</p>}

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 15,
                border: "1px solid #ddd",
                borderRadius: 8,
                display: "flex",
                gap: 15,
                alignItems: "flex-start",
              }}
            >
              {/* 画像 */}
              <img
                src={getFirstImageUrl(p.product_images)}
                alt=""
                style={{
                  width: 100,
                  height: 100,
                  objectFit: "cover",
                  borderRadius: 6,
                }}
              />

              {/* 商品情報 */}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <p style={{ margin: "5px 0" }}>{p.description || "説明なし"}</p>
                <p style={{ margin: "5px 0" }}>
                  カテゴリー:{" "}
                  {categories.find((c) => c.id === p.category_id)?.name || "不明"}
                </p>

                {/* バリエーション */}
                {p.variants?.length > 0 && (
                  <ul style={{ margin: 0 }}>
                    {p.variants.map((v, i) => (
                      <li key={i}>
                        {v.size} - ¥{v.price}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ボタン */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => editProduct(p)}>編集</button>

                <button
                  onClick={() => deleteProduct(p.id)}
                  disabled={deletingId === p.id}
                  style={{ background: "red", color: "white" }}
                >
                  {deletingId === p.id ? "削除中..." : "削除"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
