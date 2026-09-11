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

export type LanternDoc = {
  id: string;
  text: string;
  designId: string;
  variant?: "chairman";
  subtitle?: string;
  photoUrl?: string;
};

export type ChairmanInput = {
  text: string;
  subtitle: string;
  designId?: string;
  /** รูปประธาน (ถ้ามี) ไปแสดงตรงกลางจดหมายตอนโคมเปิดตัว */
  photoUrl?: string;
};

const lanternsRef = () => collection(db, "lanterns");

function toLantern(doc: QueryDocumentSnapshot<DocumentData>): LanternDoc {
  const data = doc.data();
  return {
    id: doc.id,
    text: typeof data.text === "string" ? data.text : "",
    designId: typeof data.designId === "string" ? data.designId : "classic-red",
    variant: data.variant === "chairman" ? "chairman" : undefined,
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

/** โคมพิเศษของประธาน — ใช้จากหน้า /admin เท่านั้น */
export async function submitChairmanLantern(input: ChairmanInput): Promise<void> {
  await addDoc(lanternsRef(), {
    text: input.text,
    subtitle: input.subtitle,
    designId: input.designId ?? CHAIRMAN_DESIGN_ID,
    variant: "chairman",
    ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
    createdAt: serverTimestamp(),
  });
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
