import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Product } from "../types";
import { api } from "../api";
import { formatPrecio } from "../format";
import { LogoIcon } from "../components/LogoIcon";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Settings, 
  Check, 
  Sparkles, 
  ShieldCheck,
  Package
} from "lucide-react";

interface TiendaProps {
  navigate: (path: string) => void;
}

export const Tienda: React.FC<TiendaProps> = ({ navigate }) => {
  const { addToCart, itemCount } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [addedItem, setAddedItem] = useState<string | null>(null);

  useEffect(() => {
    api<Product[]>("/api/products")
      .then(setProducts)
      .catch(() => {});
  }, []);

  const categories = [
    "Todos",
    "Nutrición y Alimento",
    "Bienestar y Estética",
    "Medicamentos",
    "Pulgas y Garrapatas",
  ];

  const handleAdd = (prod: Product) => {
    addToCart(prod);
    setAddedItem(prod.nombre);
    setTimeout(() => setAddedItem(null), 2500);
  };

  const filteredProducts = products.filter((p) => {
    const matchCat =
      activeCategory === "Todos" || p.categoria === activeCategory;
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion &&
        p.descripcion.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="pb-16 bg-slate-50 min-h-screen">
      {/* Vet Admin Bar */}
      {user?.rol === "veterinario" && (
        <div className="bg-blue-50 border-b border-blue-200 py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-xs text-blue-900 font-semibold flex items-center gap-2">
              <LogoIcon size={16} />
              <span>Modo Administrador activo: Podés agregar o modificar productos y stock del catálogo oficial.</span>
            </span>
            <button
              onClick={() => navigate("/admin/tienda")}
              className="btn btn-primary btn-sm text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5"
            >
              <Settings size={14} />
              <span>Gestionar Catálogo</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white mx-4 sm:mx-8 md:mx-12 my-10 rounded-3xl border border-blue-900/50 shadow-xl p-8 sm:p-14">
        <div className="max-w-2xl space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-500/20 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 border border-blue-400/30">
            <LogoIcon size={14} />
            <span>Farmacia &amp; Nutrición</span>
          </span>
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Tienda Veterinaria
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pt-1">
              Alimentos balanceados, medicamentos y productos de higiene oficial.
            </p>
          </div>

          <div className="relative max-w-lg pt-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white text-slate-900 placeholder:text-slate-400 pl-11 pr-4 py-3.5 rounded-xl border-0 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="container pb-20">
        {/* Category Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-12 pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                activeCategory === cat
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Toast Notification */}
        {addedItem && (
          <div className="fixed top-20 right-6 z-50 bg-blue-700 text-white text-xs font-bold py-3 px-5 rounded-2xl shadow-2xl border border-blue-400/30 flex items-center gap-2.5 animate-bounce">
            <Check size={16} className="text-blue-200" />
            <span>Agregado al carrito: <strong className="underline">{addedItem}</strong></span>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-14 text-center max-w-md mx-auto my-8">
            <Package size={40} className="text-slate-400 mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 mb-2 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Probá con otro término de búsqueda o seleccioná otra categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group min-h-[360px]"
              >
                <div>
                  <div className="h-52 bg-slate-100/60 p-6 relative flex items-center justify-center border-b border-slate-100">
                    {prod.etiqueta && (
                      <span className="absolute top-4 left-4 text-[10px] font-bold px-3 py-1 rounded-lg bg-blue-600 text-white uppercase tracking-wider shadow-sm">
                        {prod.etiqueta}
                      </span>
                    )}
                    {prod.requiere_receta && (
                      <span className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                        Receta médica
                      </span>
                    )}
                    <img
                      src={
                        prod.imagen ||
                        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80"
                      }
                      alt={prod.nombre}
                      className="max-h-36 max-w-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="p-6 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                      {prod.categoria}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {prod.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-1">
                      {prod.descripcion}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Precio final</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatPrecio(prod.precio)}
                    </span>
                  </div>
                  {(prod.stock ?? 0) > 0 ? (
                    <button
                      onClick={() => handleAdd(prod)}
                      className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 flex items-center justify-center font-bold transition-all shadow-sm cursor-pointer"
                      title="Agregar al carrito"
                    >
                      <Plus size={20} />
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                      Sin stock
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <div className="fixed bottom-24 right-6 z-40">
          <button
            onClick={() => navigate("/carrito")}
            className="btn btn-primary shadow-2xl flex items-center gap-3 py-3.5 px-6 text-sm font-bold cursor-pointer rounded-full"
          >
            <ShoppingCart size={18} />
            <span>Ver Carrito ({itemCount})</span>
          </button>
        </div>
      )}
    </div>
  );
};
