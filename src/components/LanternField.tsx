"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Lantern } from "./Lantern";
import { getDesign, LANTERN_DESIGNS, type LanternDesign } from "@/lib/lanternDesigns";
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
const CHAIRMAN_SCALE = 1.4;
const CHAIRMAN_DURATION = 55;
const CHAIRMAN_OPEN_DELAY_MS = 2200;
const CHAIRMAN_TYPE_START_MS = 4000;
const CHAIRMAN_TYPE_INTERVAL_MS = 55;
const CHAIRMAN_NAME_DELAY_MS = 500;

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export type LanternFieldHandle = {
  /** กวาดโคมที่ลอยอยู่บนจอออกทั้งหมด (ไม่แตะข้อมูลใน Firestore) */
  clear: () => void;
};

type FireworkParticle = {
  dx: number;
  dy: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
};

const FIREWORK_COLORS = ["#ffd84d", "#ff8a3c", "#fff6cd", "#ffb703", "#ff8fa3", "#7dd3fc"];

// สุ่มตำแหน่งพลุ — เรียกจาก timer callback เท่านั้น ห้ามเรียกระหว่าง render
function makeFireworkParticles(count = 26, spread = 1): FireworkParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const dist = (55 + Math.random() * 80) * spread;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      delay: Math.random() * 0.12,
      dur: 0.8 + Math.random() * 0.5,
      color: FIREWORK_COLORS[i % FIREWORK_COLORS.length],
      size: 3 + Math.random() * 3.5 * spread,
    };
  });
}

function FireworkBurst({ particles }: { particles: FireworkParticle[] }) {
  return (
    <div className="firework-burst" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="firework-particle"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--pcolor": p.color,
              width: `${p.size}px`,
              height: `${p.size}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

type ChairmanPhase = "rising" | "opening" | "typing" | "revealName";

function ChairmanLantern({ item, design }: { item: Flying; design: LanternDesign }) {
  const [phase, setPhase] = useState<ChairmanPhase>("rising");
  const [typedCount, setTypedCount] = useState(0);
  const [burst, setBurst] = useState<{ id: number; particles: FireworkParticle[] } | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const eventChars = useMemo(() => splitGraphemes(item.doc.text), [item.doc.text]);
  const nameText = item.doc.subtitle ?? "";

  // ไล่ลำดับ: ลอยขึ้น -> โคมแตกเป็นแสงวาบแล้วกลายเป็นจดหมายกางออกสองข้าง -> พิมพ์ข้อความ
  useEffect(() => {
    const toOpening = setTimeout(() => {
      setPhase("opening");
      setFlashId(Date.now());
      // พลุชุดใหญ่ตรงจังหวะที่โคมแปลงร่างเป็นจดหมาย
      setBurst({ id: Date.now() + 1, particles: makeFireworkParticles(42, 1.5) });
    }, CHAIRMAN_OPEN_DELAY_MS);
    const toTyping = setTimeout(() => setPhase("typing"), CHAIRMAN_TYPE_START_MS);

    // พลุระลอกต่อ ๆ ไปวนซ้ำทุก 3.4 วิ ตลอดการลอย
    const burstInterval = setInterval(() => {
      setBurst({ id: Date.now(), particles: makeFireworkParticles() });
    }, 3400);

    return () => {
      clearTimeout(toOpening);
      clearTimeout(toTyping);
      clearInterval(burstInterval);
    };
  }, []);

  // พิมพ์ข้อความทีละตัวอักษรจากซ้ายไปขวาตอนเข้าเฟส typing
  useEffect(() => {
    if (phase !== "typing") return;
    const interval = setInterval(() => {
      setTypedCount((n) => (n < eventChars.length ? n + 1 : n));
    }, CHAIRMAN_TYPE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase, eventChars.length]);

  // พิมพ์จบแล้วค่อยเผยชื่อประธานด้านล่าง
  useEffect(() => {
    if (phase === "typing" && eventChars.length > 0 && typedCount >= eventChars.length) {
      const t = setTimeout(() => setPhase("revealName"), CHAIRMAN_NAME_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [phase, typedCount, eventChars.length]);

  const typedText = eventChars.slice(0, typedCount).join("");
  const scrollOpen = phase !== "rising";
  const showCaret = phase === "typing";
  const showName = phase === "revealName";

  return (
    <div
      className="lantern-sway relative chairman-stack"
      style={
        {
          "--sway": `${item.sway}px`,
          "--sway-dur": `${item.swayDuration}s`,
          "--tilt": `${item.tilt}deg`,
        } as React.CSSProperties
      }
    >
      <div className="lantern-halo chairman-halo" style={{ "--glow": design.glow } as React.CSSProperties} />
      <div className="chairman-halo-ring" />
      {burst && <FireworkBurst key={burst.id} particles={burst.particles} />}
      {flashId !== null && <span key={flashId} className="chairman-flash" />}

      <Lantern
        design={design}
        width={BASE_WIDTH * item.scale}
        style={{
          position: "relative",
          zIndex: 1,
          filter: `drop-shadow(0 0 ${30 * item.scale}px ${design.glow}cc)`,
        }}
      />

      {/* จดหมายกางออกลงด้านล่าง ห้อยจากกระบอกใต้โคม เหมือนโคมไฟจีน */}
      <div className={`chairman-scroll-v${scrollOpen ? " chairman-scroll-v-open" : ""}`}>
        <span className="chairman-scroll-cap" />
        <span className="chairman-scroll-paper-v">
          <span className="chairman-scroll-text">
            {typedText}
            {showCaret && <span className="chairman-caret" />}
          </span>
          <span className={`chairman-scroll-name${showName ? " chairman-scroll-name-visible" : ""}`}>
            {nameText}
          </span>
          <span className="chairman-blossom" aria-hidden="true" />
          <span className={`chairman-seal${showName ? " chairman-seal-visible" : ""}`} />
        </span>
      </div>
    </div>
  );
}

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
      const isChairman = doc.variant === "chairman";
      const scale = isChairman ? CHAIRMAN_SCALE : 0.55 + Math.random() * 0.5;
      const duration = isChairman ? CHAIRMAN_DURATION : 34 - (scale - 0.55) * 20;

      let x: number;
      if (isChairman) {
        // โคมประธานลอยกลางจอ เด่นกว่าโคมทั่วไปที่กระจายเป็นเลน
        x = 50 + (Math.random() - 0.5) * 6;
      } else {
        // กระจายโคมเป็นเลน กันไม่ให้กระจุกทับกันตอนคนส่งพร้อม ๆ กัน
        lane.current = (lane.current + 2 + Math.floor(Math.random() * 5)) % LANES;
        const laneWidth = 88 / LANES;
        x = 6 + laneWidth * (lane.current + 0.5) + (Math.random() - 0.5) * laneWidth * 0.9;
      }

      const item: Flying = {
        key: `${doc.id}-${serial.current++}`,
        doc,
        x,
        scale,
        duration,
        swayDuration: isChairman ? 7 + Math.random() * 2 : 5 + Math.random() * 4,
        sway: isChairman ? 8 + Math.random() * 6 : 12 + Math.random() * 26,
        tilt: isChairman ? 1 + Math.random() : 2 + Math.random() * 4,
      };

      setFlying((prev) => {
        const next = [...prev, item];
        if (next.length <= MAX_ACTIVE) return next;

        // ตัดโคมทั่วไปที่เก่าสุดทิ้งก่อนเมื่อล้น ห้ามตัดโคมประธานทิ้ง
        const overflow = next.length - MAX_ACTIVE;
        let toRemove = overflow;
        const kept: Flying[] = [];
        for (const f of next) {
          if (toRemove > 0 && f.doc.variant !== "chairman") {
            toRemove--;
            continue;
          }
          kept.push(f);
        }
        return kept;
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
        const isChairman = item.doc.variant === "chairman";
        return (
          <div
            key={item.key}
            className="lantern-rise"
            style={
              {
                "--x": `${item.x}%`,
                "--dur": `${item.duration}s`,
                zIndex: isChairman ? 30 : undefined,
              } as React.CSSProperties
            }
          >
            {isChairman ? (
              <ChairmanLantern item={item} design={design} />
            ) : (
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
            )}
          </div>
        );
      })}
    </div>
  );
  },
);
