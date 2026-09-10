"use client";

// เสียงจุดพลุ — เล่นไฟล์เสียงจริง (public/sounds/firework-boom.mp3) แทนการสังเคราะห์
// ใช้ pool ของ <audio> หลายตัวสลับกันเล่น เพื่อให้พลุที่ยิงซ้อนกัน (เช่นจรวดซ้าย-ขวาพร้อมกัน)
// เล่นเสียงทับกันได้โดยไม่ตัดเสียงกันเอง

const SRC = "/sounds/firework-boom.mp3";
const POOL_SIZE = 6;

let pool: HTMLAudioElement[] = [];
let poolIndex = 0;

function getPool(): HTMLAudioElement[] {
  if (typeof window === "undefined") return [];
  if (pool.length === 0) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio(SRC);
      audio.preload = "auto";
      return audio;
    });
  }
  return pool;
}

// เบราว์เซอร์บล็อกเสียงที่เล่นก่อนผู้ใช้โต้ตอบกับหน้าเว็บ — ปลดล็อกด้วยการแตะ/คลิก/กดคีย์ครั้งแรก
if (typeof window !== "undefined") {
  const unlock = () => {
    getPool().forEach((audio) => {
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {});
    });
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/** เล่นเสียงจุดพลุหนึ่งครั้ง — intensity ปรับความดังโดยรวม (ค่าเริ่มต้น 1) */
export function playFireworkBoom(intensity = 1) {
  const audios = getPool();
  if (audios.length === 0) return;

  const audio = audios[poolIndex];
  poolIndex = (poolIndex + 1) % audios.length;

  audio.currentTime = 0;
  audio.volume = Math.min(1, Math.max(0, 0.85 * intensity));
  // สุ่ม pitch เล็กน้อยกันเสียงซ้ำจำเจตอนพลุยิงถี่ ๆ
  audio.playbackRate = 0.94 + Math.random() * 0.12;
  audio.play().catch(() => {
    // เบราว์เซอร์อาจยังบล็อกเสียงถ้าไม่มีการโต้ตอบก่อน — ปล่อยผ่านเงียบ ๆ
  });
}
