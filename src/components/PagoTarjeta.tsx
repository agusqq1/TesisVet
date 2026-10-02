import React, { useState } from "react";
import { DatosPago, Order } from "../types";
import { formatPrecio, hoyLocal } from "../format";
import { CUOTAS, detectarMarca, numeroValido } from "../tarjetas";
import { X, AlertCircle, CreditCard, Info, Lock } from "lucide-react";

interface PagoTarjetaProps {
  total: number;
  // Registra el pedido con el pago; si el pago se rechaza, lanza un error con el motivo
  onPagar: (pago: DatosPago) => Promise<Order>;
  onAprobado: (pedido: Order) => void;
  onCerrar: () => void;
}

// Lo que tarda como mínimo la pantalla de "procesando", para que se llegue a leer
const ESPERA_MINIMA_MS = 1600;

const esAmex = (marca: string | null) => marca === "American Express";

// "4111111111111111" → "4111 1111 1111 1111" (American Express agrupa 4-6-5)
function agrupar(numero: string, marca: string | null) {
  const grupos = esAmex(marca)
    ? [numero.slice(0, 4), numero.slice(4, 10), numero.slice(10, 15)]
    : numero.match(/.{1,4}/g) ?? [];
  return grupos.filter(Boolean).join(" ");
}

const INPUT =
  "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const LABEL = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";

// Pago con tarjeta de la tienda. Es una simulación: no se cobra nada, y el número y
// el código de seguridad se validan acá y no salen del navegador.
export const PagoTarjeta: React.FC<PagoTarjetaProps> = ({ total, onPagar, onAprobado, onCerrar }) => {
  const [numero, setNumero] = useState("");
  const [titular, setTitular] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [cuotas, setCuotas] = useState(1);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const marca = detectarMarca(numero);
  const largoNumero = esAmex(marca) ? 15 : 16;
  const largoCvv = esAmex(marca) ? 4 : 3;

  const cambiarNumero = (valor: string) => {
    const digitos = valor.replace(/\D/g, "");
    setNumero(digitos.slice(0, esAmex(detectarMarca(digitos)) ? 15 : 16));
  };

  const cambiarVencimiento = (valor: string) => {
    const digitos = valor.replace(/\D/g, "").slice(0, 4);
    setVencimiento(digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos);
  };

  const validar = () => {
    if (!marca) return "Aceptamos tarjetas Visa, Mastercard y American Express.";
    if (numero.length !== largoNumero || !numeroValido(numero)) return "Revisá el número de la tarjeta.";
    if (!titular.trim()) return "Ingresá el nombre del titular como figura en la tarjeta.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento)) return "Ingresá el vencimiento como MM/AA.";
    const [mes, anio] = vencimiento.split("/");
    if (`20${anio}-${mes}` < hoyLocal().substring(0, 7)) return "La tarjeta está vencida.";
    if (cvv.length !== largoCvv) return `El código de seguridad tiene ${largoCvv} dígitos.`;
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }

    setProcesando(true);
    setError("");
    const [resultado] = await Promise.allSettled([
      onPagar({ titular: titular.trim(), marca: marca!, ultimos4: numero.slice(-4), cuotas }),
      new Promise((resolve) => setTimeout(resolve, ESPERA_MINIMA_MS)),
    ]);
    if (resultado.status === "rejected") {
      setError(resultado.reason?.message || "No se pudo procesar el pago. Intentá nuevamente.");
      setProcesando(false);
      return;
    }
    onAprobado(resultado.value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[94vh] overflow-y-auto">
        {procesando ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
            <p className="font-bold text-slate-900 mt-5">Procesando el pago...</p>
            <p className="text-xs text-slate-500 mt-1">No cierres esta ventana.</p>
          </div>
        ) : (
          <>
            <button
              onClick={onCerrar}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Pago con tarjeta</h2>
                <p className="text-xs text-slate-500">
                  Total a pagar: <strong className="text-slate-800">{formatPrecio(total)}</strong>
                </p>
              </div>
            </div>

            {/* Vista previa de la tarjeta */}
            <div className="rounded-2xl p-5 mb-5 text-white bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="w-10 h-7 rounded-md bg-amber-200/90" />
                <span className="text-sm font-bold tracking-wide">{marca ?? "Crédito o débito"}</span>
              </div>
              <p className="font-mono text-lg tracking-widest mt-5 h-7">
                {agrupar(numero.padEnd(largoNumero, "•"), marca)}
              </p>
              <div className="flex items-end justify-between mt-4 text-[10px] uppercase tracking-wider text-brand-100">
                <div className="min-w-0">
                  <span className="block opacity-70">Titular</span>
                  <span className="block text-sm text-white font-semibold truncate normal-case tracking-normal">
                    {titular.trim().toUpperCase() || "NOMBRE Y APELLIDO"}
                  </span>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <span className="block opacity-70">Vence</span>
                  <span className="block text-sm text-white font-semibold font-mono">{vencimiento || "MM/AA"}</span>
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Pago de prueba: no se hace ningún cobro.</strong> No ingreses una tarjeta real. Usá la{" "}
                <span className="font-mono font-semibold whitespace-nowrap">4111 1111 1111 1111</span> con cualquier
                vencimiento futuro y código.
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className={LABEL}>Número de tarjeta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  placeholder="0000 0000 0000 0000"
                  value={agrupar(numero, marca)}
                  onChange={(e) => cambiarNumero(e.target.value)}
                  className={`${INPUT} font-mono`}
                />
              </div>

              <div>
                <label className={LABEL}>Nombre del titular</label>
                <input
                  type="text"
                  autoComplete="off"
                  required
                  maxLength={120}
                  placeholder="Como figura en la tarjeta"
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Vencimiento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    placeholder="MM/AA"
                    value={vencimiento}
                    onChange={(e) => cambiarVencimiento(e.target.value)}
                    className={`${INPUT} font-mono`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Código de seguridad</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    placeholder={"•".repeat(largoCvv)}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, largoCvv))}
                    className={`${INPUT} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL}>Cuotas</label>
                <select
                  value={cuotas}
                  onChange={(e) => setCuotas(Number(e.target.value))}
                  className={`${INPUT} bg-white`}
                >
                  {CUOTAS.map((c) => (
                    <option key={c} value={c}>
                      {c === 1
                        ? `1 pago de ${formatPrecio(total)}`
                        : `${c} cuotas sin interés de ${formatPrecio(total / c)}`}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-block py-3 font-bold">
                <Lock size={15} />
                <span>Pagar {formatPrecio(total)}</span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                El número y el código de seguridad no se guardan ni se envían al servidor.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
