"use client";

import { useState } from "react";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Lantern } from "@/components/Lantern";
import { LANTERN_DESIGNS, getDesign } from "@/lib/lanternDesigns";
import { MAX_TEXT_LENGTH, submitLantern } from "@/lib/lanterns";

type Status = "idle" | "sending" | "sent" | "error";

export default function SubmitPage() {
  const [text, setText] = useState("");
  const [designId, setDesignId] = useState(LANTERN_DESIGNS[0].id);
  const [status, setStatus] = useState<Status>("idle");

  const design = getDesign(designId);
  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && status !== "sending";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("sending");
    try {
      await submitLantern(trimmed, designId);
      setStatus("sent");
    } catch (error) {
      console.error("ส่งโคมไม่สำเร็จ", error);
      setStatus("error");
    }
  };

  const reset = () => {
    setText("");
    setStatus("idle");
  };

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="fixed inset-0">
        <SpaceBackground />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-7">
        {status === "sent" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="lantern-sway" style={{ "--sway": "10px", "--sway-dur": "4s", "--tilt": "3deg" } as React.CSSProperties}>
              <Lantern
                design={design}
                text={trimmed}
                width={200}
                style={{ filter: `drop-shadow(0 0 26px ${design.glow}aa)` }}
              />
            </div>
            <h2
              className="mt-6 text-3xl font-bold text-white"
              style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 26px rgba(168,120,255,0.7)" }}
            >
              ปล่อยโคมสำเร็จ
            </h2>
            <p className="mt-2 text-indigo-200/80">
              มองไปที่จอใหญ่ โคมของคุณกำลังลอยขึ้นสู่จักรวาล
            </p>
            <button
              onClick={reset}
              className="mt-8 rounded-full border border-white/20 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-md active:scale-95"
            >
              ปล่อยอีกดวง
            </button>
          </div>
        ) : (
          <>
            <header className="text-center">
              <h1
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 24px rgba(168,120,255,0.7)" }}
              >
                ปล่อยโคมของคุณ
              </h1>
              <p className="mt-1 text-sm text-indigo-200/75">
                เขียนชื่อหรือคำอธิษฐาน แล้วเลือกโคมที่ชอบ
              </p>
            </header>

            <div className="mt-4 flex justify-center">
              <div
                className="lantern-sway"
                style={{ "--sway": "8px", "--sway-dur": "4.5s", "--tilt": "2.5deg" } as React.CSSProperties}
              >
                <Lantern
                  design={design}
                  text={trimmed}
                  width={168}
                  style={{ filter: `drop-shadow(0 0 24px ${design.glow}99)` }}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="relative">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                  placeholder="เช่น ขอให้สอบผ่านทุกวิชา"
                  maxLength={MAX_TEXT_LENGTH}
                  enterKeyHint="done"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-center text-lg text-white placeholder:text-indigo-200/40 backdrop-blur-md outline-none focus:border-amber-300/60"
                />
                <span className="absolute -bottom-5 right-2 text-xs text-indigo-200/60">
                  {text.length}/{MAX_TEXT_LENGTH}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 text-sm font-medium text-indigo-100/90">เลือกลายโคม</div>
              <div className="grid grid-cols-4 gap-2">
                {LANTERN_DESIGNS.filter((item) => item.id !== "chairman-gold").map((item) => {
                  const active = item.id === designId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setDesignId(item.id)}
                      aria-pressed={active}
                      className={`flex min-w-0 flex-col items-center overflow-hidden rounded-xl border p-1.5 transition ${
                        active
                          ? "border-amber-300/80 bg-amber-200/10"
                          : "border-white/10 bg-white/5 active:scale-95"
                      }`}
                    >
                      <Lantern
                        design={item}
                        width={44}
                        style={{ filter: `drop-shadow(0 0 8px ${item.glow}88)` }}
                      />
                      <span className="mt-0.5 w-full truncate text-center text-[9px] leading-tight text-indigo-100/70">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {status === "error" && (
              <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-200">
                ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-6 mb-2 w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 py-4 text-lg font-bold text-orange-950 shadow-[0_0_36px_rgba(251,191,36,0.45)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              {status === "sending" ? "กำลังปล่อยโคม..." : "ปล่อยโคม"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
