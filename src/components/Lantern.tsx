"use client";

import { useId } from "react";
import type { LanternDesign, LanternPattern } from "@/lib/lanternDesigns";

type ShapeSpec = {
  path: string;
  textY: number;
  ribTop: number;
  ribBottom: number;
  ribSpread: number;
  rimRx: number;
  ribs: boolean;
};

const SHAPES: Record<LanternDesign["shape"], ShapeSpec> = {
  round: {
    path: "M60,30 C88,32 104,54 104,88 C104,122 88,144 60,146 C32,144 16,122 16,88 C16,54 32,32 60,30 Z",
    textY: 92,
    ribTop: 31,
    ribBottom: 145,
    ribSpread: 46,
    rimRx: 26,
    ribs: true,
  },
  hex: {
    path: "M60,30 L98,52 L98,124 L60,146 L22,124 L22,52 Z",
    textY: 92,
    ribTop: 31,
    ribBottom: 145,
    ribSpread: 38,
    rimRx: 24,
    ribs: true,
  },
  barrel: {
    path: "M60,30 C82,30 98,36 98,44 L98,132 C98,140 82,146 60,146 C38,146 22,140 22,132 L22,44 C22,36 38,30 60,30 Z",
    textY: 92,
    ribTop: 31,
    ribBottom: 145,
    ribSpread: 40,
    rimRx: 25,
    ribs: true,
  },
  diamond: {
    path: "M60,26 L100,88 L60,150 L20,88 Z",
    textY: 92,
    ribTop: 27,
    ribBottom: 149,
    ribSpread: 34,
    rimRx: 16,
    ribs: false,
  },
  ufo: {
    path: "M60,34 C76,34 88,46 90,60 C104,64 112,72 112,80 C112,94 88,104 60,104 C32,104 8,94 8,80 C8,72 16,64 30,60 C32,46 44,34 60,34 Z",
    textY: 86,
    ribTop: 35,
    ribBottom: 103,
    ribSpread: 30,
    rimRx: 30,
    ribs: false,
  },
};

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/** ภาษาไทยไม่มีช่องว่างระหว่างคำ — ใช้ตัวตัดคำของ ICU เพื่อไม่ให้ขึ้นบรรทัดกลางคำ */
function segmentWords(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return text.split(/(\s+)/);
}

function wrapText(text: string, maxPerLine = 11, maxLines = 3): string[] {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return [];

  const lines: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) lines.push(current.trim());
    current = "";
  };

  for (const word of segmentWords(clean)) {
    if (lines.length >= maxLines) break;

    if (splitGraphemes((current + word).trim()).length <= maxPerLine) {
      current += word;
      continue;
    }

    flush();

    if (splitGraphemes(word).length > maxPerLine) {
      // คำเดียวยาวเกินบรรทัด ตัดตามตัวอักษร (ไม่แยกสระ/วรรณยุกต์ออกจากพยัญชนะ)
      let chunk: string[] = [];
      for (const g of splitGraphemes(word)) {
        chunk.push(g);
        if (chunk.length === maxPerLine) {
          if (lines.length >= maxLines) break;
          lines.push(chunk.join(""));
          chunk = [];
        }
      }
      current = chunk.join("");
    } else {
      current = word.trimStart();
    }
  }
  flush();

  return lines.slice(0, maxLines);
}

function longestLine(lines: string[]): number {
  return Math.max(0, ...lines.map((l) => splitGraphemes(l).length));
}

function fontSizeFor(lines: string[]): number {
  const longest = longestLine(lines);
  if (longest <= 6) return 17;
  if (longest <= 9) return 14.5;
  return 12.5;
}

function Pattern({ pattern, color }: { pattern: LanternPattern; color: string }) {
  const stroke = { stroke: color, fill: "none", strokeLinecap: "round" as const };

  switch (pattern) {
    case "clouds":
      return (
        <g opacity={0.45} {...stroke} strokeWidth={1.4}>
          <path d="M28,58 c4,-6 12,-6 15,-1 c5,-4 12,-1 12,5 c-8,2 -20,2 -27,-4 Z" />
          <path d="M66,120 c4,-6 12,-6 15,-1 c5,-4 12,-1 12,5 c-8,2 -20,2 -27,-4 Z" />
          <path d="M74,50 c3,-5 10,-5 12,-1" />
          <path d="M26,116 c3,-5 10,-5 12,-1" />
        </g>
      );
    case "stars":
      return (
        <g opacity={0.6} fill={color}>
          {[
            [34, 54, 3.2],
            [88, 66, 2.4],
            [30, 108, 2.2],
            [92, 116, 3],
            [60, 44, 2.6],
            [46, 132, 2],
            [78, 134, 2.4],
          ].map(([x, y, r], i) => (
            <path
              key={i}
              d={`M${x},${y - r} Q${x + r * 0.28},${y - r * 0.28} ${x + r},${y} Q${x + r * 0.28},${y + r * 0.28} ${x},${y + r} Q${x - r * 0.28},${y + r * 0.28} ${x - r},${y} Q${x - r * 0.28},${y - r * 0.28} ${x},${y - r} Z`}
            />
          ))}
        </g>
      );
    case "galaxy":
      return (
        <g opacity={0.5} {...stroke} strokeWidth={1.3}>
          <path d="M60,88 C48,76 44,60 58,52 C74,44 90,56 88,72" />
          <path d="M60,88 C72,100 76,116 62,124 C46,132 30,120 32,104" />
          <circle cx={60} cy={88} r={3.4} fill={color} stroke="none" />
        </g>
      );
    case "sakura":
      return (
        <g opacity={0.55} fill={color}>
          {[
            [36, 60, 1],
            [84, 78, 0.85],
            [50, 122, 0.9],
            [86, 126, 0.7],
            [64, 46, 0.75],
          ].map(([cx, cy, s], i) => (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse key={deg} rx={2.6} ry={4.6} cy={-4.4} transform={`rotate(${deg})`} />
              ))}
            </g>
          ))}
        </g>
      );
    case "lattice":
      return (
        <g opacity={0.35} {...stroke} strokeWidth={1}>
          {[-40, -20, 0, 20, 40, 60].map((o) => (
            <path key={`a${o}`} d={`M${16 + o},30 L${76 + o},146`} />
          ))}
          {[-40, -20, 0, 20, 40, 60].map((o) => (
            <path key={`b${o}`} d={`M${104 - o},30 L${44 - o},146`} />
          ))}
        </g>
      );
    case "waves":
      return (
        <g opacity={0.45} {...stroke} strokeWidth={1.5}>
          {[52, 74, 96, 118].map((y) => (
            <path key={y} d={`M14,${y} q14,-7 28,0 t28,0 t28,0 t28,0`} />
          ))}
        </g>
      );
    case "moons":
      return (
        <g opacity={0.5} fill={color}>
          {[
            [36, 62, 8],
            [86, 112, 6.5],
            [72, 50, 4.5],
          ].map(([cx, cy, r], i) => (
            <path
              key={i}
              d={`M${cx},${cy - r} a${r},${r} 0 1,0 0,${r * 2} a${r * 0.78},${r * 0.78} 0 1,1 0,${-r * 2} Z`}
            />
          ))}
        </g>
      );
    case "rays":
      return (
        <g opacity={0.4} {...stroke} strokeWidth={1.3}>
          {[-60, -40, -20, 0, 20, 40, 60].map((deg) => (
            <path key={deg} d="M60,140 L60,58" transform={`rotate(${deg} 60 140)`} />
          ))}
          <circle cx={60} cy={140} r={7} fill={color} stroke="none" opacity={0.6} />
        </g>
      );
    case "constellation":
      return (
        <g opacity={0.75}>
          <path
            d="M38,64 L54,52 L72,66 L84,58 M54,52 L58,86 L78,102 M58,86 L40,104"
            stroke={color}
            strokeWidth={0.9}
            fill="none"
            opacity={0.6}
          />
          {[
            [38, 64],
            [54, 52],
            [72, 66],
            [84, 58],
            [58, 86],
            [78, 102],
            [40, 104],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.9} fill={color} />
          ))}
        </g>
      );
    case "comet":
      return (
        <g opacity={0.7}>
          {[
            [40, 60, 22],
            [78, 96, 16],
            [56, 124, 13],
          ].map(([x, y, len], i) => (
            <g key={i}>
              <path
                d={`M${x},${y} L${x + len},${y - len * 0.6}`}
                stroke={color}
                strokeWidth={1.4}
                strokeLinecap="round"
                opacity={0.5}
              />
              <circle cx={x} cy={y} r={2.4} fill={color} />
            </g>
          ))}
        </g>
      );
    case "rings":
      return (
        <g opacity={0.55} {...stroke} strokeWidth={1.3}>
          <ellipse cx={60} cy={80} rx={44} ry={13} />
          <ellipse cx={60} cy={86} rx={34} ry={9} />
          {[-34, -17, 0, 17, 34].map((dx) => (
            <circle key={dx} cx={60 + dx} cy={92} r={2.6} fill={color} stroke="none" />
          ))}
        </g>
      );
    case "holo":
      return (
        <g opacity={0.35}>
          {[
            ["#7dd3fc", -30],
            ["#c4b5fd", -8],
            ["#fda4af", 14],
            ["#fde68a", 36],
          ].map(([c, o], i) => (
            <path
              key={i}
              d={`M${10 + (o as number)},146 L${44 + (o as number)},30 L${58 + (o as number)},30 L${24 + (o as number)},146 Z`}
              fill={c as string}
            />
          ))}
        </g>
      );
  }
}

export function Lantern({
  design,
  text,
  width = 150,
  className,
  style,
}: {
  design: LanternDesign;
  text?: string;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const shape = SHAPES[design.shape];
  const [lit, mid, edge] = design.body;

  const lines = text ? wrapText(text) : [];
  const fontSize = fontSizeFor(lines);
  const firstLineY = shape.textY - ((lines.length - 1) * fontSize * 1.28) / 2;
  const bannerWidth = Math.min(96, longestLine(lines) * fontSize * 0.62 + 12);

  return (
    <svg
      viewBox="0 0 120 220"
      width={width}
      height={(width * 220) / 120}
      className={className}
      style={style}
      role={text ? "img" : "presentation"}
      aria-label={text ? `โคมไฟ${design.name}: ${text}` : undefined}
    >
      <defs>
        <radialGradient id={`body-${uid}`} cx="42%" cy="42%" r="72%">
          <stop offset="0%" stopColor={lit} />
          <stop offset="52%" stopColor={mid} />
          <stop offset="100%" stopColor={edge} />
        </radialGradient>
        <radialGradient id={`flame-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={lit} stopOpacity={0.95} />
          <stop offset="60%" stopColor={design.glow} stopOpacity={0.35} />
          <stop offset="100%" stopColor={design.glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`gloss-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`trim-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={edge} />
          <stop offset="35%" stopColor={design.trim} />
          <stop offset="65%" stopColor={design.trim} />
          <stop offset="100%" stopColor={edge} />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={shape.path} />
        </clipPath>
      </defs>

      {/* สายแขวน */}
      <path d="M60,18 V6" stroke={design.trim} strokeWidth={1.4} opacity={0.75} fill="none" />
      <circle cx={60} cy={4} r={3} stroke={design.trim} strokeWidth={1.2} fill="none" opacity={0.75} />

      {/* ฝาบน */}
      <rect x={40} y={16} width={40} height={14} rx={4} fill={`url(#trim-${uid})`} />
      <rect x={44} y={19} width={32} height={3} rx={1.5} fill="#ffffff" opacity={0.28} />

      {/* ตัวโคม */}
      <path d={shape.path} fill={`url(#body-${uid})`} />

      <g clipPath={`url(#clip-${uid})`}>
        <Pattern pattern={design.pattern} color={design.accent} />

        {/* แสงเทียนด้านใน */}
        <ellipse
          className="lantern-flame"
          cx={60}
          cy={shape.ribBottom - 26}
          rx={30}
          ry={32}
          fill={`url(#flame-${uid})`}
        />

        {/* ประกายผิวกระดาษ */}
        <ellipse
          cx={44}
          cy={shape.ribTop + 34}
          rx={17}
          ry={25}
          fill={`url(#gloss-${uid})`}
          transform="rotate(-16 44 66)"
        />

        {/* ซี่โครงโคม */}
        {shape.ribs && (
          <g stroke={design.trim} fill="none" opacity={0.32} strokeWidth={1.1}>
            {[-1, -0.58, 0.58, 1].map((f) => (
              <path
                key={f}
                d={`M60,${shape.ribTop} C${60 + f * shape.ribSpread},${shape.ribTop + 24} ${60 + f * shape.ribSpread},${shape.ribBottom - 24} 60,${shape.ribBottom}`}
              />
            ))}
          </g>
        )}

        {/* ขอบบน-ล่างให้ดูเป็นทรงสามมิติ */}
        <ellipse
          cx={60}
          cy={shape.ribTop + 3}
          rx={shape.rimRx}
          ry={5}
          fill="none"
          stroke={design.trim}
          strokeWidth={1}
          opacity={0.4}
        />
        <ellipse
          cx={60}
          cy={shape.ribBottom - 3}
          rx={shape.rimRx}
          ry={5}
          fill="none"
          stroke={design.trim}
          strokeWidth={1}
          opacity={0.32}
        />

        {/* เงาขอบซ้าย-ขวา ให้ดูโค้ง */}
        <path d={shape.path} fill="none" stroke={edge} strokeWidth={3} opacity={0.35} />
      </g>

      {/* ฝาล่าง */}
      <rect x={42} y={shape.ribBottom - 2} width={36} height={13} rx={4} fill={`url(#trim-${uid})`} />

      {/* พู่ */}
      <g stroke={design.trim} strokeWidth={1.5} strokeLinecap="round" opacity={0.85}>
        {[-6, -3, 0, 3, 6].map((dx) => (
          <path
            key={dx}
            d={`M60,${shape.ribBottom + 12} C${60 + dx * 1.6},${shape.ribBottom + 30} ${60 + dx * 2.2},${shape.ribBottom + 42} ${60 + dx * 2.6},${shape.ribBottom + 56}`}
            fill="none"
          />
        ))}
      </g>
      <circle cx={60} cy={shape.ribBottom + 12} r={4.5} fill={`url(#trim-${uid})`} />

      {/* แถบรองข้อความ ให้อ่านออกแม้ตัวโคมลายเยอะ */}
      {lines.length > 0 && (
        <rect
          x={60 - bannerWidth / 2}
          y={firstLineY - fontSize * 0.95}
          width={bannerWidth}
          height={(lines.length - 1) * fontSize * 1.28 + fontSize * 1.4}
          rx={5}
          fill={edge}
          opacity={0.4}
        />
      )}

      {/* ข้อความของผู้ส่ง */}
      {lines.length > 0 && (
        <text
          x={60}
          y={firstLineY}
          textAnchor="middle"
          fontSize={fontSize}
          fill={design.textColor}
          stroke={edge}
          strokeWidth={0.7}
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-thai), sans-serif", fontWeight: 600 }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={60} dy={i === 0 ? 0 : fontSize * 1.28}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
}
