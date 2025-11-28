// src/components/Menu.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Header from "./Header";

const FALLBACK = "/placeholder.png";

const normalizeImageEntry = (img) => {
  if (!img) return null;
  if (typeof img === "object") {
    if (img.url) return img.url;
    if (img.path) {
      const res = supabase.storage.from("product-images").getPublicUrl(img.path);
      return res?.data?.publicUrl || null;
    }
    return null;
  }
  if (typeof img === "string") {
    const s = img.trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        return normalizeImageEntry(parsed);
      } catch {}
    }
    try {
      const res = supabase.storage.from("product-images").getPublicUrl(s);
      if (res?.data?.publicUrl) return res.data.publicUrl;
    } catch {}
    return s || null;
  }
  return null;
};

const getAllImages = (images) => {
  if (!images) return [FALLBACK];
  if (typeof images === "string") {
    const trimmed = images.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return getAllImages(parsed);
      } catch {
        const one = normalizeImageEntry(trimmed);
        return [one || FALLBACK];
      }
    } else {
      const one = normalizeImageEntry(trimmed);
      return [one || FALLBACK];
    }
  }
  if (Array.isArray(images)) {
    const list = images.flatMap(it => {
      const val = normalizeImageEntry(it);
      return val ? [val] : [];
    }).filter(Boolean);
    return list.length ? list : [FALLBACK];
  }
  if (typeof images === "object") {
    const single = normalizeImageEntry(images);
    return single ? [single] : [FALLBACK];
  }
  return [FALLBACK];
};

const getFirstImage = (images) => getAllImages(images)[0] || FALLBACK;

export default function Menu({ setIsAdminAuthenticated }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const rafTick = useRef(false);
  const lastActiveRef = useRef(null); // ← Исправление: убрана зависимость от activeSection
  const headerOffset = 120;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: cats } = await supabase.from("categories").select("*").order("name");
        const { data: prods } = await supabase.from("products").select("*");
        if (!mounted) return;
        setCategories(cats || []);
        setProducts(prods || []);
        if (cats?.length > 0 && !activeSection) {
          const firstId = cats[0].id;
          setActiveSection(firstId);
          lastActiveRef.current = firstId;
        }
      } catch (err) {
        console.error("読み込みエラー", err);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ← Главная ошибка исправлена: зависимость только от categories
  useEffect(() => {
    if (!categories || categories.length === 0) return;

    const onScroll = () => {
      if (rafTick.current) return;
      rafTick.current = true;
      requestAnimationFrame(() => {
        const offset = window.scrollY + headerOffset;
        for (const cat of categories) {
          const el = document.getElementById(`category-${cat.id}`);
          if (!el) continue;
          const top = el.offsetTop;
          const bottom = top + el.offsetHeight;
          if (offset >= top && offset < bottom - 100) {
            if (lastActiveRef.current !== cat.id) {
              lastActiveRef.current = cat.id;
              setActiveSection(cat.id);
            }
            break;
          }
        }
        rafTick.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  const scrollToCategory = useCallback((catId) => {
    const el = document.getElementById(`category-${catId}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset + 8;
    setActiveSection(catId);
    lastActiveRef.current = catId;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
    if (!selectedProduct) setCurrentImageIndex(0);
    return () => { document.body.style.overflow = ""; };
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    const imgs = getAllImages(selectedProduct.product_images);
    const preload = (url) => { if (!url) return; const i = new Image(); i.src = url; };
    const next = (currentImageIndex + 1) % imgs.length;
    const prev = (currentImageIndex - 1 + imgs.length) % imgs.length;
    preload(imgs[next]);
    preload(imgs[prev]);

    const onKey = (e) => {
      if (e.key === "Escape") setSelectedProduct(null);
      if (e.key === "ArrowLeft") setCurrentImageIndex(i => (i - 1 + imgs.length) % imgs.length);
      if (e.key === "ArrowRight") setCurrentImageIndex(i => (i + 1) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedProduct, currentImageIndex]);

  const handlePrevImage = () => {
    const imgs = getAllImages(selectedProduct?.product_images || []);
    setCurrentImageIndex(prev => (prev - 1 + imgs.length) % imgs.length);
  };

  const handleNextImage = () => {
    const imgs = getAllImages(selectedProduct?.product_images || []);
    setCurrentImageIndex(prev => (prev + 1) % imgs.length);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header
        categories={categories}
        activeSection={activeSection}
        scrollToCategory={scrollToCategory}
        setIsAdminAuthenticated={setIsAdminAuthenticated}
      />

      <main className="pt-28 pb-32">
        {categories.map(cat => {
          const items = products.filter(p => p.category_id === cat.id);
          if (!items?.length) return null;

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="max-w-7xl mx-auto px-5 mb-24">
              <h2 className="text-center text-4xl md:text-5xl font-bold text-stone-800 mb-12 tracking-tight">
                {cat.name}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-7 md:gap-10">
                {items.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setCurrentImageIndex(0);
                    }}
                    className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-transform duration-300 hover:-translate-y-2 focus:outline-none"
                  >
                    <div className="relative aspect-[4/4] bg-gradient-to-br from-stone-50 to-amber-50 p-6 md:p-10 flex items-center justify-center">
                      <img
                        src={getFirstImage(product.product_images)}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                        onError={e => { e.currentTarget.src = FALLBACK; }}
                      />
                    </div>
                    <div className="px-6 pb-7 pt-4 text-center">
                      <h3 className="font-bold text-xl text-stone-900 leading-tight">{product.name}</h3>
                      <p className="mt-2 font-semibold text-lg text-amber-800">
                        {product.variants?.[0]?.price ? `${product.variants[0].price} ¥` : "お問い合わせください"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Модальное окно */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" onClick={() => setSelectedProduct(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] md:h-auto max-h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-30 text-stone-600 hover:text-stone-800 bg-white/80 rounded-full p-2 md:p-3"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative flex-1 md:w-3/5 bg-stone-50 flex items-center justify-center overflow-hidden p-4 md:p-0">
              {getAllImages(selectedProduct.product_images).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${selectedProduct.name} ${i + 1}`}
                  loading="lazy"
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-400 ease-in-out ${
                    currentImageIndex === i ? "opacity-100 scale-100" : "opacity-0 scale-105"
                  }`}
                  onError={e => { e.currentTarget.src = FALLBACK; }}
                />
              ))}

              {getAllImages(selectedProduct.product_images).length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); handlePrevImage(); }} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white/90 text-stone-800 p-3 md:p-4 rounded-full z-20">
                    <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleNextImage(); }} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white/90 text-stone-800 p-3 md:p-4 rounded-full z-20">
                    <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {getAllImages(selectedProduct.product_images).map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setCurrentImageIndex(i); }}
                    className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition ${currentImageIndex === i ? "bg-amber-800" : "bg-stone-300 hover:bg-stone-400"}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 md:w-2/5 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold text-stone-900 mb-4 md:mb-6">{selectedProduct.name}</h2>
                {selectedProduct.description && (
                  <p className="text-stone-600 text-sm md:text-lg leading-relaxed mb-6 md:mb-8">
                    {selectedProduct.description}
                  </p>
                )}
              </div>
              <div className="mt-4 md:mt-auto">
                <h3 className="text-xl md:text-2xl font-semibold text-stone-800 mb-3 md:mb-4">バリエーション</h3>
                <div className="space-y-3 md:space-y-4">
                  {selectedProduct.variants?.map((v, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-stone-200 pb-2 md:pb-3">
                      <span className="text-stone-600 font-medium text-sm md:text-base">{v.size}</span>
                      <span className="font-bold text-xl md:text-2xl text-amber-800">{v.price} ¥</span>
                    </div>
                  )) || <p className="text-stone-500">バリエーションはありません</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}