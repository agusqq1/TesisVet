import React, { useState, useEffect } from "react";
import { Order, OrderEstado } from "../types";
import { AdminSidebar } from "../components/AdminSidebar";
import { api } from "../api";
import { formatFecha, formatPrecio } from "../format";
import { Store, Truck, AlertTriangle } from "lucide-react";

interface AdminPedidosProps {
  navigate: (path: string) => void;
}

const ESTADOS: Array<{ value: OrderEstado; label: string }> = [
  { value: "pendiente", label: "Pendiente de pago" },
  { value: "pagado", label: "Pagado" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const COLOR_ESTADO: Record<OrderEstado, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  pagado: "bg-brand-100 text-brand-900",
  enviado: "bg-brand-100 text-brand-900",
  entregado: "bg-emerald-100 text-emerald-900",
  cancelado: "bg-red-100 text-red-800",
};

// Pedidos de la tienda: el personal los cobra, los despacha y registra cada paso
export const AdminPedidos: React.FC<AdminPedidosProps> = ({ navigate }) => {
  const [pedidos, setPedidos] = useState<Order[]>([]);
  const [filtro, setFiltro] = useState<OrderEstado | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Order[]>("/api/orders?all=true")
      .then(setPedidos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const cambiarEstado = async (pedido: Order, estado: OrderEstado) => {
    if (estado === pedido.estado) return;
    if (
      estado === "cancelado" &&
      !confirm(`¿Cancelar el pedido #${pedido.order_code}? Los productos vuelven al stock y no se puede deshacer.`)
    ) {
      return;
    }

    setError("");
    try {
      const actualizado = await api<Order>(`/api/orders/${pedido.id}/estado`, {
        method: "PATCH",
        body: { estado },
      });
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? actualizado : p)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const visibles = pedidos.filter((p) => filtro === "todos" || p.estado === filtro);

  return (
    <div className="admin-shell">
      <AdminSidebar active="pedidos" navigate={navigate} />

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="text-2xl font-bold">Pedidos de Tienda</h1>
            <p className="text-sm text-gray-600">
              Compras hechas desde la web. Marcá cada pedido como pagado, enviado o entregado.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <div className="panel-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase text-gray-500">Estado:</label>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as OrderEstado | "todos")}
                className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm"
              >
                <option value="todos">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500 font-semibold">{visibles.length} pedidos</div>
          </div>

          {loading ? (
            <p className="text-center py-10 text-gray-500">Cargando pedidos...</p>
          ) : visibles.length === 0 ? (
            <p className="text-center py-10 text-gray-500">No hay pedidos para mostrar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Productos</th>
                    <th>Entrega</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.id} className={p.estado === "cancelado" ? "opacity-60 bg-gray-50" : ""}>
                      <td>
                        <strong className="font-mono">#{p.order_code}</strong>
                        <br />
                        <small className="text-gray-500 whitespace-nowrap">{formatFecha(p.creado_en)} · {p.creado_en.substring(11, 16)} hs</small>
                      </td>
                      <td>
                        <strong className="block text-slate-900">{p.cliente_nombre}</strong>
                        <small className="text-gray-500 block">{p.cliente_email}</small>
                        {p.telefono_contacto && (
                          <small className="text-gray-500 block">Tel: {p.telefono_contacto}</small>
                        )}
                      </td>
                      <td>
                        {p.items.map((it) => (
                          <div key={it.id} className="text-xs text-slate-700">
                            {it.cantidad} × {it.producto_nombre}
                            {it.requiere_receta && (
                              <span
                                className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 rounded"
                                title="Entregar solo contra presentación de receta"
                              >
                                <AlertTriangle size={10} /> Receta
                              </span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          {p.entrega === "envio" ? <Truck size={14} /> : <Store size={14} />}
                          {p.entrega === "envio" ? "Envío a domicilio" : "Retiro en clínica"}
                        </span>
                        {p.entrega === "envio" && (
                          <small className="text-gray-500 block max-w-[220px]">{p.direccion_envio}</small>
                        )}
                      </td>
                      <td>
                        <strong>{formatPrecio(p.total)}</strong>
                      </td>
                      <td>
                        <select
                          value={p.estado}
                          disabled={p.estado === "cancelado"}
                          onChange={(e) => cambiarEstado(p, e.target.value as OrderEstado)}
                          className={`text-xs font-bold rounded-lg px-2 py-1.5 border border-transparent cursor-pointer ${COLOR_ESTADO[p.estado]}`}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
