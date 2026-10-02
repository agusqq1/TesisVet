import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ChatWidget } from "./components/ChatWidget";
import { AvisoOperativos, RUTA_MAPA } from "./components/AvisoOperativos";

import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { BookingWizard } from "./pages/BookingWizard";
import { HistorialClinico } from "./pages/HistorialClinico";
import { MascotaNueva } from "./pages/MascotaNueva";
import { Tienda } from "./pages/Tienda";
import { Carrito } from "./pages/Carrito";
import { Perfil } from "./pages/Perfil";
import { VeterinariasMoviles } from "./pages/VeterinariasMoviles";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminTurnos } from "./pages/AdminTurnos";
import { AdminPacientes } from "./pages/AdminPacientes";
import { AdminDoctores } from "./pages/AdminDoctores";
import { AdminOperativos } from "./pages/AdminOperativos";
import { AdminPedidos } from "./pages/AdminPedidos";
import { AdminTienda } from "./pages/AdminTienda";

// Páginas que necesitan una sesión iniciada
const RUTAS_PRIVADAS = ["/booking", "/historial", "/mascota-nueva", "/perfil"];

function AppContent() {
  const { user, ready } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || "/");

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    // Extraer solo la ruta base sin query params para el ruteo
    const basePath = path.split("?")[0];
    setCurrentPath(basePath);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const isAuthPage =
    currentPath === "/login" ||
    currentPath === "/register" ||
    currentPath === "/forgot-password" ||
    currentPath === "/reset-password";

  const isAdminPage = currentPath.startsWith("/admin");

  // El servidor valida los permisos en cada pedido; esto solo evita mostrar
  // pantallas que el usuario no va a poder usar.
  const faltaSesion = !user && (isAdminPage || RUTAS_PRIVADAS.includes(currentPath));
  const faltaPermiso = Boolean(user) && isAdminPage && user?.rol !== "veterinario";

  useEffect(() => {
    if (!ready) return;
    if (faltaSesion) navigate("/login");
    else if (faltaPermiso) navigate("/");
  }, [ready, faltaSesion, faltaPermiso]);

  if (!ready || faltaSesion || faltaPermiso) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {!isAuthPage && !isAdminPage && (
        <Header currentPath={currentPath} navigate={navigate} />
      )}

      <main className="flex-1">
        {currentPath === "/" && <Home navigate={navigate} />}
        {currentPath === "/login" && <Login navigate={navigate} />}
        {currentPath === "/register" && <Register navigate={navigate} />}
        {currentPath === "/forgot-password" && (
          <ForgotPassword navigate={navigate} />
        )}
        {currentPath === "/reset-password" && (
          <ResetPassword navigate={navigate} />
        )}
        {currentPath === "/booking" && <BookingWizard navigate={navigate} />}
        {currentPath === "/historial" && <HistorialClinico navigate={navigate} />}
        {currentPath === "/mascota-nueva" && <MascotaNueva navigate={navigate} />}
        {currentPath === "/tienda" && <Tienda navigate={navigate} />}
        {currentPath === "/carrito" && <Carrito navigate={navigate} />}
        {currentPath === "/perfil" && <Perfil navigate={navigate} />}
        {currentPath === RUTA_MAPA && <VeterinariasMoviles navigate={navigate} />}

        {(currentPath === "/admin" || currentPath === "/admin/dashboard") && (
          <AdminDashboard navigate={navigate} />
        )}
        {currentPath === "/admin/turnos" && <AdminTurnos navigate={navigate} />}
        {currentPath === "/admin/pacientes" && (
          <AdminPacientes navigate={navigate} />
        )}
        {currentPath === "/admin/doctores" && <AdminDoctores navigate={navigate} />}
        {currentPath === "/admin/operativos" && <AdminOperativos navigate={navigate} />}
        {currentPath === "/admin/pedidos" && <AdminPedidos navigate={navigate} />}
        {currentPath === "/admin/tienda" && (
          <AdminTienda navigate={navigate} />
        )}
      </main>

      {!isAuthPage && !isAdminPage && <Footer navigate={navigate} />}

      {!isAuthPage && !isAdminPage && <AvisoOperativos currentPath={currentPath} navigate={navigate} />}

      {!isAuthPage && <ChatWidget navigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
