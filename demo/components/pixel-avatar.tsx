"use client";

import { useMemo } from "react";

const PALETTES: string[][] = [
  ["#D35CFF", "#B49BDA", "#653CA2"],
  ["#FF7AC6", "#D35CFF", "#7A4BC0"],
  ["#8B6FE8", "#B49BDA", "#4b2f7a"],
  ["#63C2FF", "#5A8BF0", "#3a3f8a"],
  ["#4FE0B0", "#2Fb894", "#2a6a5a"],
  ["#FFB86B", "#F7931A", "#9a5a1a"],
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FACE_MASK = [
  "00111100",
  "01111110",
  "11011011",
  "11011011",
  "11111111",
  "11100111",
  "01111110",
  "00111100",
];

interface PixelAvatarProps {
  seed: string;
  size?: number;
  face?: boolean;
}

export function PixelAvatar({ seed, size = 96, face = false }: PixelAvatarProps) {
  const { cells, palette, bg } = useMemo(() => {
    const h = hash(seed);
    const palette = PALETTES[h % PALETTES.length];
    const bg = ["#2a1840", "#241236", "#301a4a"][(h >> 3) % 3];
    const grid = 8;
    const cells: { x: number; y: number; c: string }[] = [];

    if (face) {
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          if (FACE_MASK[y][x] === "1") {
            const isFeature = (y === 2 || y === 3) && (x === 2 || x === 5);
            const isMouth = y === 5 && x >= 2 && x <= 5;
            const c = isFeature || isMouth ? palette[2] : palette[0];
            cells.push({ x, y, c });
          }
        }
      }
    } else {
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid / 2; x++) {
          const bit = (h >> ((x + y * 4) % 30)) & 1;
          if (bit) {
            const c = palette[(x + y) % palette.length];
            cells.push({ x, y, c });
            cells.push({ x: grid - 1 - x, y, c });
          }
        }
      }
    }
    return { cells, palette, bg };
  }, [seed, face]);

  const grid = 8;
  const unit = 100 / grid;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${seed} avatar`}
      className="avatar-pixel"
    >
      <rect width="100" height="100" fill={bg} />
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x * unit}
          y={c.y * unit}
          width={unit + 0.5}
          height={unit + 0.5}
          fill={c.c}
        />
      ))}
      <rect
        width="100"
        height="100"
        fill="none"
        stroke={palette[0]}
        strokeOpacity="0.18"
        strokeWidth="2"
      />
    </svg>
  );
}
