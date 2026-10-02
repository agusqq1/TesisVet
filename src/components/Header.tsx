import React from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { LogoIcon } from "./LogoIcon";
import { ShoppingCart, LogOut } from "lucide-react";

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, navigate }) => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <>
      <header className="site-header">
        {/* Zone 1: Brand with Vector Logo */}
        <div 
          className="logo cursor-pointer flex items-center gap-3 hover:opacity-90 transition-opacity" 
          onClick={() => navigate("/")}
        >
          <LogoIcon size={38} />
          <div className="flex flex-col">
            <span className="font-extrabold text-xl leading-tight tracking-tight bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              VetAnimal
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="main-nav">
          <button
            className={currentPath === "/" ? "active" : ""}
            onClick={() => navigate("/")}
          >
            Inicio
          </button>
          <button
            className={currentPath === "/booking" ? "active" : ""}
            onClick={() => navigate("/booking")}
          >
            Turnos
          </button>
          <button
            className={currentPath === "/historial" ? "active" : ""}
            onClick={() => navigate("/historial")}
          >
            Diagnósticos
          </button>
          <button
            className={currentPath === "/tienda" ? "active" : ""}
            onClick={() => navigate("/tienda")}
          >
            Tienda &amp; Farmacia
          </button>
          {itemCount > 0 && (
            <button
              className={`flex items-center gap-1.5 ${currentPath === "/carrito" ? "active" : ""}`}
              onClick={() => navigate("/carrito")}
            >
              <ShoppingCart size={16} />
              <span>Carrito</span>
              <span className="bg-blue-600 text-white rounded-full text-xs px-2 py-0.5 font-bold shadow-sm">
                {itemCount}
              </span>
            </button>
          )}
        </nav>

        {/* Zone 3: Actions */}
        <div className="header-actions">
          {user ? (
            <>
              {user.rol === "veterinario" && (
                <button
                  onClick={() => navigate("/admin/dashboard")}
                  className="btn btn-outline btn-sm text-xs font-bold"
                >
                  Panel Veterinario
                </button>
              )}
              <button
                onClick={() => navigate("/perfil")}
                className="btn btn-light btn-sm flex items-center gap-2"
                title={`Perfil de ${user.nombre}`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  {user.nombre.substring(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-semibold max-w-[100px] truncate">{user.nombre.split(" ")[0]}</span>
              </button>
              <button onClick={logout} className="btn btn-light btn-sm text-xs text-slate-600 hover:text-red-600" title="Cerrar sesión">
                <LogOut size={14} />
                <span>Salir</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="btn btn-outline btn-sm text-xs font-semibold"
              >
                Acceso Admin / Cliente
              </button>
              <button
                onClick={() => navigate("/booking")}
                className="btn btn-primary btn-sm text-xs font-bold"
              >
                Pedir Turno
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
