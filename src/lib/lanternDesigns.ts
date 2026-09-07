export type LanternShape = "round" | "hex" | "barrel" | "diamond" | "ufo";

export type LanternPattern =
  | "clouds"
  | "stars"
  | "galaxy"
  | "sakura"
  | "lattice"
  | "waves"
  | "moons"
  | "rays"
  | "constellation"
  | "comet"
  | "rings"
  | "holo";

export type LanternDesign = {
  id: string;
  name: string;
  shape: LanternShape;
  pattern: LanternPattern;
  /** [แสงกลางโคม, สีตัวโคม, สีขอบเงา] */
  body: [string, string, string];
  glow: string;
  trim: string;
  accent: string;
  textColor: string;
};

export const LANTERN_DESIGNS: LanternDesign[] = [
  {
    id: "classic-red",
    name: "แดง-ทอง คลาสสิก",
    shape: "round",
    pattern: "clouds",
    body: ["#ffe0ad", "#e0352f", "#7d0f18"],
    glow: "#ff8a3c",
    trim: "#f7cf5a",
    accent: "#ffdf9e",
    textColor: "#fff6df",
  },
  {
    id: "nebula-purple",
    name: "นภาม่วง",
    shape: "hex",
    pattern: "stars",
    body: ["#f8dcff", "#a855f7", "#3f1178"],
    glow: "#c084fc",
    trim: "#ecd9ff",
    accent: "#fbeaff",
    textColor: "#fdf4ff",
  },
  {
    id: "galaxy-blue",
    name: "กาแล็กซีน้ำเงิน",
    shape: "round",
    pattern: "galaxy",
    body: ["#d6ecff", "#3b82f6", "#0d2154"],
    glow: "#60a5fa",
    trim: "#d8e6f5",
    accent: "#e6f1ff",
    textColor: "#f0f7ff",
  },
  {
    id: "sakura-pink",
    name: "ซากุระชมพู",
    shape: "round",
    pattern: "sakura",
    body: ["#fff2f8", "#f77fb9", "#8d2a5d"],
    glow: "#f9a8d4",
    trim: "#ffe6f1",
    accent: "#fff7fb",
    textColor: "#fff4f9",
  },
  {
    id: "jade-green",
    name: "หยกเขียว",
    shape: "hex",
    pattern: "lattice",
    body: ["#dcfff0", "#10b981", "#04402f"],
    glow: "#34d399",
    trim: "#f7cf5a",
    accent: "#fde9a9",
    textColor: "#f0fff8",
  },
  {
    id: "aurora",
    name: "แสงเหนือ",
    shape: "round",
    pattern: "waves",
    body: ["#e9fffa", "#2dd4bf", "#2f1a63"],
    glow: "#5eead4",
    trim: "#bdf5ff",
    accent: "#c9bcff",
    textColor: "#f2fffc",
  },
  {
    id: "silver-moon",
    name: "จันทราเงิน",
    shape: "round",
    pattern: "moons",
    body: ["#ffffff", "#c3d1e2", "#3f4c60"],
    glow: "#e2e8f0",
    trim: "#f4f8ff",
    accent: "#ffffff",
    textColor: "#ffffff",
  },
  {
    id: "sunset",
    name: "พระอาทิตย์ตก",
    shape: "barrel",
    pattern: "rays",
    body: ["#fff6cd", "#fb923c", "#8a2f0c"],
    glow: "#fb923c",
    trim: "#ffe08a",
    accent: "#fff3c9",
    textColor: "#fff8e6",
  },
  {
    id: "cosmic-gold",
    name: "จักรวาลดำทอง",
    shape: "diamond",
    pattern: "constellation",
    body: ["#ffe9a8", "#4a3a12", "#0b0a08"],
    glow: "#eab308",
    trim: "#f7cf5a",
    accent: "#ffe9a8",
    textColor: "#ffeeb8",
  },
  {
    id: "shooting-star",
    name: "ดาวตก",
    shape: "diamond",
    pattern: "comet",
    body: ["#ffffff", "#93c5fd", "#16306e"],
    glow: "#bfdbfe",
    trim: "#e6f4ff",
    accent: "#ffffff",
    textColor: "#f5faff",
  },
  {
    id: "ufo",
    name: "ยูเอฟโอ",
    shape: "ufo",
    pattern: "rings",
    body: ["#eaffe9", "#22c55e", "#0a2c1a"],
    glow: "#4ade80",
    trim: "#d5e3ee",
    accent: "#bbf7d0",
    textColor: "#f0fff2",
  },
  {
    id: "cosmic-rainbow",
    name: "รุ้งจักรวาล",
    shape: "round",
    pattern: "holo",
    body: ["#fff6fc", "#f472b6", "#3b34a8"],
    glow: "#e879f9",
    trim: "#e6ebff",
    accent: "#b8f1ff",
    textColor: "#fdf7ff",
  },
];

export const DESIGN_IDS = LANTERN_DESIGNS.map((d) => d.id);

export function getDesign(id: string): LanternDesign {
  return LANTERN_DESIGNS.find((d) => d.id === id) ?? LANTERN_DESIGNS[0];
}
