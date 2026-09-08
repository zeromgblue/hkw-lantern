"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
const CHAIRMAN_OPEN_DELAY_MS = 1200;
const CHAIRMAN_TYPE_START_MS = 3000;
const CHAIRMAN_TYPE_INTERVAL_MS = 55;
const CHAIRMAN_NAME_DELAY_MS = 500;
const CHAIRMAN_FIREWORKS_DURATION_MS = 12000;

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

type ChairmanPhase = "rising" | "opening" | "typing" | "revealName";

function ChairmanLantern({ item, design }: { item: ChairmanItem; design: LanternDesign }) {
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
    }, CHAIRMAN_OPEN_DELAY_MS);
    const toTyping = setTimeout(() => setPhase("typing"), CHAIRMAN_TYPE_START_MS);

    // พลุระลอกต่อ ๆ ไปทุก 3.4 วิ แต่หยุดหลังจากช่วงเปิดตัว ไม่ยิงตลอดไป
    const burstInterval = setInterval(() => {
      setBurst({ id: Date.now(), particles: makeFireworkParticles() });
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
  const [chairman, setChairman] = useState<ChairmanItem | null>(null);
  const [rockets, setRockets] = useState<SkyRocket[]>([]);
  const queue = useRef<LanternDoc[]>([]);
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
      {rockets.map((r) => (
        <SkyRocketView key={r.id} rocket={r} onDone={removeRocket} />
      ))}
      {flying.map((item) => {
        const design = getDesign(item.doc.designId);
        const isChairman = item.doc.variant === "chairman";
        return (
          <div
            key={item.key}
            className={`lantern-rise${isChairman ? " chairman-rise" : ""}`}
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
