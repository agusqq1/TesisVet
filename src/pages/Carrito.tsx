import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Order } from "../types";
import { api } from "../api";
import { formatPrecio } from "../format";
import { Mail, CheckCircle2, Trash2, ShoppingBag, ArrowLeft, ArrowRight, Minus, Plus, Store, Truck, AlertTriangle } from "lucide-react";
import { LogoIcon } from "../components/LogoIcon";

interface CarritoProps {
  navigate: (path: string) => void;
}

export const Carrito: React.FC<CarritoProps> = ({ navigate }) => {
  const { items, setQuantity, removeFromCart, clearCart, total } = useCart();
  const { user } = useAuth();
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [entrega, setEntrega] = useState<"retiro" | "envio">("retiro");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState(user?.telefono || "");

  const llevaReceta = items.some((i) => i.product.requiere_receta);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (items.length === 0) return;
    if (entrega === "envio" && direccion.trim().length < 5) {
      setError("Ingresá la dirección de envío.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const order = await api<Order>("/api/orders", {
        method: "POST",
        body: {
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          entrega,
          direccion_envio: direccion,
          telefono_contacto: telefono,
        },
      });
      setCompletedOrder(order);
      clearCart();
    } catch (e: any) {
      setError(e.message || "Error al procesar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (completedOrder) {
    const pedidoConReceta = completedOrder.items.some((it) => it.requiere_receta);

    return (
      <div className="container section" style={{ maxWidth: "720px" }}>
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 mb-2">
              ¡Pedido Recibido!
            </span>

            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-1">
              ¡Gracias por tu pedido, {completedOrder.cliente_nombre.split(" ")[0]}!
            </h1>

            <p className="text-slate-500 text-sm">
              Pedido <strong className="text-slate-800 font-bold font-mono">#{completedOrder.order_code}</strong> registrado. Ya reservamos tus productos.
            </p>
          </div>

          {/* Entrega y pago */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 text-left shadow-sm text-xs text-slate-700 space-y-2">
            <p className="flex items-center gap-2 font-bold text-sm text-blue-950">
              {completedOrder.entrega === "envio" ? <Truck size={16} /> : <Store size={16} />}
              <span>
                {completedOrder.entrega === "envio"
                  ? `Envío a domicilio: ${completedOrder.direccion_envio}`
                  : "Retiro en la clínica"}
              </span>
            </p>
            <p>
              El pago se realiza al {completedOrder.entrega === "envio" ? "recibir" : "retirar"} el pedido. Te vamos a contactar para coordinar la entrega.
            </p>
            {completedOrder.email_enviado && (
              <p className="flex items-center gap-1.5 text-blue-900">
                <Mail size={14} />
                <span>Te enviamos el detalle a <strong>{completedOrder.cliente_email}</strong>.</span>
              </p>
            )}
            {pedidoConReceta && (
              <p className="flex items-start gap-1.5 text-amber-800 font-semibold">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Tu pedido incluye productos de venta bajo receta: vas a tener que presentar la receta veterinaria para que te los entreguemos.</span>
              </p>
            )}
          </div>

          {/* Order items summary card */}
          <div className="border border-slate-200 rounded-2xl p-5 text-left bg-slate-50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-blue-600" />
              <span>Detalle del Pedido #{completedOrder.order_code}</span>
            </h3>
            <div className="divide-y divide-slate-200 text-xs bg-white rounded-xl p-3 border border-slate-200/80">
              {completedOrder.items.map((it) => (
                <div key={it.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{it.producto_nombre}</span>
                    <span className="text-slate-500 block text-[11px]">
                      Cantidad: {it.cantidad} × {formatPrecio(it.precio_unitario)}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatPrecio(it.precio_unitario * it.cantidad)}
                  </span>
                </div>
              ))}
              <div className="pt-3 flex items-center justify-between font-bold text-sm">
                <span className="text-slate-800">Total a pagar:</span>
                <span className="text-blue-700 text-lg font-extrabold">{formatPrecio(completedOrder.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate("/tienda")}
              className="btn btn-primary px-6 py-2.5 text-xs font-bold"
            >
              Volver a la Tienda
            </button>
            <button
              onClick={() => navigate("/perfil")}
              className="btn btn-outline px-6 py-2.5 text-xs font-semibold"
            >
              Ver Mis Pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ maxWidth: "800px" }}>
      <button
        onClick={() => navigate("/tienda")}
        className="text-xs font-bold text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Volver a la Tienda</span>
      </button>

      <div className="flex items-center gap-2 mb-3">
        <LogoIcon size={24} />
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200">
          Tienda &amp; Farmacia
        </span>
      </div>

      <div className="space-y-1 mb-8">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
          Carrito de Compras
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">
          Revisá tus productos antes de confirmar el pedido.
        </p>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Tu carrito está vacío</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            Explorá nuestra tienda para agregar alimentos balanceados, champús o medicamentos.
          </p>
          <button onClick={() => navigate("/tienda")} className="btn btn-primary font-bold text-xs py-2.5 px-6">
            Ir a la Tienda
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      item.product.imagen ||
                      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80"
                    }
                    alt={item.product.nombre}
                    className="w-16 h-16 object-cover rounded-2xl border border-slate-200"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {item.product.nombre}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => setQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="Quitar una unidad"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="Agregar una unidad"
                      >
                        <Plus size={13} />
                      </button>
                      <span className="text-xs text-slate-500">× {formatPrecio(item.product.precio)}</span>
                    </div>
                    {item.product.requiere_receta && (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1.5 inline-block">
                        Requiere Receta
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-extrabold text-base text-slate-900">
                    {formatPrecio(item.product.precio * item.quantity)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {llevaReceta && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>Hay productos de venta bajo receta: se entregan únicamente presentando la receta veterinaria.</span>
            </div>
          )}

          {/* Entrega */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">¿Cómo querés recibirlo?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntrega("retiro")}
                className={`p-3 rounded-xl border text-left text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                  entrega === "retiro"
                    ? "bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 text-blue-900"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <Store size={18} />
                <span><strong className="block text-sm">Retiro en la clínica</strong>Pagás al retirar</span>
              </button>
              <button
                type="button"
                onClick={() => setEntrega("envio")}
                className={`p-3 rounded-xl border text-left text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                  entrega === "envio"
                    ? "bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 text-blue-900"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <Truck size={18} />
                <span><strong className="block text-sm">Envío a domicilio</strong>Pagás al recibir</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {entrega === "envio" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dirección de envío *</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle, número y localidad"
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono de contacto</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="11-1234-5678"
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Total a Pagar:</span>
              <span className="text-3xl font-extrabold text-blue-700">
                {formatPrecio(total)}
              </span>
            </div>
            {!user && (
              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 px-3 rounded-xl border border-slate-200">
                Para confirmar el pedido vas a tener que iniciar sesión.
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              onClick={clearCart}
              className="btn btn-light text-xs font-semibold py-2.5 px-4"
            >
              Vaciar Carrito
            </button>
            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="btn btn-primary text-xs font-bold py-2.5 px-6 shadow-lg shadow-blue-600/25 flex items-center gap-2"
            >
              <span>{submitting ? "Procesando pedido..." : user ? "Confirmar Pedido" : "Iniciar sesión para comprar"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
