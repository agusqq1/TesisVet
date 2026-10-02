import React from "react";

interface LogoIconProps {
  className?: string;
  size?: number | string;
  variant?: "full" | "icon-only" | "badge";
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  className = "",
  size = 40,
  variant = "full",
}) => {
  const numericSize = typeof size === "number" ? size : parseInt(size as string, 10) || 40;

  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      style={{ verticalAlign: "middle" }}
    >
      {/* Outer Blue Circle */}
      <circle cx="250" cy="250" r="230" fill="#2563eb" />
      
      {/* Inner White Ring */}
      <circle
        cx="250"
        cy="260"
        r="170"
        stroke="#ffffff"
        strokeWidth="14"
        fill="none"
      />

      {/* Top Syringe and Paw Badge Crest */}
      <g transform="translate(250, 65)">
        {/* Crest Circle */}
        <circle cx="0" cy="18" r="28" fill="#2563eb" stroke="#ffffff" strokeWidth="6" />
        
        {/* Paw inside top crest */}
        <ellipse cx="-6" cy="18" rx="4.5" ry="5.5" fill="#ffffff" />
        <circle cx="-13" cy="11" r="2.5" fill="#ffffff" />
        <circle cx="-7" cy="7" r="2.5" fill="#ffffff" />
        <circle cx="0" cy="8" r="2.5" fill="#ffffff" />
        
        {/* Syringe angled next to paw */}
        <g transform="translate(6, 12) rotate(45)">
          <rect x="-3" y="-12" width="6" height="18" rx="2" fill="#ffffff" />
          <line x1="0" y1="-12" x2="0" y2="-18" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <line x1="-5" y1="-8" x2="5" y2="-8" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="-5" y1="6" x2="5" y2="6" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="0" y1="6" x2="0" y2="12" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>

      {/* Central Medical Cross (+) in pure white */}
      <g transform="translate(250, 185)">
        <rect x="-14" y="-38" width="28" height="76" rx="6" fill="#ffffff" />
        <rect x="-38" y="-14" width="76" height="28" rx="6" fill="#ffffff" />
      </g>

      {/* Intertwined Dog and Cat Silhouettes in White */}
      <g transform="translate(0, 30)">
        {/* Dog Silhouette (Left) */}
        <path
          d="M 160 380 
             C 150 330 155 270 185 245 
             C 195 235 210 235 220 250
             C 235 250 250 258 255 275
             C 245 285 240 295 230 300
             C 215 305 205 315 200 335
             C 195 355 190 380 160 380 Z"
          fill="#ffffff"
        />
        {/* Dog floppy ear */}
        <path
          d="M 180 250
             C 165 260 165 295 178 305
             C 188 300 192 280 188 260 Z"
          fill="#2563eb"
        />

        {/* Cat Silhouette (Right) */}
        <path
          d="M 340 380
             C 345 330 335 280 305 255
             C 300 240 305 230 315 225
             C 320 240 325 245 335 245
             C 340 230 345 225 355 220
             C 358 238 355 255 350 270
             C 365 290 370 330 340 380 Z"
          fill="#ffffff"
        />
        {/* Smooth central connection curve */}
        <path
          d="M 160 380
             C 200 420 300 420 340 380
             C 310 395 280 390 250 365
             C 220 390 190 395 160 380 Z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
};
