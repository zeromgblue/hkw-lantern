"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Lantern } from "./Lantern";
import { getDesign, LANTERN_DESIGNS } from "@/lib/lanternDesigns";
import { fetchRecentLanterns, listenForNewLanterns, type LanternDoc } from "@/lib/lanterns";

const DEMO_TEXTS = [
  "ขอให้สอบผ่านทุกวิชา",
  "รักนะ",
  "ขอให้ครอบครัวมีความสุข",
  "น้องปอนด์",
  "ขอให้รวย ๆ",
  "ม.6/2 สู้ ๆ",
  "ขอให้ได้เกรด 4",
  "สุขภาพแข็งแรง",
];

type Flying = {
  key: string;
  doc: LanternDoc;
  x: number;
  scale: number;
  duration: number;
  swayDuration: number;
  sway: number;
  tilt: number;
};

const MAX_ACTIVE = 45;
const SPAWN_INTERVAL_MS = 400;
const BASE_WIDTH = 170;
const LANES = 11;

export type LanternFieldHandle = {
  /** กวาดโคมที่ลอยอยู่บนจอออกทั้งหมด (ไม่แตะข้อมูลใน Firestore) */
  clear: () => void;
};

export const LanternField = forwardRef<LanternFieldHandle, { onCount?: (total: number) => void }>(
  function LanternField({ onCount }, ref) {
  const [flying, setFlying] = useState<Flying[]>([]);
  const queue = useRef<LanternDoc[]>([]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const serial = useRef(0);
  const total = useRef(0);
  const lane = useRef(0);

  const spawn = useCallback(
    (doc: LanternDoc) => {
      const scale = 0.55 + Math.random() * 0.5;
      const duration = 34 - (scale - 0.55) * 20;

      // กระจายโคมเป็นเลน กันไม่ให้กระจุกทับกันตอนคนส่งพร้อม ๆ กัน
      lane.current = (lane.current + 2 + Math.floor(Math.random() * 5)) % LANES;
      const laneWidth = 88 / LANES;

      const item: Flying = {
        key: `${doc.id}-${serial.current++}`,
        doc,
        x: 6 + laneWidth * (lane.current + 0.5) + (Math.random() - 0.5) * laneWidth * 0.9,
        scale,
        duration,
        swayDuration: 5 + Math.random() * 4,
        sway: 12 + Math.random() * 26,
        tilt: 2 + Math.random() * 4,
      };

      setFlying((prev) => {
        const next = [...prev, item];
        return next.length > MAX_ACTIVE ? next.slice(next.length - MAX_ACTIVE) : next;
      });

      const timer = setTimeout(
        () => {
          timers.current.delete(timer);
          setFlying((prev) => prev.filter((f) => f.key !== item.key));
        },
        duration * 1000 + 800,
      );
      timers.current.add(timer);

      total.current += 1;
      onCount?.(total.current);
    },
    [onCount],
  );

  const enqueue = useCallback((doc: LanternDoc) => {
    if (seen.current.has(doc.id)) return;
    seen.current.add(doc.id);
    queue.current.push(doc);
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      queue.current = [];
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      setFlying([]);
    },
  }));

  useEffect(() => {
    const drain = setInterval(() => {
      const next = queue.current.shift();
      if (next) spawn(next);
    }, SPAWN_INTERVAL_MS);

    const currentTimers = timers.current;

    // ?demo=1 — ซ้อมหน้าจอโดยไม่ต้องต่อ Firebase (เผื่อเน็ตงานล่ม)
    if (new URLSearchParams(window.location.search).has("demo")) {
      const demo = setInterval(() => {
        enqueue({
          id: `demo-${Date.now()}-${Math.random()}`,
          text: DEMO_TEXTS[Math.floor(Math.random() * DEMO_TEXTS.length)],
          designId: LANTERN_DESIGNS[Math.floor(Math.random() * LANTERN_DESIGNS.length)].id,
        });
      }, 1200);

      return () => {
        clearInterval(drain);
        clearInterval(demo);
        currentTimers.forEach(clearTimeout);
        currentTimers.clear();
      };
    }

    fetchRecentLanterns(10)
      .then((recent) => recent.forEach(enqueue))
      .catch((error) => console.error("โหลดโคมล่าสุดไม่สำเร็จ", error));

    const unsubscribe = listenForNewLanterns(enqueue);

    return () => {
      clearInterval(drain);
      unsubscribe();
      currentTimers.forEach(clearTimeout);
      currentTimers.clear();
    };
  }, [enqueue, spawn]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {flying.map((item) => {
        const design = getDesign(item.doc.designId);
        return (
          <div
            key={item.key}
            className="lantern-rise"
            style={
              {
                "--x": `${item.x}%`,
                "--dur": `${item.duration}s`,
              } as React.CSSProperties
            }
          >
            <div
              className="lantern-sway relative"
              style={
                {
                  "--sway": `${item.sway}px`,
                  "--sway-dur": `${item.swayDuration}s`,
                  "--tilt": `${item.tilt}deg`,
                } as React.CSSProperties
              }
            >
              <div
                className="lantern-halo"
                style={{ "--glow": design.glow } as React.CSSProperties}
              />
              <Lantern
                design={design}
                text={item.doc.text}
                width={BASE_WIDTH * item.scale}
                style={{
                  position: "relative",
                  zIndex: 1,
                  filter: `drop-shadow(0 0 ${18 * item.scale}px ${design.glow}aa)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
  },
);
