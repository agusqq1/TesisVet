import React from "react";
import { LogoIcon } from "./LogoIcon";
import { Phone, Mail } from "lucide-react";

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5 mb-3 cursor-pointer" onClick={() => navigate("/")}>
            <LogoIcon size={34} />
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              VetAnimal
            </span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Atención médica veterinaria de excelencia, equipamiento diagnóstico de alta tecnología y farmacia oficial para la salud de tus mascotas.
          </p>
        </div>
        <div className="footer-cols">
          <div>
            <strong className="text-blue-900 font-bold">Navegación</strong>
            <span className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate("/")}>Inicio</span>
            <span className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate("/booking")}>Reservar Turno</span>
            <span className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate("/historial")}>Historial Clínico</span>
            <span className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate("/tienda")}>Tienda &amp; Farmacia</span>
          </div>
          <div>
            <strong className="text-blue-900 font-bold">Contacto</strong>
            <span className="flex items-center gap-2 text-slate-600">
              <Phone size={14} className="text-blue-600 shrink-0" />
              <span>(011) 4000-1000</span>
            </span>
            <a 
              href="mailto:veterinariavet101@gmail.com" 
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <Mail size={14} className="text-blue-600 shrink-0" />
              <span>veterinariavet101@gmail.com</span>
            </a>
          </div>
          <div>
            <strong className="text-blue-900 font-bold">Horarios de Atención</strong>
            <span>Lun a Vie: 8:00 - 20:00 hs</span>
            <span>Sábados: 9:00 - 15:00 hs</span>
            <span className="text-blue-600 font-semibold">Guardia Médica Activa</span>
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-200">
        © {new Date().getFullYear()} VetAnimal. Todos los derechos reservados.
      </div>
    </footer>
  );
};

