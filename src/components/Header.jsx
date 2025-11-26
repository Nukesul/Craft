// File: src/components/Header.jsx
// (модифицированный твой Header — оставил логику и refs, мелкие правки для стабильности)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../logo.jpg";

export default function Header({
  categories = [],
  activeSection,
  scrollToCategory,
  setIsAdminAuthenticated
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const mobileRef = useRef(null);
  const desktopRef = useRef(null);
  const categoryRefs = useRef({});

  const handleAdminEnter = () => {
    if (password === "bakery") {
      setIsAdminAuthenticated(true);
      navigate("/admin");
      setShowPassword(false);
      setPassword("");
    } else {
      alert("Неверный пароль");
      setPassword("");
    }
  };

  // Автоцентрирование (работает на resize)
  useEffect(() => {
    if (!activeSection) return;
    const isDesktop = window.innerWidth >= 1024;
    const container = isDesktop ? desktopRef.current : mobileRef.current;
    const button = categoryRefs.current[activeSection];
    if (!container || !button) return;

    // slight delay to ensure layout stable (helps on resize)
    const id = setTimeout(() => {
      const containerWidth = container.offsetWidth;
      const buttonLeft = button.offsetLeft;
      const buttonWidth = button.offsetWidth;
      const target = buttonLeft - containerWidth / 2 + buttonWidth / 2;
      container.scrollTo({ left: target, behavior: "smooth" });
    }, 50);

    return () => clearTimeout(id);
  }, [activeSection]);

  // ensure refs cleared on categories change
  useEffect(() => {
    categoryRefs.current = {};
  }, [categories]);

  return (
    <>
      <header className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/20 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-stone-200 shadow">
              <img src={logo} className="w-full h-full object-cover" alt="logo" />
            </div>
            <span className="text-2xl sm:text-3xl font-semibold text-amber-900 hidden sm:block">Craft Bakery</span>
          </div>

          <button onClick={() => setShowPassword(true)} className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur text-amber-800 rounded-full hover:bg-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>

        {/* Desktop */}
        <nav ref={desktopRef} className="hidden lg:flex overflow-x-auto no-scrollbar flex-nowrap gap-3 px-4 pb-3 pt-1 w-full justify-center">
          <div className="inline-flex gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                ref={el => (categoryRefs.current[cat.id] = el)}
                onClick={() => scrollToCategory(cat.id)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition ${activeSection === cat.id ? "bg-amber-500 text-white shadow" : "bg-white/60 backdrop-blur text-amber-800 hover:bg-amber-100"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile */}
        <nav ref={mobileRef} className="lg:hidden flex overflow-x-auto no-scrollbar flex-nowrap gap-3 px-4 pb-3 pt-1 border-t border-white/30">
          {categories.map(cat => (
            <button
              key={cat.id}
              ref={el => (categoryRefs.current[cat.id] = el)}
              onClick={() => scrollToCategory(cat.id)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition ${activeSection === cat.id ? "bg-amber-500 text-white shadow" : "bg-white/60 backdrop-blur text-amber-800 hover:bg-amber-100"}`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </header>

      {showPassword && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowPassword(false)}>
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center mb-4">Вход в админку</h3>

            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminEnter()} placeholder="Пароль" className="w-full px-4 py-3 border rounded-lg focus:border-amber-500 outline-none" />

            <div className="flex gap-3 mt-5">
              <button onClick={handleAdminEnter} className="flex-1 bg-amber-500 text-white py-3 rounded-lg hover:bg-amber-600">Войти</button>
              <button onClick={() => { setShowPassword(false); setPassword(""); }} className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
