import { useEffect } from "react";

// Hace aparecer con una animación los elementos marcados con `data-reveal` a medida
// que entran en pantalla (estilos en index.css). Si el navegador no tiene
// IntersectionObserver, los muestra de una.
export function useReveal(dependencias: unknown[] = []) {
  useEffect(() => {
    const elementos = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.visible)"));
    if (elementos.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      elementos.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);
}
