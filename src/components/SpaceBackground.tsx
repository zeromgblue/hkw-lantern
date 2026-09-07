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
  flare: boolean;
};

const TINTS = ["255,255,255", "203,225,255", "255,232,214", "214,225,255"];

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;

    const buildStars = () => {
      const count = Math.min(360, Math.round((width * height) / 7000));
      stars = Array.from({ length: count }, () => {
        const r = Math.random() ** 2.2 * 1.7 + 0.35;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r,
          phase: Math.random() * Math.PI * 2,
          twinkle: 0.6 + Math.random() * 1.6,
          drift: 1.5 + Math.random() * 5,
          tint: TINTS[Math.floor(Math.random() * TINTS.length)],
          flare: r > 1.5 && Math.random() < 0.4,
        };
      });
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        // ดาวเลื่อนลงช้า ๆ ให้รู้สึกว่าโคมกำลังลอยขึ้น
        star.y += star.drift * dt;
        if (star.y > height + 2) {
          star.y = -2;
          star.x = Math.random() * width;
        }

        const alpha = 0.45 + 0.55 * Math.sin(now / 1000 * star.twinkle + star.phase);
        ctx.fillStyle = `rgba(${star.tint},${Math.max(0.08, alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        if (star.flare) {
          ctx.strokeStyle = `rgba(${star.tint},${(alpha * 0.35).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          const len = star.r * 4.5;
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
            left: "-8%",
            top: "6%",
            width: "48vw",
            height: "48vw",
            background: "radial-gradient(circle, rgba(168,85,247,0.75) 0%, rgba(76,29,149,0) 70%)",
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
            right: "-12%",
            top: "-6%",
            width: "42vw",
            height: "42vw",
            background: "radial-gradient(circle, rgba(56,189,248,0.6) 0%, rgba(14,116,144,0) 72%)",
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
            left: "28%",
            bottom: "-18%",
            width: "60vw",
            height: "40vw",
            background: "radial-gradient(circle, rgba(236,72,153,0.5) 0%, rgba(131,24,67,0) 70%)",
            opacity: 0.42,
            "--dx": "-40px",
            "--dy": "-30px",
            "--dur": "110s",
          } as React.CSSProperties
        }
      />

      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* ดาวเคราะห์ — ซ่อนบนจอมือถือแคบ กันไปทับ UI ฟอร์ม */}
      <svg
        className="absolute hidden sm:block"
        style={{ right: "6%", top: "10%", width: "clamp(90px, 11vw, 190px)" }}
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="planet-a" cx="35%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#ffd9a0" />
            <stop offset="45%" stopColor="#e08a4a" />
            <stop offset="100%" stopColor="#4a1f10" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="100" rx="132" ry="26" fill="none" stroke="rgba(255,214,170,0.35)" strokeWidth="7" transform="rotate(-18 100 100)" />
        <circle cx="100" cy="100" r="62" fill="url(#planet-a)" />
        <ellipse cx="100" cy="100" rx="132" ry="26" fill="none" stroke="rgba(255,224,190,0.22)" strokeWidth="7" transform="rotate(-18 100 100)" strokeDasharray="200 260" />
      </svg>

      <svg
        className="absolute hidden sm:block"
        style={{ left: "8%", bottom: "16%", width: "clamp(50px, 6vw, 110px)", opacity: 0.75 }}
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="planet-b" cx="32%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#cfe9ff" />
            <stop offset="55%" stopColor="#5b8ac9" />
            <stop offset="100%" stopColor="#122447" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="46" fill="url(#planet-b)" />
      </svg>

      {/* ดาวตก */}
      <div className="shooting-star" style={{ left: "-12%", top: "14%", "--dur": "11s", "--delay": "2s" } as React.CSSProperties} />
      <div className="shooting-star" style={{ left: "10%", top: "-4%", "--dur": "17s", "--delay": "8s" } as React.CSSProperties} />
      <div className="shooting-star" style={{ left: "26%", top: "30%", "--dur": "23s", "--delay": "15s" } as React.CSSProperties} />
    </div>
  );
}
