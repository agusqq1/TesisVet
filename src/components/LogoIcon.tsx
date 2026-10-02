import React from "react";

interface LogoIconProps {
  className?: string;
  size?: number | string;
}

// Isotipo de VetAnimal: una huella dentro de un cuadrado redondeado con el color de la marca.
export const LogoIcon: React.FC<LogoIconProps> = ({ className = "", size = 40 }) => {
  const numericSize = typeof size === "number" ? size : parseInt(size as string, 10) || 40;

  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      style={{ verticalAlign: "middle" }}
      role="img"
      aria-label="VetAnimal"
    >
      <rect width="48" height="48" rx="13" fill="var(--color-brand-600)" />
      {/* Almohadilla principal */}
      <path
        d="M24 23.5c-4.6 0-9 4.1-9 8.2 0 2.7 2 4.3 4.4 4.3 1.8 0 2.9-.9 4.6-.9s2.8.9 4.6.9c2.4 0 4.4-1.6 4.4-4.3 0-4.1-4.4-8.2-9-8.2Z"
        fill="#ffffff"
      />
      {/* Dedos */}
      <ellipse cx="14.2" cy="21.6" rx="2.9" ry="3.7" transform="rotate(-18 14.2 21.6)" fill="#ffffff" />
      <ellipse cx="20.1" cy="15.4" rx="3" ry="3.9" transform="rotate(-6 20.1 15.4)" fill="#ffffff" />
      <ellipse cx="27.9" cy="15.4" rx="3" ry="3.9" transform="rotate(6 27.9 15.4)" fill="#ffffff" />
      <ellipse cx="33.8" cy="21.6" rx="2.9" ry="3.7" transform="rotate(18 33.8 21.6)" fill="#ffffff" />
    </svg>
  );
};
