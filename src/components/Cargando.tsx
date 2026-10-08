import React from "react";

interface CargandoProps {
  // Texto debajo de las huellas, por ejemplo "Buscando horarios..."
  texto?: string;
  // "pagina" ocupa la pantalla; "bloque" va dentro de una tarjeta o lista; "linea" es chico y en línea
  tamano?: "pagina" | "bloque" | "linea";
  className?: string;
}

// Indicador de carga de la marca: cuatro huellitas que van apareciendo como si el
// animal caminara. Es CSS puro (ver .huellas en index.css), así que no suma peso a la app
// y respeta la preferencia de "reducir movimiento" del sistema.
export const Cargando: React.FC<CargandoProps> = ({ texto, tamano = "bloque", className = "" }) => {
  const alto = tamano === "pagina" ? "min-h-screen" : tamano === "bloque" ? "py-10" : "py-1";
  const escala = tamano === "linea" ? "huellas-sm" : "";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 text-slate-500 ${alto} ${className}`}
    >
      <div className={`huellas ${escala}`} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <svg key={i} className="huella" viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="15.5" rx="5.2" ry="4.6" />
            <ellipse cx="5.2" cy="9.4" rx="2.3" ry="3" transform="rotate(-20 5.2 9.4)" />
            <ellipse cx="9.6" cy="5.4" rx="2.3" ry="3" transform="rotate(-8 9.6 5.4)" />
            <ellipse cx="14.4" cy="5.4" rx="2.3" ry="3" transform="rotate(8 14.4 5.4)" />
            <ellipse cx="18.8" cy="9.4" rx="2.3" ry="3" transform="rotate(20 18.8 9.4)" />
          </svg>
        ))}
      </div>
      {texto && <p className={tamano === "linea" ? "text-xs" : "text-sm"}>{texto}</p>}
    </div>
  );
};
