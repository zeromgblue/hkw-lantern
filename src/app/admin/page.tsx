"use client";

import { useState } from "react";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Lantern } from "@/components/Lantern";
import { getDesign } from "@/lib/lanternDesigns";
import { submitChairmanLantern } from "@/lib/lanterns";

type Status = "idle" | "sending" | "sent" | "error";

const CHAIRMAN_DESIGN = getDesign("chairman-gold");
const EVENT_TEXT = "เปิดโลกปฐมวัยไทขอนแก่น ประจำปี 2569";
const NAME_TEXT = "ดร. สุภชัย จันปุ่ม";

export default function AdminPage() {
  const [status, setStatus] = useState<Status>("idle");

  const handleRelease = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      await submitChairmanLantern();
      setStatus("sent");
    } catch (error) {
      console.error("ปล่อยโคมประธานไม่สำเร็จ", error);
      setStatus("error");
    }
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="fixed inset-0">
        <SpaceBackground />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">สำหรับประธานในพิธี</p>
        <h1
          className="mt-2 text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 24px rgba(255,216,77,0.6)" }}
        >
          โคมประธานเปิดงาน
        </h1>

        <div
          className="lantern-sway mt-6"
          style={{ "--sway": "8px", "--sway-dur": "4.5s", "--tilt": "2deg" } as React.CSSProperties}
        >
          <Lantern
            design={CHAIRMAN_DESIGN}
            width={190}
            style={{ filter: `drop-shadow(0 0 30px ${CHAIRMAN_DESIGN.glow}cc)` }}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200/20 bg-white/5 px-5 py-4 backdrop-blur-md">
          <p className="text-sm leading-relaxed text-indigo-100/90">{EVENT_TEXT}</p>
          <p className="mt-2 text-sm font-semibold text-amber-200">{NAME_TEXT}</p>
          <p className="mt-3 text-xs text-indigo-200/60">
            โคมจะลอยขึ้นจอใหญ่ ขนาดใหญ่พิเศษพร้อมเอฟเฟกต์พลุ ข้อความจะเปลี่ยนจากชื่องานเป็นชื่อประธานกลางอากาศโดยอัตโนมัติ
          </p>
        </div>

        {status === "error" && (
          <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
            ปล่อยโคมไม่สำเร็จ ลองใหม่อีกครั้งนะครับ
          </p>
        )}

        {status === "sent" ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-amber-200">ปล่อยโคมประธานแล้ว 🎆</p>
            <p className="text-sm text-indigo-200/80">มองไปที่จอใหญ่ครับ</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-md active:scale-95"
            >
              ปล่อยอีกครั้ง
            </button>
          </div>
        ) : (
          <button
            onClick={handleRelease}
            disabled={status === "sending"}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 py-4 text-lg font-bold text-amber-950 shadow-[0_0_40px_rgba(255,216,77,0.5)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            {status === "sending" ? "กำลังปล่อยโคม..." : "ประธานกดปล่อยโคม"}
          </button>
        )}
      </div>
    </main>
  );
}
