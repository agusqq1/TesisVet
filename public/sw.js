// Service worker de VetAnimal: recibe las notificaciones push (avisos de operativos de
// veterinarias móviles) y las muestra aunque la página esté cerrada.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = { titulo: "VetAnimal", cuerpo: "Hay novedades en tus veterinarias móviles.", url: "/veterinarias-moviles" };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    // Si el mensaje no es JSON, se muestra el texto plano
    if (event.data) datos.cuerpo = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: datos.etiqueta || "vetanimal",
      renotify: true,
      data: { url: datos.url || "/" },
    })
  );
});

// Al tocar la notificación se abre (o se enfoca) la página indicada
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url === destino && "focus" in v) return v.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
