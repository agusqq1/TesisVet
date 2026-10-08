import React from "react";

// Escena de la portada: un gato corre por un sendero y un perro lo persigue. Van y
// vuelven en un circuito con perspectiva: en el tramo de ida pasan cerca (grandes) y en
// el de vuelta pasan lejos (chicos y más claros), lo que da la sensación de profundidad.
// Todo es SVG + CSS (ver .escena en index.css): no suma librerías ni pesa en el celular.
// Si el sistema pide "reducir movimiento", quedan quietos.

const Perro = () => (
  <svg viewBox="0 0 120 80" className="corredor-svg" aria-hidden="true">
    {/* cola */}
    <path className="cola" d="M14 36 C4 28, 6 16, 16 18" stroke="#b45309" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* patas traseras y delanteras (las de atrás más oscuras) */}
    <rect className="pata pata-a" x="22" y="48" width="9" height="26" rx="4.5" fill="#92400e" />
    <rect className="pata pata-b" x="70" y="48" width="9" height="26" rx="4.5" fill="#92400e" />
    <rect className="pata pata-c" x="32" y="48" width="9" height="26" rx="4.5" fill="#d97706" />
    <rect className="pata pata-d" x="80" y="48" width="9" height="26" rx="4.5" fill="#d97706" />
    {/* cuerpo */}
    <ellipse cx="54" cy="44" rx="36" ry="18" fill="#f59e0b" />
    <ellipse cx="60" cy="50" rx="22" ry="10" fill="#fcd34d" opacity=".8" />
    {/* cabeza */}
    <circle cx="94" cy="34" r="17" fill="#f59e0b" />
    <ellipse cx="104" cy="40" rx="9" ry="6.5" fill="#fcd34d" />
    <circle cx="110" cy="40" r="3.4" fill="#1f2937" />
    <circle cx="98" cy="31" r="2.6" fill="#1f2937" />
    {/* oreja caída */}
    <path className="oreja" d="M84 22 C76 26, 76 42, 86 44 C90 36, 90 28, 84 22 Z" fill="#b45309" />
    {/* lengua */}
    <path d="M104 46 c0 5, 5 6, 6 1" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* collar con chapa */}
    <path d="M80 44 q14 8 28 0" stroke="#2563eb" strokeWidth="4" fill="none" />
    <circle cx="94" cy="50" r="3" fill="#2563eb" />
  </svg>
);

const Gato = () => (
  <svg viewBox="0 0 110 80" className="corredor-svg" aria-hidden="true">
    {/* cola larga */}
    <path className="cola" d="M12 40 C-2 36, 0 18, 14 20" stroke="#475569" strokeWidth="5" strokeLinecap="round" fill="none" />
    <rect className="pata pata-a" x="24" y="50" width="7" height="24" rx="3.5" fill="#334155" />
    <rect className="pata pata-b" x="64" y="50" width="7" height="24" rx="3.5" fill="#334155" />
    <rect className="pata pata-c" x="32" y="50" width="7" height="24" rx="3.5" fill="#64748b" />
    <rect className="pata pata-d" x="72" y="50" width="7" height="24" rx="3.5" fill="#64748b" />
    {/* cuerpo */}
    <ellipse cx="50" cy="46" rx="32" ry="14" fill="#64748b" />
    <ellipse cx="54" cy="50" rx="18" ry="7" fill="#cbd5e1" opacity=".7" />
    {/* cabeza */}
    <circle cx="86" cy="36" r="14" fill="#64748b" />
    {/* orejas en punta */}
    <path className="oreja" d="M76 28 L74 12 L86 22 Z" fill="#64748b" />
    <path d="M90 22 L100 12 L98 28 Z" fill="#64748b" />
    <path d="M78 26 L77 17 L84 23 Z" fill="#fda4af" />
    {/* cara */}
    <circle cx="90" cy="34" r="2.6" fill="#0f172a" />
    <circle cx="98" cy="40" r="2" fill="#fb7185" />
    <path d="M86 42 q4 3 8 0 M88 41 l-8 1 M88 43 l-8 3" stroke="#0f172a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {/* collar con chapa */}
    <path d="M74 44 q12 6 24 0" stroke="#2563eb" strokeWidth="3.5" fill="none" />
    <circle cx="86" cy="49" r="2.6" fill="#2563eb" />
  </svg>
);

export const EscenaMascotas: React.FC = () => (
  <div className="escena" aria-label="Un gato corre y un perro lo persigue por el jardín de la clínica" role="img">
    <div className="escena-piso" />
    <div className="escena-sendero" />
    {/* arbustos de fondo, a distintas profundidades */}
    <span className="arbusto arbusto-1" />
    <span className="arbusto arbusto-2" />
    <span className="arbusto arbusto-3" />
    <span className="arbusto arbusto-4" />

    <div className="corredor corredor-gato">
      <div className="corredor-cuerpo">
        <Gato />
      </div>
      <span className="corredor-sombra" />
    </div>
    <div className="corredor corredor-perro">
      <div className="corredor-cuerpo">
        <Perro />
      </div>
      <span className="corredor-sombra" />
    </div>
  </div>
);
