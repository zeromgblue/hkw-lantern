"use client";

import { useEffect, useState } from "react";
import { SpaceBackground } from "@/components/SpaceBackground";
import { closeGate, openGate, subscribeGateOpen, subscribeLanternCount } from "@/lib/lanterns";

type ReleaseStatus = "idle" | "sending" | "error";

export default function MonitorPage() {
  const [count, setCount] = useState<number | null>(null);
  const [gateOpen, setGateOpen] = useState<boolean | null>(null);
  const [status, setStatus] = useState<ReleaseStatus>("idle");

  useEffect(() => {
    const unsubscribeCount = subscribeLanternCount(setCount);
    const unsubscribeGate = subscribeGateOpen(setGateOpen);
    return () => {
      unsubscribeCount();
      unsubscribeGate();
    };
  }, []);

  const handleRelease = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      await openGate();
      setStatus("idle");
    } catch (error) {
      console.error("เปิดประตูปล่อยโคมไม่สำเร็จ", error);
      setStatus("error");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("ปิดประตูกลับ? โคมใหม่ที่ผู้ร่วมงานส่งเข้ามาจะถูกกักไว้อีกครั้งจนกว่าจะกดปล่อย")) return;
    try {
      await closeGate();
    } catch (error) {
      console.error("ปิดประตูไม่สำเร็จ", error);
    }
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="fixed inset-0">
        <SpaceBackground />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">สำหรับทีมงาน</p>
        <h1
          className="mt-2 text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 24px rgba(255,216,77,0.6)" }}
        >
          มอนิเตอร์ควบคุมโคม
        </h1>

        <div className="mt-8 rounded-2xl border border-amber-200/20 bg-white/5 px-6 py-6 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/60">จำนวนโคมที่ส่งเข้ามา</p>
          <p
            className="mt-1 text-5xl font-bold text-amber-200 [font-variant-numeric:tabular-nums]"
            style={{ textShadow: "0 0 24px rgba(255,216,77,0.5)" }}
          >
            {count === null ? "…" : count}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              gateOpen ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]"
            }`}
          />
          <span className="text-sm font-medium text-indigo-100/90">
            {gateOpen === null ? "กำลังเชื่อมต่อ…" : gateOpen ? "ประตูเปิดแล้ว — โคมทยอยลอยขึ้นจอใหญ่" : "ประตูปิดอยู่ — โคมกำลังรอ"}
          </span>
        </div>

        {status === "error" && (
          <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
            เปิดประตูไม่สำเร็จ ลองใหม่อีกครั้งนะครับ
          </p>
        )}

        {gateOpen ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-emerald-300">ปล่อยโคมทั้งหมดแล้ว 🏮</p>
            <p className="text-sm text-indigo-200/80">โคมใหม่ที่ส่งเข้ามาจากนี้จะลอยขึ้นจอใหญ่ทันที</p>
          </div>
        ) : (
          <button
            onClick={handleRelease}
            disabled={status === "sending" || gateOpen === null}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 py-4 text-lg font-bold text-amber-950 shadow-[0_0_40px_rgba(255,216,77,0.5)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            {status === "sending" ? "กำลังเปิดประตู..." : "ปล่อยโคมทั้งหมด"}
          </button>
        )}

        <p className="mt-6 max-w-xs text-xs leading-relaxed text-indigo-200/50">
          ก่อนกดปุ่มนี้ โคมที่ผู้ร่วมงานสแกนส่งเข้ามาจะถูกกักไว้ ยังไม่ลอยขึ้นจอใหญ่ — กดครั้งเดียวเพื่อปล่อยโคมที่ค้างทั้งหมดพร้อมกัน
          และเปิดค้างไว้จนจบงาน
        </p>

        {gateOpen && (
          <button
            onClick={handleReset}
            className="mt-10 text-xs text-indigo-300/40 underline decoration-dotted underline-offset-4 active:text-indigo-300/70"
          >
            ปิดประตูอีกครั้ง (สำหรับซ้อมก่อนงานเท่านั้น)
          </button>
        )}
      </div>
    </main>
  );
}
