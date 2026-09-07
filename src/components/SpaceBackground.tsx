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

      {/* ดาวเคราะห์วงแหวน — มีเงามืดด้านหนึ่ง + แสงขอบบรรยากาศ */}
      <svg
        className="absolute hidden sm:block"
        style={{ right: "6%", top: "9%", width: "clamp(100px, 12vw, 210px)" }}
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="planet-a-lit" cx="38%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#ffe7bd" />
            <stop offset="35%" stopColor="#f0a35a" />
            <stop offset="70%" stopColor="#a8501f" />
            <stop offset="100%" stopColor="#3a1508" />
          </radialGradient>
          <radialGradient id="planet-a-term" cx="72%" cy="66%" r="65%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="planet-a-rim" cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor="#ffd9a0" stopOpacity="0" />
            <stop offset="97%" stopColor="#ffd9a0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffd9a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="100" rx="136" ry="24" fill="none" stroke="#7a4a2a" strokeWidth="9" opacity="0.4" transform="rotate(-16 100 100)" />
        <circle cx="100" cy="100" r="60" fill="url(#planet-a-lit)" />
        <circle cx="100" cy="100" r="60" fill="url(#planet-a-term)" />
        <ellipse cx="100" cy="100" rx="60" ry="60" fill="none" stroke="url(#planet-a-rim)" strokeWidth="4" />
        <ellipse cx="100" cy="100" rx="136" ry="24" fill="none" stroke="#ffe0b0" strokeWidth="3.5" opacity="0.5" transform="rotate(-16 100 100)" strokeDasharray="90 40 60 30" />
        <ellipse cx="100" cy="100" rx="136" ry="24" fill="none" stroke="#3a1508" strokeWidth="9" opacity="0.55" transform="rotate(-16 100 100)" strokeDasharray="0 210 130 400" />
      </svg>

      {/* ดวงจันทร์เย็น */}
      <svg
        className="absolute hidden sm:block"
        style={{ left: "9%", bottom: "15%", width: "clamp(56px, 6.5vw, 120px)" }}
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="planet-b-lit" cx="34%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#eaf4ff" />
            <stop offset="45%" stopColor="#7fa8d9" />
            <stop offset="80%" stopColor="#2c4a7c" />
            <stop offset="100%" stopColor="#0a1730" />
          </radialGradient>
          <radialGradient id="planet-b-term" cx="70%" cy="64%" r="60%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="46" fill="url(#planet-b-lit)" />
        <circle cx="60" cy="60" r="46" fill="url(#planet-b-term)" />
        <circle cx="46" cy="42" r="6" fill="#ffffff" opacity="0.12" />
        <circle cx="68" cy="66" r="9" fill="#000000" opacity="0.1" />
      </svg>

      {/* ดาวตก */}
      <div className="shooting-star" style={{ left: "-12%", top: "14%", "--dur": "11s", "--delay": "2s" } as React.CSSProperties} />
      <div className="shooting-star" style={{ left: "10%", top: "-4%", "--dur": "17s", "--delay": "8s" } as React.CSSProperties} />
      <div className="shooting-star" style={{ left: "26%", top: "30%", "--dur": "23s", "--delay": "15s" } as React.CSSProperties} />

      <div className="space-vignette absolute inset-0" />
    </div>
  );
}
