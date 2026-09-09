"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Lantern } from "./Lantern";
import { getDesign, LANTERN_DESIGNS, type LanternDesign } from "@/lib/lanternDesigns";
import { playFireworkBoom } from "@/lib/fireworkSound";
import {
  fetchRecentLanterns,
  listenForNewLanterns,
  subscribeGateOpen,
  type LanternDoc,
} from "@/lib/lanterns";

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

// โคมทั่วไปโคจรรอบโคมประธานแทนการลอยขึ้นแล้วหายไป — จัดเข้าวงแหวนแบบ golden-angle
// เพื่อกระจายพื้นที่สม่ำเสมอไม่ให้กระจุกทับกันเมื่อโคมสะสมมากขึ้นเรื่อย ๆ
type Flying = {
  key: string;
  doc: LanternDoc;
  scale: number;
  swayDuration: number;
  sway: number;
  tilt: number;
  radiusVmin: number;
  periodSec: number;
  phaseSec: number;
  twinkleDur: number;
  twinkleDelay: number;
};

type ChairmanItem = {
  key: string;
  doc: LanternDoc;
  scale: number;
  swayDuration: number;
  sway: number;
  tilt: number;
};

const MAX_ACTIVE = 150;
const SPAWN_INTERVAL_MS = 400;
const BASE_WIDTH = 170;
const ORBIT_RING_COUNT = 6;
const ORBIT_BASE_RADIUS_VMIN = 14;
const ORBIT_RADIUS_STEP_VMIN = 6;
const ORBIT_BASE_PERIOD_SEC = 70;
const ORBIT_PERIOD_STEP_SEC = 16;
const GOLDEN_ANGLE_DEG = 137.50776;
const CHAIRMAN_SCALE = 1.4;
const CHAIRMAN_IMG_WIDTH = 210;
const CHAIRMAN_IMG_RATIO = 1536 / 1024;
const CHAIRMAN_OPEN_DELAY_MS = 4200;
const CHAIRMAN_TYPE_START_MS = 6000;
const CHAIRMAN_TYPE_INTERVAL_MS = 55;
const CHAIRMAN_NAME_DELAY_MS = 500;
const CHAIRMAN_FIREWORKS_DURATION_MS = 12000;
const CHAIRMAN_HOLD_MS = 10000;
const CHAIRMAN_LEAVE_MS = 5000;

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

type SkyRocket = {
  id: number;
  xPercent: number;
  peakPercent: number;
  color: string;
  flightMs: number;
};

// สุ่มจรวดพลุ — เรียกจาก timer callback เท่านั้น ห้ามเรียกระหว่าง render
function makeRocket(side: "left" | "right", id: number): SkyRocket {
  const xPercent = side === "left" ? 6 + Math.random() * 16 : 78 + Math.random() * 16;
  return {
    id,
    xPercent,
    peakPercent: 26 + Math.random() * 20,
    color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
    flightMs: 950 + Math.random() * 350,
  };
}

function SkyRocketView({ rocket, onDone }: { rocket: SkyRocket; onDone: (id: number) => void }) {
  const [phase, setPhase] = useState<"launch" | "burst">("launch");
  const [particles, setParticles] = useState<FireworkParticle[] | null>(null);

  useEffect(() => {
    const toBurst = setTimeout(() => {
      setPhase("burst");
      setParticles(makeFireworkParticles(34, 1.3));
      playFireworkBoom(0.85);
    }, rocket.flightMs);
    const toDone = setTimeout(() => onDone(rocket.id), rocket.flightMs + 1600);
    return () => {
      clearTimeout(toBurst);
      clearTimeout(toDone);
    };
  }, [rocket, onDone]);

  return (
    <div className="firework-rocket-wrap" style={{ left: `${rocket.xPercent}%` }}>
      {phase === "launch" && (
        <span
          className="firework-rocket"
          style={
            {
              "--rcolor": rocket.color,
              "--peak": `${rocket.peakPercent}vh`,
              "--flight": `${rocket.flightMs}ms`,
            } as React.CSSProperties
          }
        />
      )}
      {phase === "burst" && particles && (
        <div
          className="firework-rocket-burst"
          style={{ transform: `translateY(-${rocket.peakPercent}vh)` }}
        >
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
      )}
    </div>
  );
}

type ChairmanPhase = "rising" | "opening" | "typing" | "revealName" | "leaving";

function ChairmanLantern({
  item,
  design,
  onLeave,
}: {
  item: ChairmanItem;
  design: LanternDesign;
  onLeave: () => void;
}) {
  const [phase, setPhase] = useState<ChairmanPhase>("rising");
  const [typedCount, setTypedCount] = useState(0);
  const [burst, setBurst] = useState<{ id: number; particles: FireworkParticle[] } | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  const eventChars = useMemo(() => splitGraphemes(item.doc.text), [item.doc.text]);
  const nameText = item.doc.subtitle ?? "";

  // ไล่ลำดับ: ปรากฏตัว -> โคมแตกเป็นแสงวาบแล้วกลายเป็นจดหมายกางออกสองข้าง -> พิมพ์ข้อความ
  // จากนั้นอยู่กลางจอถาวร (ไม่ลอยหายไปอีกต่อไป) พลุจะยิงต่อเนื่องแค่ช่วงแรกแล้วหยุด
  useEffect(() => {
    const toOpening = setTimeout(() => {
      setPhase("opening");
      setFlashId(Date.now());
      // พลุชุดใหญ่ตรงจังหวะที่โคมแปลงร่างเป็นจดหมาย
      setBurst({ id: Date.now() + 1, particles: makeFireworkParticles(42, 1.5) });
      playFireworkBoom(1.3);
    }, CHAIRMAN_OPEN_DELAY_MS);
    const toTyping = setTimeout(() => setPhase("typing"), CHAIRMAN_TYPE_START_MS);

    // พลุระลอกต่อ ๆ ไปทุก 3.4 วิ แต่หยุดหลังจากช่วงเปิดตัว ไม่ยิงตลอดไป
    const burstInterval = setInterval(() => {
      setBurst({ id: Date.now(), particles: makeFireworkParticles() });
      playFireworkBoom(1);
    }, 3400);
    const stopBursts = setTimeout(() => clearInterval(burstInterval), CHAIRMAN_FIREWORKS_DURATION_MS);

    return () => {
      clearTimeout(toOpening);
      clearTimeout(toTyping);
      clearInterval(burstInterval);
      clearTimeout(stopBursts);
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

  // เผยชื่อเสร็จแล้ว ลอยค้างไว้ 10 วิ ก่อนค่อย ๆ ลอยขึ้นหายไป
  useEffect(() => {
    if (phase !== "revealName") return;
    const toLeaving = setTimeout(() => setPhase("leaving"), CHAIRMAN_HOLD_MS);
    return () => clearTimeout(toLeaving);
  }, [phase]);

  // รอแอนิเมชันลอยหายจบแล้วค่อยเอาโคมประธานออกจากจอจริง ๆ
  useEffect(() => {
    if (phase !== "leaving") return;
    const toDone = setTimeout(onLeave, CHAIRMAN_LEAVE_MS);
    return () => clearTimeout(toDone);
  }, [phase, onLeave]);

  const scrollOpen = phase === "opening" || phase === "typing" || phase === "revealName";
  const showName = phase === "revealName" || phase === "leaving";
  const isLeaving = phase === "leaving";

  return (
    <div className={`chairman-float-out${isLeaving ? " chairman-float-out-leaving" : ""}`}>
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
      <div className="chairman-smoke" style={{ "--glow": design.glow } as React.CSSProperties} aria-hidden="true">
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <span
            key={angle}
            className="chairman-smoke-wisp"
            style={
              {
                "--wisp-angle": `${angle}deg`,
                animationDelay: `${i * 1.6}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      {burst && <FireworkBurst key={burst.id} particles={burst.particles} />}
      {flashId !== null && <span key={flashId} className="chairman-flash" />}

      <Image
        src="/chairman-lantern.png"
        alt=""
        width={Math.round(CHAIRMAN_IMG_WIDTH * item.scale)}
        height={Math.round(CHAIRMAN_IMG_WIDTH * item.scale * CHAIRMAN_IMG_RATIO)}
        unoptimized
        style={{
          position: "relative",
          zIndex: 1,
          filter: `drop-shadow(0 0 ${30 * item.scale}px ${design.glow}cc)`,
        }}
      />

      {/* จดหมายกางออกลงด้านล่าง ห้อยจากกระบอกใต้โคม เหมือนม้วนสาส์นจีนโบราณ */}
      <div className={`chairman-scroll-v${scrollOpen ? " chairman-scroll-v-open" : ""}`}>
        <span className="chairman-scroll-cap" />
        <span className="chairman-scroll-paper-v">
          <svg className="chairman-inkwash" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="ink-far" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a97a8" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#8a97a8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ink-near" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7889" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#6b7889" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 120 Q 45 78 95 108 T 195 96 T 300 114 T 400 92 V 260 H 0 Z"
              fill="url(#ink-far)"
            />
            <path
              d="M0 168 Q 60 128 130 156 T 260 142 T 400 160 V 260 H 0 Z"
              fill="url(#ink-near)"
            />
            <ellipse cx="120" cy="150" rx="150" ry="14" fill="#fff" opacity="0.12" />
            <ellipse cx="300" cy="120" rx="110" ry="10" fill="#fff" opacity="0.1" />
          </svg>

          <span className="chairman-rod chairman-rod-left" aria-hidden="true">
            <span className="chairman-rod-medallion" />
            <span className="chairman-rod-tassel" />
          </span>
          <span className="chairman-rod chairman-rod-right" aria-hidden="true">
            <span className="chairman-rod-medallion" />
            <span className="chairman-rod-tassel" />
          </span>

          <svg className="chairman-corner chairman-corner-tl" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M2 20 Q2 2 20 2" fill="none" stroke="#a3242c" strokeWidth="1.6" opacity="0.55" />
            <path d="M8 24 Q8 8 24 8" fill="none" stroke="#c9a24a" strokeWidth="1.2" opacity="0.6" />
          </svg>
          <svg className="chairman-corner chairman-corner-tr" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M2 20 Q2 2 20 2" fill="none" stroke="#a3242c" strokeWidth="1.6" opacity="0.55" />
            <path d="M8 24 Q8 8 24 8" fill="none" stroke="#c9a24a" strokeWidth="1.2" opacity="0.6" />
          </svg>
          <svg className="chairman-corner chairman-corner-bl" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M2 20 Q2 2 20 2" fill="none" stroke="#a3242c" strokeWidth="1.6" opacity="0.55" />
            <path d="M8 24 Q8 8 24 8" fill="none" stroke="#c9a24a" strokeWidth="1.2" opacity="0.6" />
          </svg>
          <svg className="chairman-corner chairman-corner-br" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M2 20 Q2 2 20 2" fill="none" stroke="#a3242c" strokeWidth="1.6" opacity="0.55" />
            <path d="M8 24 Q8 8 24 8" fill="none" stroke="#c9a24a" strokeWidth="1.2" opacity="0.6" />
          </svg>

          <span className="chairman-scroll-text">
            {eventChars.slice(0, typedCount).map((ch, i) =>
              ch === "\n" ? (
                <br key={i} />
              ) : (
                <span key={i} className="chairman-letter-char">
                  {ch}
                </span>
              ),
            )}
          </span>
          <span className={`chairman-scroll-name${showName ? " chairman-scroll-name-visible" : ""}`}>
            {nameText}
          </span>

          <svg className="chairman-blossom" viewBox="0 0 90 90" aria-hidden="true">
            <path
              d="M6 88 C 10 66 16 52 30 40 C 40 32 46 26 50 14"
              fill="none"
              stroke="#5b3a24"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M24 46 C 30 42 34 38 34 32"
              fill="none"
              stroke="#5b3a24"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.75"
            />
            {[
              { cx: 50, cy: 14, r: 6.5, o: 0.95 },
              { cx: 34, cy: 32, r: 5, o: 0.85 },
              { cx: 22, cy: 44, r: 6, o: 0.9 },
              { cx: 12, cy: 60, r: 4.5, o: 0.8 },
            ].map((b, i) => (
              <g key={i} opacity={b.o}>
                {[0, 72, 144, 216, 288].map((ang) => (
                  <ellipse
                    key={ang}
                    cx={b.cx}
                    cy={b.cy - b.r * 0.9}
                    rx={b.r * 0.55}
                    ry={b.r * 0.85}
                    fill="#eb90a6"
                    transform={`rotate(${ang} ${b.cx} ${b.cy})`}
                  />
                ))}
                <circle cx={b.cx} cy={b.cy} r={b.r * 0.32} fill="#f7d0a8" />
              </g>
            ))}
          </svg>

          <span className="chairman-petal chairman-petal-1" aria-hidden="true" />
          <span className="chairman-petal chairman-petal-2" aria-hidden="true" />
          <span className="chairman-petal chairman-petal-3" aria-hidden="true" />

          <span className={`chairman-seal${showName ? " chairman-seal-visible" : ""}`}>
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <rect x="2" y="2" width="36" height="36" rx="3" fill="none" stroke="#f4d9a0" strokeWidth="1.4" opacity="0.8" />
              <path
                d="M20 9 C 24 9 27 12 27 16 C 27 19 25 21 22 22 L 22 27 C 22 29 21 30 20 30 C 19 30 18 29 18 27 L 18 22 C 15 21 13 19 13 16 C 13 12 16 9 20 9 Z"
                fill="#f4d9a0"
              />
            </svg>
          </span>
        </span>
      </div>
      </div>
    </div>
  );
}

export const LanternField = forwardRef<LanternFieldHandle, { onCount?: (total: number) => void }>(
  function LanternField({ onCount }, ref) {
  const [flying, setFlying] = useState<Flying[]>([]);
  const [chairman, setChairman] = useState<ChairmanItem | null>(null);
  const handleChairmanLeave = useCallback(() => setChairman(null), []);
  const [rockets, setRockets] = useState<SkyRocket[]>([]);
  const queue = useRef<LanternDoc[]>([]);
  const held = useRef<LanternDoc[]>([]);
  const gateOpenRef = useRef(false);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const serial = useRef(0);
  const total = useRef(0);
  const orbitIndex = useRef(0);
  const rocketSerial = useRef(0);

  const removeRocket = useCallback((id: number) => {
    setRockets((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ยิงพลุจากซ้ายและขวาพร้อมกันเป็นชุด ๆ
  const launchRocketBatch = useCallback(() => {
    const left = makeRocket("left", rocketSerial.current++);
    const right = makeRocket("right", rocketSerial.current++);
    setRockets((prev) => [...prev, left, right]);
  }, []);

  const spawn = useCallback(
    (doc: LanternDoc) => {
      const isChairman = doc.variant === "chairman";

      if (isChairman) {
        // โคมประธานอยู่กลางจอถาวร ไม่ลอยหายไปอีก
        setChairman({
          key: `${doc.id}-${serial.current++}`,
          doc,
          scale: CHAIRMAN_SCALE,
          swayDuration: 7 + Math.random() * 2,
          sway: 8 + Math.random() * 6,
          tilt: 1 + Math.random(),
        });

        // ยิงพลุจากซ้าย-ขวาเป็นชุด ๆ ช่วงที่โคมประธานปรากฏตัว
        [200, 1900, 3600, 5300, 7000].forEach((delay) => {
          const rocketTimer = setTimeout(() => {
            timers.current.delete(rocketTimer);
            launchRocketBatch();
          }, delay);
          timers.current.add(rocketTimer);
        });
      } else {
        // จัดโคมเข้าวงแหวนรอบโคมประธานแบบ golden-angle กระจายสม่ำเสมอ
        // ไม่ทับกันแม้จะสะสมเพิ่มขึ้นเรื่อย ๆ โดยไม่ต้องรื้อตำแหน่งโคมเก่า
        const idx = orbitIndex.current++;
        const ring = idx % ORBIT_RING_COUNT;
        const posInRing = Math.floor(idx / ORBIT_RING_COUNT);
        const angleDeg = posInRing * GOLDEN_ANGLE_DEG + ring * (360 / ORBIT_RING_COUNT) * 0.5;
        const radiusVmin =
          ORBIT_BASE_RADIUS_VMIN + ring * ORBIT_RADIUS_STEP_VMIN + (Math.random() - 0.5) * 2.5;
        const periodSec =
          ORBIT_BASE_PERIOD_SEC + ring * ORBIT_PERIOD_STEP_SEC + (Math.random() - 0.5) * 10;
        const phaseSec = (angleDeg / 360) * periodSec;

        const item: Flying = {
          key: `${doc.id}-${serial.current++}`,
          doc,
          scale: 0.55 + Math.random() * 0.5,
          swayDuration: 5 + Math.random() * 4,
          sway: 12 + Math.random() * 26,
          tilt: 2 + Math.random() * 4,
          radiusVmin,
          periodSec,
          phaseSec,
          twinkleDur: 2 + Math.random() * 3,
          twinkleDelay: Math.random() * 3,
        };

        setFlying((prev) => {
          const next = [...prev, item];
          // กันไว้ไม่ให้สะสมไม่จำกัดจริง ๆ (ป้องกันปัญหาประสิทธิภาพระยะยาว)
          // ตัดโคมที่เก่าสุดทิ้งเมื่อล้นเพดานที่ตั้งไว้กว้าง ๆ
          return next.length > MAX_ACTIVE ? next.slice(next.length - MAX_ACTIVE) : next;
        });
      }

      total.current += 1;
      onCount?.(total.current);
    },
    [onCount, launchRocketBatch],
  );

  const enqueue = useCallback((doc: LanternDoc) => {
    if (seen.current.has(doc.id)) return;
    seen.current.add(doc.id);
    // โคมประธานมาจาก /admin เท่านั้น ไม่ผ่านประตูมอนิเตอร์ — ปล่อยขึ้นจอทันทีเสมอ
    if (doc.variant !== "chairman" && !gateOpenRef.current) {
      held.current.push(doc);
      return;
    }
    queue.current.push(doc);
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      queue.current = [];
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      setFlying([]);
      setRockets([]);
      setChairman(null);
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
      // โหมดซ้อม ไม่ผูกกับประตูมอนิเตอร์จริง ให้ปล่อยทันทีเสมอ
      gateOpenRef.current = true;

      // โคมประธานตัวอย่าง ให้พรีวิวจดหมายได้โดยไม่ต้องเขียน Firestore จริง
      enqueue({
        id: "demo-chairman",
        text: "เปิดโลกปฐมวัยไทขอนแก่น\nประจำปี 2569",
        subtitle: "ดร. สุภชัย จันปุ่ม",
        designId: "chairman-gold",
        variant: "chairman",
      });

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

    // ประตูมอนิเตอร์ — โคมของผู้ร่วมงานจะถูกกักไว้ (held) จนกว่าจะกดปล่อยจากหน้า /m
    // โคมประธานไม่เกี่ยวข้องกับประตูนี้ (ควบคุมแยกจากหน้า /admin)
    const releaseHeld = () => {
      if (held.current.length > 0) {
        queue.current.push(...held.current);
        held.current = [];
      }
    };

    const unsubscribeGate = subscribeGateOpen(
      (open) => {
        const justOpened = open && !gateOpenRef.current;
        gateOpenRef.current = open;
        if (justOpened) releaseHeld();
      },
      (error) => {
        // เชื่อมต่อสถานะประตูไม่ได้ (เช่น deploy กฎยังไม่เสร็จ) — เปิดผ่านทันทีแทนการกักโคมไว้เงียบ ๆ
        // ป้องกันไม่ให้จอใหญ่หยุดแสดงโคมของผู้ร่วมงานทั้งงานเพราะปัญหาการเชื่อมต่อจุดเดียว
        console.error("เชื่อมต่อสถานะประตูไม่สำเร็จ ปล่อยโคมทั้งหมดผ่านไปก่อนเพื่อกันจอใหญ่ค้าง", error);
        gateOpenRef.current = true;
        releaseHeld();
      },
    );

    fetchRecentLanterns(10)
      .then((recent) => recent.forEach(enqueue))
      .catch((error) => console.error("โหลดโคมล่าสุดไม่สำเร็จ", error));

    const unsubscribe = listenForNewLanterns(enqueue, (error) =>
      console.error("เชื่อมต่อสตรีมโคมใหม่ไม่สำเร็จ", error),
    );

    return () => {
      clearInterval(drain);
      unsubscribeGate();
      unsubscribe();
      currentTimers.forEach(clearTimeout);
      currentTimers.clear();
    };
  }, [enqueue, spawn]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {rockets.map((r) => (
        <SkyRocketView key={r.id} rocket={r} onDone={removeRocket} />
      ))}

      {chairman && (
        <div className="chairman-anchor" style={{ zIndex: 30 } as React.CSSProperties}>
          <ChairmanLantern
            item={chairman}
            design={getDesign(chairman.doc.designId)}
            onLeave={handleChairmanLeave}
          />
        </div>
      )}

      {flying.map((item) => {
        const design = getDesign(item.doc.designId);
        return (
          <div key={item.key} className="orbit-anchor">
            <div
              className="orbit-spin"
              style={
                {
                  "--period": `${item.periodSec}s`,
                  "--phase": `${-item.phaseSec}s`,
                } as React.CSSProperties
              }
            >
              <div className="orbit-radius" style={{ "--radius": `${item.radiusVmin}vmin` } as React.CSSProperties}>
                <div
                  className="orbit-counter-spin"
                  style={
                    {
                      "--period": `${item.periodSec}s`,
                      "--phase": `${-item.phaseSec}s`,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="orbit-twinkle"
                    style={
                      {
                        "--twinkle-dur": `${item.twinkleDur}s`,
                        "--twinkle-delay": `${item.twinkleDelay}s`,
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
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
  },
);
