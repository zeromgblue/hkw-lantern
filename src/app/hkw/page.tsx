"use client";

import { useEffect, useState } from "react";
import { SpaceBackground } from "@/components/SpaceBackground";
import { fetchAllGuestLanterns, type LanternDoc } from "@/lib/lanterns";

type LoadStatus = "loading" | "loaded" | "error";

export default function HkwPage() {
  const [lanterns, setLanterns] = useState<LanternDoc[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    fetchAllGuestLanterns()
      .then((data) => {
        if (cancelled) return;
        setLanterns(data);
        setStatus("loaded");
      })
      .catch((error) => {
        console.error("โหลดข้อความโคมไม่สำเร็จ", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="fixed inset-0">
        <SpaceBackground />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-10">
        <header className="text-center">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 24px rgba(255,216,77,0.6)" }}
          >
            ข้อความจากโคมทั้งหมด
          </h1>
          <p className="mt-2 text-sm text-indigo-200/75">
            {status === "loaded"
              ? `มีคนปล่อยโคมทั้งหมด ${lanterns.length} ดวง`
              : status === "error"
                ? "โหลดข้อมูลไม่สำเร็จ"
                : "กำลังโหลด..."}
          </p>
        </header>

        {status === "error" && (
          <p className="mt-8 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-200">
            โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าใหม่นะครับ
          </p>
        )}

        {status === "loaded" && lanterns.length === 0 && (
          <p className="mt-8 text-center text-sm text-indigo-200/60">ยังไม่มีใครปล่อยโคมเลยครับ</p>
        )}

        {status === "loaded" && lanterns.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 pb-10 sm:grid-cols-3 md:grid-cols-4">
            {lanterns.map((lantern, index) => (
              <div
                key={lantern.id}
                className="flex flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md"
              >
                <span className="text-[10px] text-indigo-200/40">#{index + 1}</span>
                <span className="mt-1 break-words text-sm leading-relaxed text-white">
                  {lantern.text || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
