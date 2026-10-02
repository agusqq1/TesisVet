import React from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { LogoIcon } from "./LogoIcon";
import { ShoppingCart, LogOut, LayoutDashboard } from "lucide-react";

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

const SECCIONES = [
  { path: "/", label: "Inicio" },
  { path: "/booking", label: "Turnos" },
  { path: "/historial", label: "Historia clínica" },
  { path: "/tienda", label: "Tienda" },
];

export const Header: React.FC<HeaderProps> = ({ currentPath, navigate }) => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="site-header">
      <div className="logo cursor-pointer" onClick={() => navigate("/")}>
        <LogoIcon size={34} />
        <span>VetAnimal</span>
      </div>

      <nav className="main-nav">
        {SECCIONES.map((s) => (
          <button
            key={s.path}
            className={currentPath === s.path ? "active" : ""}
            onClick={() => navigate(s.path)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <button
          onClick={() => navigate("/carrito")}
          className="relative w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Carrito de compras"
          aria-label="Carrito de compras"
        >
          <ShoppingCart size={19} />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>

        {user ? (
          <>
            {user.rol === "veterinario" && (
              <button onClick={() => navigate("/admin/dashboard")} className="btn btn-outline btn-sm">
                <LayoutDashboard size={15} />
                <span>Panel</span>
              </button>
            )}
            <button
              onClick={() => navigate("/perfil")}
              className="btn btn-light btn-sm"
              title={`Perfil de ${user.nombre}`}
            >
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-semibold">
                {user.nombre.substring(0, 1).toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate">{user.nombre}</span>
            </button>
            <button
              onClick={logout}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate("/login")} className="btn btn-light btn-sm">
              Ingresar
            </button>
            <button onClick={() => navigate("/booking")} className="btn btn-primary btn-sm">
              Reservar turno
            </button>
          </>
        )}
      </div>
    </header>
  );
};
