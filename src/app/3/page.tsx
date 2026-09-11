"use client";

import { useState } from "react";
import Image from "next/image";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Lantern } from "@/components/Lantern";
import { getDesign } from "@/lib/lanternDesigns";
import { submitDeputyChairmanRight } from "@/lib/lanterns";

type Status = "idle" | "sending" | "sent" | "error";

const CHAIRMAN_DESIGN = getDesign("chairman-gold");
const NAME_TEXT = "นายธีรัช คำยิ่ง";
const PHOTO_URL = "/chairmen/chairman-right.png";

export default function AdminDeputyRightPage() {
  const [status, setStatus] = useState<Status>("idle");

  const handleRelease = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      await submitDeputyChairmanRight();
      setStatus("sent");
    } catch (error) {
      console.error("ปล่อยโคมรองประธาน (ขวา) ไม่สำเร็จ", error);
      setStatus("error");
    }
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="fixed inset-0">
        <SpaceBackground />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">สำหรับรองประธานในพิธี (ขวา)</p>
        <h1
          className="mt-2 text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 24px rgba(255,216,77,0.6)" }}
        >
          โคมรองประธานเปิดงาน
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

        <div className="relative mt-4 h-24 w-24 overflow-hidden rounded-full border-2 border-amber-300/70 shadow-[0_0_20px_rgba(255,216,77,0.4)]">
          <Image src={PHOTO_URL} alt={NAME_TEXT} fill sizes="96px" className="object-cover object-top" unoptimized />
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200/20 bg-white/5 px-5 py-4 backdrop-blur-md">
          <p className="text-sm font-semibold text-amber-200">{NAME_TEXT}</p>
          <p className="mt-3 text-xs text-indigo-200/60">
            โคมจะลอยขึ้นจอใหญ่ทางฝั่งขวาของโคมประธานหลัก พร้อมเอฟเฟกต์พลุ แสดงรูปและชื่อรองประธาน
          </p>
        </div>

        {status === "error" && (
          <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
            ปล่อยโคมไม่สำเร็จ ลองใหม่อีกครั้งนะครับ
          </p>
        )}

        {status === "sent" ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-amber-200">ปล่อยโคมรองประธาน (ขวา) แล้ว 🎆</p>
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
            {status === "sending" ? "กำลังปล่อยโคม..." : "รองประธานกดปล่อยโคม"}
          </button>
        )}
      </div>
    </main>
  );
}
