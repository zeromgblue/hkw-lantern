"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  phase: number;
  twinkle: number;
  drift: number;
  tint: string;
  glow: boolean;
  flare: boolean;
};

// เรียงจากดาวขาวธรรมดา ไปดาวยักษ์แดง/น้ำเงิน ให้สัดส่วนสมจริง (ขาวเยอะสุด)
const TINTS = [
  "255,255,255",
  "255,255,255",
  "255,255,255",
  "203,225,255",
  "255,238,214",
  "180,205,255",
  "255,196,150",
];

function makeStars(width: number, height: number, density: number): Star[] {
  const count = Math.min(520, Math.round((width * height) / density));
  return Array.from({ length: count }, () => {
    const r = Math.random() ** 2.6 * 1.9 + 0.3;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.5 + Math.random() * 1.8,
      drift: 1.2 + Math.random() * 4,
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      glow: r > 1.35,
      flare: r > 1.7 && Math.random() < 0.5,
    };
  });
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    let dust: Star[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let bandAngle = -0.42;

    // ดวงจันทร์โคจรรอบดาวเคราะห์วงแหวน (ตำแหน่งอิงตาม CSS ของ SVG ดาวเคราะห์: right 6%, top 9%)
    type OrbitMoon = {
      a: number;
      b: number;
      speed: number;
      phase: number;
      radius: number;
      color: string;
      trail: boolean;
    };
    let orbit: { cx: number; cy: number; tilt: number; moons: OrbitMoon[] } | null = null;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(width, height, 4200);
      // ฝุ่นดาวหนาแน่นเฉพาะแถบทางช้างเผือก
      dust = makeStars(width * 1.7, height * 1.7, 900).map((s) => ({
        ...s,
        r: s.r * 0.55,
      }));
      bandAngle = -0.42;

      // ตรงกับ CSS ของ SVG ดาวเสาร์: right 6%, top 9%, width clamp(170px,20vw,340px), viewBox 300x210
      const svgW = Math.min(340, Math.max(170, width * 0.2));
      orbit = {
        cx: width * 0.94 - svgW * 0.5,
        cy: height * 0.09 + svgW * 0.35,
        // ระนาบเดียวกับวงแหวน (-17°) ดวงจันทร์จึงโคจรร่วมระนาบตามจริง
        tilt: -0.2967,
        moons: [
          {
            a: svgW * 0.56,
            b: svgW * 0.112,
            speed: 0.32,
            phase: 0.6,
            radius: Math.max(1.5, svgW * 0.01),
            color: "255,232,196",
            trail: true,
          },
          {
            a: svgW * 0.74,
            b: svgW * 0.155,
            speed: 0.17,
            phase: 3.4,
            radius: Math.max(1.1, svgW * 0.0075),
            color: "200,220,255",
            trail: true,
          },
        ],
      };
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);

      // --- ทางช้างเผือก: แถบฝุ่นดาวเฉียง เรืองแสงจาง ๆ ---
      ctx.save();
      ctx.translate(width * 0.5, height * 0.42);
      ctx.rotate(bandAngle);
      const bandW = Math.max(width, height) * 1.9;
      const bandGrad = ctx.createLinearGradient(0, -180, 0, 180);
      bandGrad.addColorStop(0, "rgba(120,140,200,0)");
      bandGrad.addColorStop(0.5, "rgba(160,180,230,0.10)");
      bandGrad.addColorStop(1, "rgba(120,140,200,0)");
      ctx.fillStyle = bandGrad;
      ctx.fillRect(-bandW / 2, -180, bandW, 360);
      ctx.restore();

      ctx.save();
      ctx.translate(width * 0.5, height * 0.42);
      ctx.rotate(bandAngle);
      for (const d of dust) {
        const x = d.x - width * 0.35;
        const y = (d.y % 360) - 180;
        const alpha = 0.35 + 0.35 * Math.sin(now / 1300 * d.twinkle + d.phase);
        ctx.fillStyle = `rgba(226,232,255,${Math.max(0.04, alpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // --- ดาวหลัก ---
      for (const star of stars) {
        star.y += star.drift * dt;
        if (star.y > height + 2) {
          star.y = -2;
          star.x = Math.random() * width;
        }

        const alpha = 0.4 + 0.6 * Math.sin(now / 1000 * star.twinkle + star.phase);
        const a = Math.max(0.06, alpha);

        if (star.glow) {
          const glowR = star.r * 6;
          const g = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
          g.addColorStop(0, `rgba(${star.tint},${(a * 0.35).toFixed(3)})`);
          g.addColorStop(1, `rgba(${star.tint},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${star.tint},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        if (star.flare) {
          ctx.strokeStyle = `rgba(${star.tint},${(a * 0.4).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          const len = star.r * 5;
          ctx.beginPath();
          ctx.moveTo(star.x - len, star.y);
          ctx.lineTo(star.x + len, star.y);
          ctx.moveTo(star.x, star.y - len);
          ctx.lineTo(star.x, star.y + len);
          ctx.stroke();
        }
      }

      // --- วงโคจรรอบดาวเคราะห์วงแหวน ---
      if (orbit) {
        ctx.save();
        ctx.translate(orbit.cx, orbit.cy);
        ctx.rotate(orbit.tilt);

        for (const moon of orbit.moons) {
          ctx.beginPath();
          ctx.ellipse(0, 0, moon.a, moon.b, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${moon.color},0.07)`;
          ctx.lineWidth = 1;
          ctx.stroke();

          const angle = moon.phase + (now / 1000) * moon.speed;

          if (moon.trail) {
            for (let i = 16; i >= 1; i--) {
              const ta = angle - i * 0.045;
              const alpha = (1 - i / 16) * 0.22;
              ctx.fillStyle = `rgba(${moon.color},${alpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.arc(Math.cos(ta) * moon.a, Math.sin(ta) * moon.b, moon.radius * 0.55, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          const mx = Math.cos(angle) * moon.a;
          const my = Math.sin(angle) * moon.b;

          const halo = ctx.createRadialGradient(mx, my, 0, mx, my, moon.radius * 5);
          halo.addColorStop(0, `rgba(${moon.color},0.5)`);
          halo.addColorStop(1, `rgba(${moon.color},0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(mx, my, moon.radius * 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${moon.color},0.95)`;
          ctx.beginPath();
          ctx.arc(mx, my, moon.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="space-sky pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="nebula"
        style={
          {
            left: "-10%",
            top: "2%",
            width: "50vw",
            height: "50vw",
            background: "radial-gradient(circle, rgba(139,58,255,0.85) 0%, rgba(76,29,149,0.25) 45%, transparent 72%)",
            "--dx": "60px",
            "--dy": "40px",
            "--dur": "95s",
          } as React.CSSProperties
        }
      />
      <div
        className="nebula"
        style={
          {
            right: "-14%",
            top: "-8%",
            width: "44vw",
            height: "44vw",
            background: "radial-gradient(circle, rgba(34,211,238,0.7) 0%, rgba(14,116,144,0.2) 45%, transparent 72%)",
            "--dx": "-50px",
            "--dy": "50px",
            "--dur": "80s",
          } as React.CSSProperties
        }
      />
      <div
        className="nebula"
        style={
          {
            left: "30%",
            bottom: "-22%",
            width: "62vw",
            height: "42vw",
            background: "radial-gradient(circle, rgba(236,72,153,0.55) 0%, rgba(131,24,67,0.15) 45%, transparent 72%)",
            opacity: 0.55,
            "--dx": "-40px",
            "--dy": "-30px",
            "--dur": "110s",
          } as React.CSSProperties
        }
      />

      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* ดาวเสาร์ — ทรงแป้นตามแกนหมุน แถบบรรยากาศขนานวงแหวน วงแหวนมีช่องแคสสินี เงาดาวทาบวงแหวน และเงาวงแหวนทาบตัวดาว */}
      <svg
        className="absolute hidden sm:block"
        style={{ right: "6%", top: "9%", width: "clamp(170px, 20vw, 340px)" }}
        viewBox="0 0 300 210"
        aria-hidden="true"
      >
        <defs>
          {/* แถบบรรยากาศ — วาดในระบบพิกัดของตัวดาว จึงเอียงตามแกนหมุนเองอัตโนมัติ */}
          <linearGradient id="saturn-bands" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8e8b83" />
            <stop offset="6%" stopColor="#a89a86" />
            <stop offset="15%" stopColor="#d9c496" />
            <stop offset="24%" stopColor="#f2dfb2" />
            <stop offset="32%" stopColor="#e0c489" />
            <stop offset="41%" stopColor="#f6e7bd" />
            <stop offset="50%" stopColor="#e9d099" />
            <stop offset="58%" stopColor="#f4e2b4" />
            <stop offset="67%" stopColor="#d8b478" />
            <stop offset="76%" stopColor="#e7cd94" />
            <stop offset="85%" stopColor="#c69c5f" />
            <stop offset="93%" stopColor="#a87f4c" />
            <stop offset="100%" stopColor="#7e5f3c" />
          </linearGradient>
          {/* ทิศแสงคงที่ในพิกัดจอ ไม่หมุนตามตัวดาว */}
          <radialGradient id="saturn-shade" gradientUnits="userSpaceOnUse" cx="128" cy="84" r="112">
            <stop offset="0%" stopColor="#fff6df" stopOpacity="0.45" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="62%" stopColor="#1c1006" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#05030a" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="saturn-rim" cx="50%" cy="50%" r="50%">
            <stop offset="88%" stopColor="#ffe3b5" stopOpacity="0" />
            <stop offset="96%" stopColor="#ffe3b5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffe3b5" stopOpacity="0" />
          </radialGradient>

          <filter id="saturn-soft" x="-30%" y="-200%" width="160%" height="500%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>

          <clipPath id="saturn-disc">
            <ellipse cx="150" cy="105" rx="58" ry="52.5" transform="rotate(-17 150 105)" />
          </clipPath>
          {/* ครึ่งหน้าของระนาบวงแหวน — ส่วนที่ต้องวาดทับตัวดาว */}
          <clipPath id="saturn-front">
            <rect x="-160" y="0" width="320" height="70" transform="translate(150 105) rotate(-17)" />
          </clipPath>
          {/* วาดวงแหวนในระนาบที่ถูกบีบตามมุมมอง เส้นขอบจึงถูกบีบตามไปด้วยอย่างถูกต้อง */}
          <g id="saturn-rings">
            <g transform="translate(150 105) rotate(-17) scale(1 0.2)" fill="none">
              {/* วง C — บางและจาง */}
              <circle r="80" stroke="#c3a97e" strokeOpacity="0.4" strokeWidth="16" />
              {/* วง B — หนาแน่นและสว่างที่สุด */}
              <circle r="101" stroke="#e7d4a8" strokeOpacity="0.9" strokeWidth="24" />
              <circle r="111" stroke="#f7ebc9" strokeOpacity="0.55" strokeWidth="4" />
              {/* ช่องแคสสินี (113–117) เว้นว่างไว้ */}
              {/* วง A */}
              <circle r="124.5" stroke="#c9b084" strokeOpacity="0.62" strokeWidth="15" />
              {/* ช่องเอนเคอในวง A */}
              <circle r="129" stroke="#2a1d10" strokeOpacity="0.5" strokeWidth="1.6" />
              {/* วง F — เส้นบางนอกสุด */}
              <circle r="136" stroke="#e4d5b0" strokeOpacity="0.22" strokeWidth="1.2" />
            </g>
          </g>
        </defs>

        {/* วงแหวนครึ่งหลัง (ตัวดาวจะบังส่วนกลางในขั้นถัดไป) */}
        <use href="#saturn-rings" />

        <ellipse cx="150" cy="105" rx="58" ry="52.5" transform="rotate(-17 150 105)" fill="url(#saturn-bands)" />

        <g clipPath="url(#saturn-disc)">
          {/* เงาวงแหวนทาบตัวดาว — เส้นบาง ๆ ใต้แนววงแหวน */}
          <ellipse
            cx="150"
            cy="137"
            rx="120"
            ry="4"
            transform="rotate(-17 150 105)"
            fill="#20130a"
            opacity="0.42"
            filter="url(#saturn-soft)"
          />
        </g>

        {/* ขอบบรรยากาศเรืองแสง วาดก่อนเงา ด้านมืดจึงถูกกลบตามจริง */}
        <ellipse cx="150" cy="105" rx="58" ry="52.5" transform="rotate(-17 150 105)" fill="url(#saturn-rim)" />

        <g clipPath="url(#saturn-disc)">
          <rect x="88" y="43" width="124" height="124" fill="url(#saturn-shade)" />
        </g>

        {/* วงแหวนครึ่งหน้า พาดทับตัวดาว */}
        <g clipPath="url(#saturn-front)">
          <use href="#saturn-rings" />
        </g>
      </svg>

      {/* ดาวเนปจูน — ดาวแก๊สสีน้ำเงินเข้ม มีจุดมืดใหญ่และเมฆมีเทนสีขาว */}
      <svg
        className="absolute hidden sm:block"
        style={{ left: "9%", bottom: "15%", width: "clamp(56px, 6.5vw, 120px)" }}
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="neptune-bands" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(-16 0.5 0.5)">
            <stop offset="0%" stopColor="#12386e" />
            <stop offset="11%" stopColor="#2760a5" />
            <stop offset="24%" stopColor="#1c4f92" />
            <stop offset="36%" stopColor="#3574c2" />
            <stop offset="48%" stopColor="#265ba0" />
            <stop offset="60%" stopColor="#1d4b8c" />
            <stop offset="74%" stopColor="#163d75" />
            <stop offset="87%" stopColor="#123163" />
            <stop offset="100%" stopColor="#0c2247" />
          </linearGradient>
          <radialGradient id="neptune-spot">
            <stop offset="0%" stopColor="#06183a" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#0a2249" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0d2a58" stopOpacity="0" />
          </radialGradient>
          <filter id="neptune-soft" x="-50%" y="-200%" width="200%" height="500%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
          <radialGradient id="neptune-shade" gradientUnits="userSpaceOnUse" cx="45" cy="44" r="90">
            <stop offset="0%" stopColor="#d5e9ff" stopOpacity="0.42" />
            <stop offset="32%" stopColor="#9fd0ff" stopOpacity="0.05" />
            <stop offset="64%" stopColor="#04122c" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#01060f" stopOpacity="0.92" />
          </radialGradient>
          <radialGradient id="neptune-rim" cx="50%" cy="50%" r="50%">
            <stop offset="88%" stopColor="#bfe0ff" stopOpacity="0" />
            <stop offset="96%" stopColor="#cfe8ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#cfe8ff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="neptune-disc">
            <circle cx="60" cy="60" r="46" />
          </clipPath>
        </defs>

        <circle cx="60" cy="60" r="46" fill="url(#neptune-bands)" />

        <g clipPath="url(#neptune-disc)">
          {/* จุดมืดใหญ่ — ขอบฟุ้ง ไม่ใช่ขอบคม */}
          <ellipse cx="45" cy="67" rx="14" ry="8" transform="rotate(-16 45 67)" fill="url(#neptune-spot)" />
          {/* เมฆมีเทนสีขาว — เส้นบางฟุ้งตามแนวแถบ */}
          <g filter="url(#neptune-soft)">
            <ellipse cx="54" cy="77" rx="10" ry="1.9" transform="rotate(-16 54 77)" fill="#eaf4ff" opacity="0.3" />
            <ellipse cx="74" cy="47" rx="11" ry="1.7" transform="rotate(-16 74 47)" fill="#dcecff" opacity="0.2" />
            <ellipse cx="66" cy="88" rx="8" ry="1.5" transform="rotate(-16 66 88)" fill="#dcecff" opacity="0.15" />
            <ellipse cx="39" cy="41" rx="6.5" ry="1.4" transform="rotate(-16 39 41)" fill="#eaf4ff" opacity="0.18" />
          </g>
        </g>

        <circle cx="60" cy="60" r="46" fill="url(#neptune-rim)" />
        <g clipPath="url(#neptune-disc)">
          <rect x="12" y="12" width="96" height="96" fill="url(#neptune-shade)" />
        </g>
      </svg>

      {/* ดาวตก */}
      <div className="shooting-star" style={{ left: "-12%", top: "14%", "--dur": "11s", "--delay": "2s" } as React.CSSProperties} />
      <div className="shooting-star" style={{ left: "10%", top: "-4%", "--dur": "17s", "--delay": "8s" } as React.CSSProperties} />
      <div className="shooting-star" style={{ left: "26%", top: "30%", "--dur": "23s", "--delay": "15s" } as React.CSSProperties} />

      <div className="space-vignette absolute inset-0" />
    </div>
  );
}
