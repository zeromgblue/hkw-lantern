import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export const MAX_TEXT_LENGTH = 40;

const CHAIRMAN_DESIGN_ID = "chairman-gold";
const CHAIRMAN_EVENT_TEXT = "เปิดโลกปฐมวัยไทขอนแก่น\nประจำปี 2569";
const CHAIRMAN_NAME_TEXT = "ดร. สุภชัย จันปุ่ม";
const CHAIRMAN_PHOTO_URL = "/chairmen/chairman-main.png";

// รองประธานซ้าย — ยืนยันแล้ว: นายวัชระ อันโยธา (จดหมายรองประธานไม่มีข้อความงาน เหลือแค่รูป+ชื่อ)
const DEPUTY_LEFT_EVENT_TEXT = "";
const DEPUTY_LEFT_NAME_TEXT = "นายวัชระ อันโยธา";
const DEPUTY_LEFT_PHOTO_URL = "/chairmen/chairman-left.png";

// รองประธานขวา — ยืนยันแล้ว: ธีรัช คำยิ่ง (จดหมายรองประธานไม่มีข้อความงาน เหลือแค่รูป+ชื่อ)
const DEPUTY_RIGHT_EVENT_TEXT = "";
const DEPUTY_RIGHT_NAME_TEXT = "นายธีรัช คำยิ่ง";
const DEPUTY_RIGHT_PHOTO_URL = "/chairmen/chairman-right.png";

export type ChairmanVariant = "chairman" | "chairman-left" | "chairman-right";

export type LanternDoc = {
  id: string;
  text: string;
  designId: string;
  variant?: ChairmanVariant;
  subtitle?: string;
  photoUrl?: string;
};

const CHAIRMAN_VARIANTS: ChairmanVariant[] = ["chairman", "chairman-left", "chairman-right"];

const lanternsRef = () => collection(db, "lanterns");

function toLantern(doc: QueryDocumentSnapshot<DocumentData>): LanternDoc {
  const data = doc.data();
  const variant = CHAIRMAN_VARIANTS.includes(data.variant) ? (data.variant as ChairmanVariant) : undefined;
  return {
    id: doc.id,
    text: typeof data.text === "string" ? data.text : "",
    designId: typeof data.designId === "string" ? data.designId : "classic-red",
    variant,
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined,
  };
}

export async function submitLantern(text: string, designId: string): Promise<void> {
  await addDoc(lanternsRef(), {
    text: text.trim().slice(0, MAX_TEXT_LENGTH),
    designId,
    createdAt: serverTimestamp(),
  });
}

async function submitChairmanVariant(
  variant: ChairmanVariant,
  text: string,
  subtitle: string,
  photoUrl?: string,
): Promise<void> {
  await addDoc(lanternsRef(), {
    text,
    subtitle,
    designId: CHAIRMAN_DESIGN_ID,
    variant,
    // Firestore addDoc ปฏิเสธค่า undefined ตรง ๆ — ใช้ null แทนเมื่อไม่มีรูป
    photoUrl: photoUrl ?? null,
    createdAt: serverTimestamp(),
  });
}

/** โคมพิเศษของประธาน — เนื้อหาคงที่ ใช้จากหน้า /1 เท่านั้น */
export async function submitChairmanLantern(): Promise<void> {
  await submitChairmanVariant("chairman", CHAIRMAN_EVENT_TEXT, CHAIRMAN_NAME_TEXT, CHAIRMAN_PHOTO_URL);
}

/** โคมรองประธาน (ซ้าย) — ใช้จากหน้า /2 เท่านั้น */
export async function submitDeputyChairmanLeft(): Promise<void> {
  await submitChairmanVariant(
    "chairman-left",
    DEPUTY_LEFT_EVENT_TEXT,
    DEPUTY_LEFT_NAME_TEXT,
    DEPUTY_LEFT_PHOTO_URL,
  );
}

/** โคมรองประธาน (ขวา) — ใช้จากหน้า /3 เท่านั้น */
export async function submitDeputyChairmanRight(): Promise<void> {
  await submitChairmanVariant(
    "chairman-right",
    DEPUTY_RIGHT_EVENT_TEXT,
    DEPUTY_RIGHT_NAME_TEXT,
    DEPUTY_RIGHT_PHOTO_URL,
  );
}

/** โคมล่าสุดไม่กี่ดวง เอาไว้เติมท้องฟ้าตอนเปิดจอใหม่ ๆ จะได้ไม่ว่างเปล่า */
export async function fetchRecentLanterns(count = 10): Promise<LanternDoc[]> {
  const snapshot = await getDocs(query(lanternsRef(), orderBy("createdAt", "desc"), limit(count)));
  return snapshot.docs.map(toLantern).reverse();
}

/** ลบโคมทั้งหมดถาวรจาก Firestore (ใช้กับปุ่มถังขยะบนจอใหญ่) */
export async function clearAllLanterns(): Promise<void> {
  const snapshot = await getDocs(lanternsRef());
  const docs = snapshot.docs;

  // writeBatch จำกัด 500 การเขียนต่อ batch — ลบเป็นชุดกันเผื่อมีเยอะ
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const doc of docs.slice(i, i + 400)) batch.delete(doc.ref);
    await batch.commit();
  }
}

/** ฟังเฉพาะโคมที่ถูกส่งเข้ามาหลังจากเปิดหน้าจอนี้ */
export function listenForNewLanterns(
  onNew: (lantern: LanternDoc) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    lanternsRef(),
    where("createdAt", ">", Timestamp.now()),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") onNew(toLantern(change.doc));
      }
    },
    (error) => {
      console.error("listenForNewLanterns หลุดการเชื่อมต่อ", error);
      onError?.(error);
    },
  );
}

/** จำนวนโคมทั้งหมดแบบเรียลไทม์ — ใช้ที่หน้ามอนิเตอร์ */
export function subscribeLanternCount(
  onChange: (count: number) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    lanternsRef(),
    (snapshot) => onChange(snapshot.size),
    (error) => {
      console.error("subscribeLanternCount หลุดการเชื่อมต่อ", error);
      onError?.(error);
    },
  );
}

const gateRef = () => doc(db, "settings", "gate");

/** ฟังสถานะประตูปล่อยโคม (ปิดโดยดีฟอลต์ถ้ายังไม่เคยตั้งค่า) */
export function subscribeGateOpen(
  onChange: (open: boolean) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    gateRef(),
    (snap) => {
      onChange(snap.exists() && snap.data().open === true);
    },
    (error) => {
      console.error("subscribeGateOpen หลุดการเชื่อมต่อ", error);
      onError?.(error);
    },
  );
}

/** เปิดประตู ปล่อยโคมของผู้ร่วมงานที่ค้างคิวทั้งหมด — กดจากหน้ามอนิเตอร์ (/m) ครั้งเดียวจนจบงาน */
export async function openGate(): Promise<void> {
  await setDoc(gateRef(), { open: true, openedAt: serverTimestamp() }, { merge: true });
}

/** ปิดประตูกลับ — ใช้ตอนซ้อมหรือรีเซ็ตก่อนงานจริงเท่านั้น */
export async function closeGate(): Promise<void> {
  await setDoc(gateRef(), { open: false }, { merge: true });
}
