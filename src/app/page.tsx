"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SpaceBackground } from "@/components/SpaceBackground";
import { LanternField, type LanternFieldHandle } from "@/components/LanternField";
import { clearAllLanterns } from "@/lib/lanterns";

const subscribeNoop = () => () => {};

export default function DisplayPage() {
  const [count, setCount] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const fieldRef = useRef<LanternFieldHandle>(null);

  const handleClear = async () => {
    if (clearing) return;
    if (!window.confirm("ลบโคมทั้งหมดถาวร ทั้งบนจอและในฐานข้อมูล?")) return;

    fieldRef.current?.clear();
    setClearing(true);
    try {
      await clearAllLanterns();
    } catch (error) {
      console.error("ลบโคมไม่สำเร็จ", error);
    } finally {
      setClearing(false);
    }
  };

  // origin รู้ได้เฉพาะฝั่ง client — ใช้ค่าว่างตอน SSR เพื่อไม่ให้ hydration ไม่ตรงกัน
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => "",
  );
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const submitUrl = base ? `${base.replace(/\/$/, "")}/submit` : "";

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SpaceBackground />
      <LanternField ref={fieldRef} onCount={setCount} />

      <header className="pointer-events-none absolute left-[3vw] top-[3vh]">
        <h1
          className="text-[clamp(28px,3.4vw,64px)] font-bold tracking-wide text-white"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            textShadow: "0 0 28px rgba(168,120,255,0.75), 0 0 60px rgba(88,60,190,0.5)",
          }}
        >
          โคมลอยจักรวาล
        </h1>
        <p className="mt-1 text-[clamp(13px,1.15vw,22px)] text-indigo-200/80">
          ส่งคำอธิษฐานของคุณล่องไปกับดวงดาว
        </p>
      </header>

      <div className="pointer-events-none absolute bottom-[4vh] left-[3vw]">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-md">
          <div className="text-[clamp(11px,0.9vw,16px)] uppercase tracking-[0.2em] text-indigo-200/70">
            โคมที่ปล่อยแล้ว
          </div>
          <div
            className="text-[clamp(24px,2.6vw,48px)] font-bold text-amber-200"
            style={{ textShadow: "0 0 24px rgba(251,191,36,0.6)" }}
          >
            {count.toLocaleString("th-TH")}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[4vh] right-[3vw]">
        <div className="flex items-center gap-5 rounded-3xl border border-white/15 bg-white/8 p-5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setQrExpanded(true)}
            disabled={!submitUrl}
            aria-label="ขยาย QR code"
            title="กดเพื่อขยาย QR code"
            className="pointer-events-auto rounded-2xl bg-white p-3 transition hover:scale-105 active:scale-95 disabled:pointer-events-none"
          >
            {submitUrl ? (
              <QRCodeSVG value={submitUrl} size={132} level="M" />
            ) : (
              <div className="h-[132px] w-[132px] animate-pulse rounded bg-slate-200" />
            )}
          </button>
          <div className="max-w-[16vw]">
            <div
              className="text-[clamp(16px,1.5vw,28px)] font-semibold text-white"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              สแกนเพื่อปล่อยโคม
            </div>
            <p className="mt-1 text-[clamp(11px,0.95vw,17px)] leading-relaxed text-indigo-200/80">
              เปิดกล้องมือถือสแกน QR แล้วเขียนคำอธิษฐานของคุณ
            </p>
          </div>
        </div>
      </div>

      {qrExpanded && submitUrl && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setQrExpanded(false)}
          onKeyDown={(e) => e.key === "Escape" && setQrExpanded(false)}
          className="absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm"
        >
          <div className="rounded-3xl bg-white p-8">
            <QRCodeSVG value={submitUrl} size={480} level="M" />
          </div>
          <p className="text-[clamp(18px,2vw,32px)] font-semibold text-white">
            สแกนเพื่อปล่อยโคม — แตะที่ใดก็ได้เพื่อปิด
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleClear}
        disabled={clearing}
        aria-label="ลบโคมทั้งหมด"
        title="ลบโคมทั้งหมด (ถาวร)"
        className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/60 backdrop-blur-md transition hover:bg-white/20 hover:text-white active:scale-90 disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </main>
  );
}
