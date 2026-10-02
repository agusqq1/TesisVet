import React from "react";
import { LogoIcon } from "./LogoIcon";
import { CLINICA } from "../clinica";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="max-w-xs">
          <div className="logo cursor-pointer mb-3" onClick={() => navigate("/")}>
            <LogoIcon size={32} />
            <span>{CLINICA.nombre}</span>
          </div>
          <p>
            Clínica veterinaria con turnos online, historia clínica digital y tienda para el cuidado de tu mascota.
          </p>
        </div>

        <div className="footer-cols">
          <div>
            <strong>Navegación</strong>
            <span className="cursor-pointer hover:text-brand-700 transition-colors" onClick={() => navigate("/booking")}>Reservar turno</span>
            <span className="cursor-pointer hover:text-brand-700 transition-colors" onClick={() => navigate("/historial")}>Historia clínica</span>
            <span className="cursor-pointer hover:text-brand-700 transition-colors" onClick={() => navigate("/tienda")}>Tienda</span>
            <span className="cursor-pointer hover:text-brand-700 transition-colors" onClick={() => navigate("/perfil")}>Mi perfil</span>
          </div>

          <div>
            <strong>Contacto</strong>
            <span className="flex items-center gap-2">
              <Phone size={14} className="text-brand-600 shrink-0" />
              {CLINICA.telefono}
            </span>
            <a href={`mailto:${CLINICA.email}`} className="flex items-center gap-2 hover:text-brand-700 transition-colors">
              <Mail size={14} className="text-brand-600 shrink-0" />
              {CLINICA.email}
            </a>
          </div>

          <div>
            <strong>Dónde estamos</strong>
            <span className="flex items-start gap-2">
              <MapPin size={14} className="text-brand-600 shrink-0 mt-1" />
              <span className="mb-0">
                {CLINICA.direccion}
                <br />
                {CLINICA.localidad}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Clock size={14} className="text-brand-600 shrink-0" />
              {CLINICA.horarios}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1136px] mx-auto text-xs text-slate-400 mt-10 pt-5 border-t border-slate-200">
        © {new Date().getFullYear()} {CLINICA.nombre}. Todos los derechos reservados.
      </div>
    </footer>
  );
};
