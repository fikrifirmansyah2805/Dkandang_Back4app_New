import React from 'react';

/**
 * Official D'Kandang Amazing Farm Logo (Vector Artwork matching user's exact uploaded image)
 * Features:
 * - Upper Sky Blue brush strokes
 * - Lower Mint / Lime Green brush strokes
 * - Stylized 3D Bubble "D'KANDANG" in orange-red gradient with navy contour & white bevel
 * - Stylized Comic "AMAZING FARM" in black gloss with crisp white outline
 */

export function getDKandangOfficialLogoSvgString(width: number = 220, height: number = 95): string {
  return `
    <svg viewBox="0 0 540 230" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="display: block; max-width: 100%; height: auto;">
      <defs>
        <!-- Gradients -->
        <linearGradient id="dkOrangeRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff9500" />
          <stop offset="35%" stop-color="#ff5100" />
          <stop offset="70%" stop-color="#ea2307" />
          <stop offset="100%" stop-color="#cc1100" />
        </linearGradient>

        <linearGradient id="skyBrushGrad" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.8" />
          <stop offset="40%" stop-color="#38bdf8" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.75" />
        </linearGradient>

        <linearGradient id="greenBrushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#4ade80" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0.85" />
        </linearGradient>

        <linearGradient id="blackGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#27272a" />
          <stop offset="48%" stop-color="#09090b" />
          <stop offset="52%" stop-color="#000000" />
          <stop offset="100%" stop-color="#18181b" />
        </linearGradient>

        <!-- Drop Shadow Filter -->
        <filter id="logoShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="3" dy="4" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.25" />
        </filter>
      </defs>

      <!-- ================= BACKGROUND BRUSH STROKES ================= -->
      <g id="brush-background" filter="url(#logoShadow)">
        <!-- Sky Blue Upper Brush Strokes -->
        <path d="M 285 22 C 320 20, 360 28, 380 40 C 370 44, 340 38, 305 34 C 290 32, 280 26, 285 22 Z" fill="#7dd3fc" />
        <path d="M 190 38 C 240 28, 320 30, 420 58 C 445 65, 410 74, 370 70 C 300 62, 220 54, 180 50 C 160 48, 170 42, 190 38 Z" fill="url(#skyBrushGrad)" />
        <path d="M 140 55 C 200 45, 330 42, 450 78 C 475 85, 440 95, 390 90 C 290 80, 180 75, 125 72 C 110 70, 120 62, 140 55 Z" fill="#38bdf8" opacity="0.85" />
        <path d="M 220 50 L 390 48 C 420 48, 440 54, 430 58 L 240 58 Z" fill="#bae6fd" opacity="0.6" />

        <!-- Mint / Green Lower Brush Strokes -->
        <path d="M 90 155 C 130 148, 380 152, 480 162 C 505 165, 470 178, 410 176 C 300 174, 170 176, 100 172 C 80 170, 75 160, 90 155 Z" fill="#2dd4bf" opacity="0.75" />
        <path d="M 115 168 C 170 162, 330 160, 470 174 C 495 178, 460 192, 390 190 C 280 188, 180 192, 120 188 C 95 186, 95 174, 115 168 Z" fill="url(#greenBrushGrad)" />
        <path d="M 145 186 C 190 182, 310 180, 440 194 C 460 198, 435 208, 380 206 C 290 204, 210 206, 150 204 C 130 202, 130 192, 145 186 Z" fill="#4ade80" />
      </g>

      <!-- ================= "D'KANDANG" 3D POP ART LETTERS ================= -->
      <g id="dkandang-group" transform="translate(15, 15)">
        <!-- Outline Layer 1: Massive Navy Outer Stroke -->
        <text x="250" y="128" 
              font-family="'Impact', 'Arial Black', sans-serif" 
              font-size="112" 
              font-weight="900" 
              text-anchor="middle" 
              fill="#0f172a" 
              stroke="#0f172a" 
              stroke-width="26" 
              stroke-linejoin="round"
              letter-spacing="1">
          D'KANDANG
        </text>

        <!-- Outline Layer 2: White Sticker Border -->
        <text x="250" y="128" 
              font-family="'Impact', 'Arial Black', sans-serif" 
              font-size="112" 
              font-weight="900" 
              text-anchor="middle" 
              fill="#ffffff" 
              stroke="#ffffff" 
              stroke-width="14" 
              stroke-linejoin="round"
              letter-spacing="1">
          D'KANDANG
        </text>

        <!-- Outline Layer 3: Dark Inner Stroke -->
        <text x="250" y="128" 
              font-family="'Impact', 'Arial Black', sans-serif" 
              font-size="112" 
              font-weight="900" 
              text-anchor="middle" 
              fill="#0f172a" 
              stroke="#0f172a" 
              stroke-width="6" 
              stroke-linejoin="round"
              letter-spacing="1">
          D'KANDANG
        </text>

        <!-- Face Layer: Orange-Red Gradient -->
        <text x="250" y="128" 
              font-family="'Impact', 'Arial Black', sans-serif" 
              font-size="112" 
              font-weight="900" 
              text-anchor="middle" 
              fill="url(#dkOrangeRed)" 
              letter-spacing="1">
          D'KANDANG
        </text>

        <!-- Letter Highlights / Gloss Streaks -->
        <!-- 'D' highlight -->
        <path d="M 38 64 C 44 48, 62 42, 85 45 C 95 47, 90 53, 78 52 C 58 50, 48 56, 44 68 Z" fill="#ffffff" opacity="0.6" />
        <!-- Apostrophe highlight -->
        <circle cx="108" cy="42" r="3.5" fill="#ffffff" opacity="0.8" />
        <!-- 'K' highlight -->
        <path d="M 125 50 L 125 78 C 125 82, 120 82, 120 78 L 120 50 Z" fill="#ffffff" opacity="0.5" />
        <!-- 'A' highlight -->
        <path d="M 180 50 L 195 50 C 198 50, 192 56, 185 56 Z" fill="#ffffff" opacity="0.55" />
        <!-- 'N' highlight -->
        <path d="M 230 50 L 235 50 L 235 85 L 230 85 Z" fill="#ffffff" opacity="0.4" />
        <!-- 'D' 2 highlight -->
        <path d="M 285 58 C 295 48, 315 48, 330 52 C 322 56, 305 55, 296 64 Z" fill="#ffffff" opacity="0.6" />
        <!-- 'G' highlight -->
        <path d="M 430 55 C 445 46, 465 48, 478 58 C 468 62, 452 55, 438 62 Z" fill="#ffffff" opacity="0.6" />
      </g>

      <!-- ================= "AMAZING FARM" COMIC GLOSS LETTERS ================= -->
      <g id="amazing-farm-group" transform="translate(15, 20)">
        <!-- Layer 1: Navy Heavy Drop Base -->
        <text x="250" y="174" 
              font-family="'Arial Black', 'Impact', sans-serif" 
              font-size="46" 
              font-weight="900" 
              text-anchor="middle" 
              fill="#0f172a" 
              stroke="#0f172a" 
              stroke-width="18" 
              stroke-linejoin="round"
              letter-spacing="4">
          AMAZING FARM
        </text>

        <!-- Layer 2: Pure White Sharp Comic Border -->
        <text x="250" y="174" 
              font-family="'Arial Black', 'Impact', sans-serif" 
              font-size="46" 
              font-weight="900" 
              text-anchor="middle" 
              fill="#ffffff" 
              stroke="#ffffff" 
              stroke-width="10" 
              stroke-linejoin="round"
              letter-spacing="4">
          AMAZING FARM
        </text>

        <!-- Layer 3: Thin Navy Contour -->
        <text x="250" y="174" 
              font-family="'Arial Black', 'Impact', sans-serif" 
              font-size="46" 
              font-weight="900" 
              text-anchor="middle" 
              fill="#0f172a" 
              stroke="#0f172a" 
              stroke-width="3" 
              stroke-linejoin="round"
              letter-spacing="4">
          AMAZING FARM
        </text>

        <!-- Layer 4: Glossy Jet Black Face -->
        <text x="250" y="174" 
              font-family="'Arial Black', 'Impact', sans-serif" 
              font-size="46" 
              font-weight="900" 
              text-anchor="middle" 
              fill="url(#blackGloss)" 
              letter-spacing="4">
          AMAZING FARM
        </text>
      </g>
    </svg>
  `;
}

interface DKandangOfficialLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function DKandangOfficialLogo({
  className = '',
  width = 220,
  height = 95
}: DKandangOfficialLogoProps) {
  return (
    <div 
      className={`inline-flex items-center select-none ${className}`}
      dangerouslySetInnerHTML={{ __html: getDKandangOfficialLogoSvgString(typeof width === 'number' ? width : 220, typeof height === 'number' ? height : 95) }}
    />
  );
}
