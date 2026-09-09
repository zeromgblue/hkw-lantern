import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export const MAX_TEXT_LENGTH = 40;

const CHAIRMAN_DESIGN_ID = "chairman-gold";
const CHAIRMAN_EVENT_TEXT = "เปิดโลกปฐมวัยไทขอนแก่น ประจำปี 2569";
const CHAIRMAN_NAME_TEXT = "ดร. สุภชัย จันปุ่ม";

export type LanternDoc = {
  id: string;
  text: string;
  designId: string;
  variant?: "chairman";
  subtitle?: string;
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
  };
}

export async function submitLantern(text: string, designId: string): Promise<void> {
  await addDoc(lanternsRef(), {
    text: text.trim().slice(0, MAX_TEXT_LENGTH),
    designId,
    createdAt: serverTimestamp(),
  });
}

/** โคมพิเศษของประธาน — เนื้อหาคงที่ ใช้จากหน้า /admin เท่านั้น */
export async function submitChairmanLantern(): Promise<void> {
  await addDoc(lanternsRef(), {
    text: CHAIRMAN_EVENT_TEXT,
    subtitle: CHAIRMAN_NAME_TEXT,
    designId: CHAIRMAN_DESIGN_ID,
    variant: "chairman",
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
export function listenForNewLanterns(onNew: (lantern: LanternDoc) => void): () => void {
  const q = query(
    lanternsRef(),
    where("createdAt", ">", Timestamp.now()),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(q, (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === "added") onNew(toLantern(change.doc));
    }
  });
}
