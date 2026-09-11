"use client";

import { useState } from "react";
import Image from "next/image";
import { Lantern } from "@/components/Lantern";
import { getDesign } from "@/lib/lanternDesigns";
import { submitChairmanLantern } from "@/lib/lanterns";

type Status = "idle" | "sending" | "sent" | "error";

const CHAIRMAN_DESIGN = getDesign("chairman-gold");
const DEFAULT_EVENT_TEXT = "เปิดโลกปฐมวัยไทขอนแก่น\nประจำปี 2569";

export function ChairmanCard({
  nameText,
  photoUrl,
  eventText = DEFAULT_EVENT_TEXT,
}: {
  nameText: string;
  photoUrl?: string;
  /** ข้อความเปิดงานเหนือรูป/ชื่อในจดหมาย — ส่ง "" เพื่อไม่แสดงข้อความนี้เลย */
  eventText?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  const handleRelease = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      await submitChairmanLantern({
        text: eventText,
        subtitle: nameText,
        photoUrl,
      });
      setStatus("sent");
    } catch (error) {
      console.error("ปล่อยโคมประธานไม่สำเร็จ", error);
      setStatus("error");
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="lantern-sway"
        style={{ "--sway": "8px", "--sway-dur": "4.5s", "--tilt": "2deg" } as React.CSSProperties}
      >
        <Lantern
          design={CHAIRMAN_DESIGN}
          width={190}
          style={{ filter: `drop-shadow(0 0 30px ${CHAIRMAN_DESIGN.glow}cc)` }}
        />
      </div>

      <div className="mt-6 w-full rounded-2xl border border-amber-200/20 bg-white/5 px-5 py-4 backdrop-blur-md">
        {eventText && (
          <p className="text-xl leading-relaxed text-indigo-100/90">{eventText.replace(/\n/g, " ")}</p>
        )}
        {photoUrl && (
          <Image
            src={photoUrl}
            alt=""
            width={72}
            height={72}
            unoptimized
            className="mx-auto mt-3 h-[72px] w-[72px] rounded-full border-2 border-amber-200/60 object-cover object-top"
          />
        )}
        <p className="mt-2 text-2xl font-semibold text-amber-200">{nameText}</p>
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
  );
}
