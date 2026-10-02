import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PuntoMapa {
  id: number;
  lat: number;
  lng: number;
  titulo: string;
  // Líneas que se muestran debajo del título en el globo del marcador
  detalle?: string[];
}

interface MapaProps {
  puntos: PuntoMapa[];
  centro: [number, number];
  zoom?: number;
  // Encuadra el mapa para que entren todos los puntos
  ajustarAPuntos?: boolean;
  seleccionado?: number | null;
  onSeleccionar?: (id: number) => void;
  onClickMapa?: (lat: number, lng: number) => void;
  miUbicacion?: [number, number] | null;
  className?: string;
}

// Marcador con el color de la marca; se dibuja en SVG para no depender de imágenes
const pin = (activo: boolean) =>
  L.divIcon({
    className: "",
    html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 1C8.2 1 1 8.2 1 17c0 11.5 16 26 16 26s16-14.5 16-26C33 8.2 25.8 1 17 1z"
        style="fill:var(${activo ? "--color-brand-900" : "--color-brand-600"})" stroke="#fff" stroke-width="2"/>
      <circle cx="17" cy="17" r="6" fill="#fff"/>
    </svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });

// Mapa de OpenStreetMap (Leaflet). `puntos` tiene que mantener la misma referencia
// mientras no cambie (useMemo): cada cambio vuelve a dibujar los marcadores.
export const Mapa: React.FC<MapaProps> = ({
  puntos,
  centro,
  zoom = 13,
  ajustarAPuntos = false,
  seleccionado = null,
  onSeleccionar,
  onClickMapa,
  miUbicacion = null,
  className = "",
}) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaPuntos = useRef<L.LayerGroup | null>(null);
  const capaUbicacion = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<number, L.Marker>());

  // Siempre apuntan a las funciones del último render
  const alSeleccionar = useRef(onSeleccionar);
  alSeleccionar.current = onSeleccionar;
  const alClickMapa = useRef(onClickMapa);
  alClickMapa.current = onClickMapa;

  useEffect(() => {
    const m = L.map(contenedor.current!).setView(centro, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", (e) => alClickMapa.current?.(e.latlng.lat, e.latlng.lng));
    capaPuntos.current = L.layerGroup().addTo(m);
    capaUbicacion.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    mapa.current?.setView(centro, zoom);
  }, [centro[0], centro[1], zoom]);

  useEffect(() => {
    const capa = capaPuntos.current;
    if (!capa || !mapa.current) return;
    capa.clearLayers();
    marcadores.current.clear();

    for (const p of puntos) {
      // El contenido se arma con textContent: nada de lo que cargó una persona se interpreta como HTML
      const globo = document.createElement("div");
      const titulo = document.createElement("strong");
      titulo.textContent = p.titulo;
      globo.append(titulo);
      for (const linea of p.detalle ?? []) {
        const renglon = document.createElement("div");
        renglon.textContent = linea;
        globo.append(renglon);
      }

      const marcador = L.marker([p.lat, p.lng], { icon: pin(false) })
        .bindPopup(globo)
        .on("click", () => alSeleccionar.current?.(p.id));
      marcador.addTo(capa);
      marcadores.current.set(p.id, marcador);
    }

    if (ajustarAPuntos && puntos.length > 0) {
      mapa.current.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng])), {
        padding: [48, 48],
        maxZoom: 14,
      });
    }
  }, [puntos]);

  useEffect(() => {
    for (const [id, marcador] of marcadores.current) marcador.setIcon(pin(id === seleccionado));
    const elegido = seleccionado !== null ? marcadores.current.get(seleccionado) : undefined;
    if (elegido && mapa.current) {
      mapa.current.setView(elegido.getLatLng(), Math.max(mapa.current.getZoom(), 14));
      elegido.openPopup();
    }
  }, [seleccionado, puntos]);

  useEffect(() => {
    const capa = capaUbicacion.current;
    if (!capa) return;
    capa.clearLayers();
    if (miUbicacion) {
      L.circleMarker(miUbicacion, { radius: 8, color: "#fff", weight: 3, fillColor: "#dc2626", fillOpacity: 1 })
        .bindTooltip("Tu ubicación")
        .addTo(capa);
    }
  }, [miUbicacion?.[0], miUbicacion?.[1]]);

  // `relative z-0` encierra las capas del mapa: sin eso tapan el encabezado y los modales
  return <div ref={contenedor} className={`relative z-0 ${className}`} />;
};
