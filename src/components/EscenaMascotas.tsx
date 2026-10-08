import React from "react";

// Escena de la portada: un gato corre por el jardín de la clínica y un perro lo
// persigue. El circuito usa perspectiva real de CSS: de ida pasan cerca (translateZ 0)
// y en los extremos giran sobre su eje (rotateY) y se alejan al fondo (translateZ
// negativo), con lo que se achican y suben hacia el horizonte solos. Los cuerpos tienen
// volumen con degradados, sombra en el piso, polvo en las patas, nubes y sol de fondo.
// Todo SVG + CSS (ver .escena en index.css): sin librerías. Quietos si el sistema pide
// "reducir movimiento".

const Perro = () => (
  <svg viewBox="0 0 120 84" className="corredor-svg" aria-hidden="true">
    <defs>
      <radialGradient id="perro-cuerpo" cx="45%" cy="35%" r="70%">
        <stop offset="0" stopColor="#fbbf24" />
        <stop offset=".65" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#b45309" />
      </radialGradient>
      <radialGradient id="perro-cabeza" cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#fcd34d" />
        <stop offset=".7" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#b45309" />
      </radialGradient>
      <linearGradient id="perro-pata" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d97706" />
        <stop offset="1" stopColor="#92400e" />
      </linearGradient>
    </defs>
    {/* cola */}
    <path className="cola" d="M14 36 C4 28, 6 14, 18 16" stroke="#b45309" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* patas de atrás (lado lejano, más oscuras) */}
    <g className="pata pata-a"><rect x="22" y="46" width="9" height="26" rx="4.5" fill="#92400e" /><ellipse cx="26.5" cy="72" rx="6" ry="3.5" fill="#78350f" /></g>
    <g className="pata pata-b"><rect x="70" y="46" width="9" height="26" rx="4.5" fill="#92400e" /><ellipse cx="74.5" cy="72" rx="6" ry="3.5" fill="#78350f" /></g>
    {/* cuerpo */}
    <ellipse cx="54" cy="44" rx="36" ry="18" fill="url(#perro-cuerpo)" />
    <ellipse cx="60" cy="51" rx="22" ry="9" fill="#fde68a" opacity=".75" />
    {/* patas de adelante (lado cercano) */}
    <g className="pata pata-c"><rect x="32" y="46" width="9" height="26" rx="4.5" fill="url(#perro-pata)" /><ellipse cx="36.5" cy="72" rx="6" ry="3.5" fill="#92400e" /></g>
    <g className="pata pata-d"><rect x="80" y="46" width="9" height="26" rx="4.5" fill="url(#perro-pata)" /><ellipse cx="84.5" cy="72" rx="6" ry="3.5" fill="#92400e" /></g>
    {/* cabeza */}
    <circle cx="94" cy="33" r="17" fill="url(#perro-cabeza)" />
    <ellipse cx="104" cy="39" rx="9" ry="6.5" fill="#fde68a" />
    <circle cx="110.5" cy="39" r="3.4" fill="#1f2937" />
    <circle cx="111.5" cy="38" r="1" fill="#fff" />
    <circle cx="98" cy="30" r="2.8" fill="#1f2937" />
    <circle cx="99" cy="29" r=".9" fill="#fff" />
    {/* oreja caída */}
    <path className="oreja" d="M84 20 C75 25, 75 42, 86 44 C90 36, 90 27, 84 20 Z" fill="#b45309" />
    {/* lengua */}
    <path d="M104 45 c0 5, 5 6, 6 1" stroke="#fb7185" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* collar con chapa */}
    <path d="M80 43 q14 8 28 0" stroke="#2563eb" strokeWidth="4" fill="none" />
    <circle cx="94" cy="49.5" r="3.2" fill="#3b82f6" stroke="#1d4ed8" strokeWidth=".8" />
  </svg>
);

const Gato = () => (
  <svg viewBox="0 0 110 84" className="corredor-svg" aria-hidden="true">
    <defs>
      <radialGradient id="gato-cuerpo" cx="45%" cy="35%" r="70%">
        <stop offset="0" stopColor="#94a3b8" />
        <stop offset=".65" stopColor="#64748b" />
        <stop offset="1" stopColor="#334155" />
      </radialGradient>
      <linearGradient id="gato-pata" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#64748b" />
        <stop offset="1" stopColor="#334155" />
      </linearGradient>
    </defs>
    {/* cola larga */}
    <path className="cola" d="M12 40 C-2 36, 0 16, 16 18" stroke="#475569" strokeWidth="5" strokeLinecap="round" fill="none" />
    <g className="pata pata-a"><rect x="24" y="48" width="7" height="24" rx="3.5" fill="#334155" /><ellipse cx="27.5" cy="72" rx="4.5" ry="2.8" fill="#1e293b" /></g>
    <g className="pata pata-b"><rect x="64" y="48" width="7" height="24" rx="3.5" fill="#334155" /><ellipse cx="67.5" cy="72" rx="4.5" ry="2.8" fill="#1e293b" /></g>
    <ellipse cx="50" cy="46" rx="32" ry="14" fill="url(#gato-cuerpo)" />
    <ellipse cx="54" cy="51" rx="18" ry="6" fill="#e2e8f0" opacity=".6" />
    <g className="pata pata-c"><rect x="32" y="48" width="7" height="24" rx="3.5" fill="url(#gato-pata)" /><ellipse cx="35.5" cy="72" rx="4.5" ry="2.8" fill="#334155" /></g>
    <g className="pata pata-d"><rect x="72" y="48" width="7" height="24" rx="3.5" fill="url(#gato-pata)" /><ellipse cx="75.5" cy="72" rx="4.5" ry="2.8" fill="#334155" /></g>
    {/* cabeza */}
    <circle cx="86" cy="36" r="14" fill="url(#gato-cuerpo)" />
    {/* orejas en punta */}
    <path className="oreja" d="M76 28 L74 11 L86 22 Z" fill="#64748b" />
    <path d="M90 22 L100 11 L98 28 Z" fill="#64748b" />
    <path d="M78 26 L77 17 L84 23 Z" fill="#fda4af" />
    <path d="M91 22 L97 15 L96 25 Z" fill="#fda4af" />
    {/* cara */}
    <ellipse cx="90" cy="34" rx="2.4" ry="3" fill="#0f172a" />
    <circle cx="90.6" cy="33" r=".8" fill="#fff" />
    <circle cx="98" cy="40" r="2" fill="#fb7185" />
    <path d="M86 42 q4 3 8 0 M88 41 l-8 1 M88 43 l-8 3 M100 41 l8 1 M100 43 l8 3" stroke="#0f172a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    {/* collar con chapa */}
    <path d="M74 44 q12 6 24 0" stroke="#2563eb" strokeWidth="3.5" fill="none" />
    <circle cx="86" cy="49" r="2.8" fill="#3b82f6" stroke="#1d4ed8" strokeWidth=".8" />
  </svg>
);

const Corredor: React.FC<{ clase: string; children: React.ReactNode }> = ({ clase, children }) => (
  <div className={`corredor ${clase}`}>
    <div className="corredor-cuerpo">{children}</div>
    <span className="corredor-sombra" />
    <span className="polvo polvo-1" />
    <span className="polvo polvo-2" />
    <span className="polvo polvo-3" />
  </div>
);

export const EscenaMascotas: React.FC = () => (
  <div className="escena" aria-label="Un gato corre y un perro lo persigue por el jardín de la clínica" role="img">
    <div className="escena-cielo" />
    <span className="sol" />
    <span className="nube nube-1" />
    <span className="nube nube-2" />
    <span className="nube nube-3" />
    <div className="escena-piso" />
    <div className="escena-sendero" />
    {/* cerco y arbustos en el horizonte, a distintas profundidades */}
    <span className="cerco" />
    <span className="arbusto arbusto-1" />
    <span className="arbusto arbusto-2" />
    <span className="arbusto arbusto-3" />
    <span className="arbusto arbusto-4" />

    <Corredor clase="corredor-gato">
      <Gato />
    </Corredor>
    <Corredor clase="corredor-perro">
      <Perro />
    </Corredor>
  </div>
);
