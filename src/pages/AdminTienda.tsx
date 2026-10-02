import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Product, ProductCategory } from "../types";
import { AdminSidebar } from "../components/AdminSidebar";
import { api } from "../api";
import { formatPrecio } from "../format";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";

interface AdminTiendaProps {
  navigate: (path: string) => void;
}

const defaultCategories: ProductCategory[] = [
  "Medicamentos",
  "Bienestar y Estética",
  "Nutrición y Alimento",
  "Pulgas y Garrapatas",
];

const imagePresets = [
  { label: "Medicamento", url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80" },
  { label: "Champú / Cuidado", url: "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400&q=80" },
  { label: "Alimento Bolsa", url: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80" },
  { label: "Vitaminas / Suplemento", url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80" },
  { label: "Antiparasitario", url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&q=80" },
];

export const AdminTienda: React.FC<AdminTiendaProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<ProductCategory>("Medicamentos");
  const [etiqueta, setEtiqueta] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">(0);
  const [requiereReceta, setRequiereReceta] = useState(false);
  const [imagen, setImagen] = useState(imagePresets[0].url);
  const [customImg, setCustomImg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = () => {
    setLoading(true);
    api<Product[]>("/api/products")
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setNombre("");
    setCategoria("Medicamentos");
    setEtiqueta("");
    setDescripcion("");
    setPrecio("");
    setStock(0);
    setRequiereReceta(false);
    setImagen(imagePresets[0].url);
    setCustomImg("");
    setMsg(null);
    setShowModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setNombre(prod.nombre);
    setCategoria(prod.categoria);
    setEtiqueta(prod.etiqueta || "");
    setDescripcion(prod.descripcion || "");
    setPrecio(prod.precio);
    setStock(prod.stock ?? 0);
    setRequiereReceta(prod.requiere_receta ?? false);
    setImagen(prod.imagen || imagePresets[0].url);
    setCustomImg(prod.imagen && !imagePresets.some((p) => p.url === prod.imagen) ? prod.imagen : "");
    setMsg(null);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || precio === "") {
      setMsg({ type: "error", text: "El nombre y el precio son obligatorios." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    const finalImage = customImg.trim() || imagen;

    const payload = {
      nombre: nombre.trim(),
      categoria,
      etiqueta: etiqueta.trim(),
      descripcion: descripcion.trim(),
      precio: Number(precio),
      stock: Number(stock) || 0,
      requiere_receta: requiereReceta,
      imagen: finalImage,
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      await api(url, { method, body: payload });
      setSubmitting(false);

      setMsg({
        type: "success",
        text: editingProduct ? "¡Producto modificado con éxito!" : "¡Producto creado con éxito!",
      });

      fetchProducts();
      setTimeout(() => {
        setShowModal(false);
      }, 800);
    } catch (e: any) {
      setSubmitting(false);
      setMsg({ type: "error", text: e.message || "Error al guardar el producto." });
    }
  };

  const handleDelete = async (prod: Product) => {
    if (!confirm(`¿Estás seguro de que deseás eliminar "${prod.nombre}" de la tienda?`)) {
      return;
    }

    try {
      await api(`/api/products/${prod.id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = categoryFilter === "Todos" || p.categoria === categoryFilter;
    const matchesSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="admin-shell">
      <AdminSidebar active="tienda" navigate={navigate} />

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Tienda &amp; Farmacia</h1>
            <p className="text-sm text-gray-600">
              Agregá, modificá precios, controlá stock o eliminá productos disponibles para los clientes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/tienda")} className="btn btn-outline btn-sm flex items-center gap-1.5 font-semibold">
              <Eye size={14} />
              <span>Ver Tienda Pública</span>
            </button>
            <button onClick={openCreateModal} className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold">
              <Plus size={14} />
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        <div className="panel-card">
          {/* Controls Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="search-bar max-w-xs flex items-center gap-2">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-[#e1e0d8] rounded-xl px-3 py-2 bg-white text-sm"
              >
                <option value="Todos">Todas las categorías</option>
                {defaultCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-gray-500 font-semibold">
              Total: {filteredProducts.length} productos
            </div>
          </div>

          {/* Table of Products */}
          {loading ? (
            <p className="text-center py-10 text-gray-500">Cargando catálogo...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h2>No se encontraron productos</h2>
              <p className="text-gray-500 mt-1 mb-4">
                Probá cambiando los filtros o creá un nuevo producto para la tienda.
              </p>
              <button onClick={openCreateModal} className="btn btn-primary btn-sm">
                + Crear Producto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Receta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imagen || imagePresets[0].url}
                            alt={p.nombre}
                            className="w-12 h-12 rounded-xl object-cover border border-[#e1e0d8] bg-white flex-shrink-0"
                          />
                          <div>
                            <strong className="block text-sm text-gray-900">{p.nombre}</strong>
                            <span className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                              {p.descripcion || "Sin descripción"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f1f0ea] text-gray-800">
                          {p.categoria}
                        </span>
                        {p.etiqueta && (
                          <span className="block mt-1 text-[10px] font-bold text-[#2f4b3c]">
                            {p.etiqueta}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong className="text-base text-[#2f4b3c]">
                          {formatPrecio(p.precio)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            (p.stock ?? 0) > 10
                              ? "bg-green-100 text-green-800"
                              : (p.stock ?? 0) > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.stock ?? 0} u.
                        </span>
                      </td>
                      <td>
                        {p.requiere_receta ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Recetado
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Venta libre</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="btn btn-outline btn-sm text-xs py-1 px-2.5 flex items-center gap-1"
                            title="Editar producto"
                          >
                            <Pencil size={12} />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="btn btn-danger btn-sm text-xs py-1 px-2 flex items-center justify-center"
                            title="Eliminar de tienda"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Create/Edit Product */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8 border border-[#e1e0d8]">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-xl cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              {editingProduct ? "✏️ Modificar Producto" : "✨ Nuevo Producto en Tienda"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Completá los datos para que el producto esté disponible en la tienda online.
            </p>

            {msg && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold mb-4 ${
                  msg.type === "success"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="field">
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Nombre del Producto *
                </label>
                <div className="input-wrap">
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Antiparasitario NexGard Spectra"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Categoría *</label>
                  <div className="input-wrap">
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as ProductCategory)}
                    >
                      {defaultCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Etiqueta Promocional
                  </label>
                  <div className="input-wrap">
                    <input
                      type="text"
                      value={etiqueta}
                      onChange={(e) => setEtiqueta(e.target.value)}
                      placeholder="Ej: RECETADO, BIENESTAR, OFERTA"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Precio ($) *
                  </label>
                  <div className="input-wrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Ej: 35.50"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Stock Disponible (Unidades)</label>
                  <div className="input-wrap">
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Ej: 50"
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="text-xs font-bold text-gray-700 block mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="wizard-notes"
                  style={{ minHeight: "75px" }}
                  placeholder="Detalles sobre dosis, uso, beneficios o presentación..."
                />
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={requiereReceta}
                    onChange={(e) => setRequiereReceta(e.target.checked)}
                    className="rounded text-[#2f4b3c]"
                  />
                  <span>Requiere prescripción o receta médica veterinaria</span>
                </label>

                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-2">
                    Elegir imagen de catálogo:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {imagePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setImagen(preset.url);
                          setCustomImg("");
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                          imagen === preset.url && !customImg
                            ? "bg-[#2f4b3c] text-white border-[#2f4b3c]"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-5 h-5 rounded-full object-cover" />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    O enlace URL de imagen externa:
                  </label>
                  <input
                    type="url"
                    value={customImg}
                    onChange={(e) => setCustomImg(e.target.value)}
                    placeholder="https://ejemplo.com/foto-producto.jpg"
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Guardando..." : editingProduct ? "Guardar Cambios ✓" : "Publicar Producto ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
