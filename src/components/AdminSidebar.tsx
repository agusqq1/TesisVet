import React from "react";
import { useAuth } from "../context/AuthContext";
import { LogoIcon } from "./LogoIcon";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  ShoppingBag,
  Package,
  LogOut,
} from "lucide-react";

export type AdminSection = "dashboard" | "turnos" | "pacientes" | "pedidos" | "tienda";

interface AdminSidebarProps {
  active: AdminSection;
  navigate: (path: string) => void;
}

const SECCIONES: Array<{ key: AdminSection | "historial"; label: string; path: string; icon: React.ReactNode }> = [
  { key: "dashboard", label: "Panel Principal", path: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
  { key: "turnos", label: "Gestión de Turnos", path: "/admin/turnos", icon: <Calendar size={16} /> },
  { key: "pacientes", label: "Pacientes & Clientes", path: "/admin/pacientes", icon: <Users size={16} /> },
  { key: "historial", label: "Historiales Clínicos", path: "/historial", icon: <FileText size={16} /> },
  { key: "pedidos", label: "Pedidos de Tienda", path: "/admin/pedidos", icon: <Package size={16} /> },
  { key: "tienda", label: "Gestión de Tienda", path: "/admin/tienda", icon: <ShoppingBag size={16} /> },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ active, navigate }) => {
  const { user, logout } = useAuth();

  return (
    <div className="admin-sidebar">
      <div
        className="logo cursor-pointer flex items-center gap-3 text-white mb-6"
        onClick={() => navigate("/admin/dashboard")}
      >
        <LogoIcon size={34} />
        <div>
          <div className="font-bold text-base leading-tight">VetAnimal</div>
          <div className="text-[10px] text-brand-200 uppercase font-semibold">Panel Veterinario</div>
        </div>
      </div>

      <nav className="admin-nav">
        {SECCIONES.map((s) => (
          <button
            key={s.key}
            className={`flex items-center gap-2.5 ${active === s.key ? "active" : ""}`}
            onClick={() => navigate(s.path)}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/20">
        <p className="text-xs text-white/70">Sesión iniciada como:</p>
        <p className="font-semibold text-sm">{user?.nombre}</p>
        <p className="text-xs text-brand-200 font-mono mt-0.5">{user?.email}</p>
        <button
          onClick={() => navigate("/")}
          className="btn btn-outline btn-sm text-white border-white/40 hover:bg-white/10 mt-4 w-full"
        >
          ← Ir a la web pública
        </button>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="btn btn-outline btn-sm text-white border-white/40 hover:bg-white/10 mt-2 w-full flex items-center justify-center gap-1.5"
        >
          <LogOut size={13} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};
