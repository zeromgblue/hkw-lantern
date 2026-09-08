import type { Metadata, Viewport } from "next";
import { Chonburi, Kanit, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
});

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

// ฟอนต์ไทยลายป้ายดั้งเดิม ตัวหนา ใช้กับข้อความในจดหมายโคมประธาน
const chonburi = Chonburi({
  subsets: ["thai", "latin"],
  weight: "400",
  variable: "--font-letter",
});

export const metadata: Metadata = {
  title: "โคมลอยจักรวาล",
  description: "ปล่อยโคมไฟพร้อมคำอธิษฐานของคุณสู่ห้วงอวกาศ",
};

export const viewport: Viewport = {
  themeColor: "#030412",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${notoThai.variable} ${kanit.variable} ${chonburi.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
