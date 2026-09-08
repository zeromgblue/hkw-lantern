"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
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
  direction: 1 | -1;
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
const CHAIRMAN_VISIBLE_MS = 5000;
const CHAIRMAN_FADE_MS = 2200;
const CHAIRMAN_FIREWORKS_DURATION_MS = 12000;
const CHAIRMAN_BANNER_WIDTH = 1705;
const CHAIRMAN_BANNER_HEIGHT = 960;

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

type ChairmanPhase = "rising" | "opening" | "fading" | "settled";

// พารามิเตอร์ดาวโคจรรอบวงแหวนอวกาศ — คงที่ ไม่สุ่มใหม่ทุก render กันวงแหวนกระตุก
// รัศมีเท่ากับรัศมีวงแหวน (.chairman-orbit-ring กว้าง 40vmin) ดาวจึงเรียงตัวโคจรไปตามเส้นวงแหวนพอดี
const CHAIRMAN_ORBIT_RADIUS_VMIN = 20;
const CHAIRMAN_ORBIT_STARS = [
  { period: 22, phase: 0, twinkleDur: 2.6, twinkleDelay: 0 },
  { period: 22, phase: 5.5, twinkleDur: 3.1, twinkleDelay: 0.6 },
  { period: 22, phase: 11, twinkleDur: 2.8, twinkleDelay: 1.3 },
  { period: 22, phase: 16.5, twinkleDur: 3.4, twinkleDelay: 2 },
];

function ChairmanLantern({
  item,
  design,
  onSettled,
}: {
  item: ChairmanItem;
  design: LanternDesign;
  onSettled?: () => void;
}) {
  const [phase, setPhase] = useState<ChairmanPhase>("rising");
  const [burst, setBurst] = useState<{ id: number; particles: FireworkParticle[] } | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  // ไล่ลำดับ: ปรากฏตัว -> โคมแตกเป็นแสงวาบแล้วรูปภาพค่อย ๆ ผุดขึ้นกลางโคม -> ค้างไว้สักพักแล้วค่อย ๆ จางหาย
  // -> เมื่อรูปจางหายหมด โคมเลื่อนไปกึ่งกลางจอพร้อมวงแหวนอวกาศโคจรรอบตัว
  // ตัวโคมเองอยู่กลางจอถาวร (ไม่ลอยหายไป) พลุจะยิงต่อเนื่องแค่ช่วงแรกแล้วหยุด
  useEffect(() => {
    const toOpening = setTimeout(() => {
      setPhase("opening");
      setFlashId(Date.now());
      // พลุชุดใหญ่ตรงจังหวะที่โคมแปลงร่างปล่อยรูปภาพ
      setBurst({ id: Date.now() + 1, particles: makeFireworkParticles(42, 1.5) });
    }, CHAIRMAN_OPEN_DELAY_MS);
    const toFading = setTimeout(() => setPhase("fading"), CHAIRMAN_OPEN_DELAY_MS + CHAIRMAN_VISIBLE_MS);
    const toSettled = setTimeout(() => {
      setPhase("settled");
      onSettled?.();
    }, CHAIRMAN_OPEN_DELAY_MS + CHAIRMAN_VISIBLE_MS + CHAIRMAN_FADE_MS);

    // พลุระลอกต่อ ๆ ไปทุก 3.4 วิ แต่หยุดหลังจากช่วงเปิดตัว ไม่ยิงตลอดไป
    const burstInterval = setInterval(() => {
      setBurst({ id: Date.now(), particles: makeFireworkParticles() });
    }, 3400);
    const stopBursts = setTimeout(() => clearInterval(burstInterval), CHAIRMAN_FIREWORKS_DURATION_MS);

    return () => {
      clearTimeout(toOpening);
      clearTimeout(toFading);
      clearTimeout(toSettled);
      clearInterval(burstInterval);
      clearTimeout(stopBursts);
    };
  }, [onSettled]);

  const portraitVisible = phase !== "rising";
  const fading = phase === "fading" || phase === "settled";
  const orbitVisible = phase === "settled";

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

      {/* วงแหวนอวกาศโคจรรอบโคมประธาน — ปรากฏหลังรูปภาพจางหายและโคมตั้งหลักกลางจอ */}
      <div className={`chairman-orbit${orbitVisible ? " chairman-orbit-visible" : ""}`}>
        <div className="chairman-orbit-ring" />
        {CHAIRMAN_ORBIT_STARS.map((star, i) => (
          <div
            key={i}
            className="orbit-spin"
            style={{ "--period": `${star.period}s`, "--phase": `${star.phase}s` } as React.CSSProperties}
          >
            <div
              className="orbit-radius"
              style={{ "--radius": `${CHAIRMAN_ORBIT_RADIUS_VMIN}vmin` } as React.CSSProperties}
            >
              <div
                className="orbit-counter-spin"
                style={{ "--period": `${star.period}s`, "--phase": `${star.phase}s` } as React.CSSProperties}
              >
                <span
                  className="chairman-orbit-star orbit-twinkle"
                  style={
                    {
                      "--twinkle-dur": `${star.twinkleDur}s`,
                      "--twinkle-delay": `${star.twinkleDelay}s`,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          </div>
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

      {/* รูปภาพค่อย ๆ ผุดขึ้นกลางโคม ค้างอยู่ราว 10 วิ แล้วค่อย ๆ จางหาย (ไม่ใช่ปรากฏ/หายแบบทันที) */}
      <div
        className={`chairman-portrait${portraitVisible ? " chairman-portrait-visible" : ""}${fading ? " chairman-portrait-fade" : ""}`}
      >
        {/* หักล้างการโยกของโคม (lantern-sway บน chairman-stack) ให้รูปนิ่ง ไม่โยกตาม */}
        <div className="chairman-portrait-counter-sway">
          <span className="chairman-scroll-image-wrap">
            <Image
              src="/chairman-banner.jpg"
              alt=""
              width={CHAIRMAN_BANNER_WIDTH}
              height={CHAIRMAN_BANNER_HEIGHT}
              unoptimized
              className="chairman-scroll-image"
            />
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
  const [chairmanSettled, setChairmanSettled] = useState(false);
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

  const handleChairmanSettled = useCallback(() => setChairmanSettled(true), []);

  const spawn = useCallback(
    (doc: LanternDoc) => {
      const isChairman = doc.variant === "chairman";

      if (isChairman) {
        // โคมประธานอยู่กลางจอถาวร ไม่ลอยหายไปอีก
        setChairmanSettled(false);
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
          // สุ่มทิศทางโคจรอิสระต่อโคม (ตามเข็ม/ทวนเข็ม) ไม่ให้ทุกดวงหมุนไปทางเดียวกันหมด
          direction: Math.random() < 0.5 ? 1 : -1,
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
      setChairmanSettled(false);
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

      {chairman && (
        <div
          className={`chairman-anchor${chairmanSettled ? " chairman-anchor-settled" : ""}`}
          style={{ zIndex: 30 } as React.CSSProperties}
        >
          <ChairmanLantern
            item={chairman}
            design={getDesign(chairman.doc.designId)}
            onSettled={handleChairmanSettled}
          />
        </div>
      )}

      {flying.map((item) => {
        const design = getDesign(item.doc.designId);
        return (
          <div
            key={item.key}
            className="orbit-anchor"
            style={{ "--dir": item.direction } as React.CSSProperties}
          >
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
