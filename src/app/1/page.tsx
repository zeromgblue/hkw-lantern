import { SpaceBackground } from "@/components/SpaceBackground";
import { ChairmanCard } from "@/components/ChairmanCard";

export default function AdminChairman1Page() {
  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="fixed inset-0">
        <SpaceBackground />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">สำหรับประธานในพิธี</p>
        <h1
          className="mt-2 text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display), sans-serif", textShadow: "0 0 24px rgba(255,216,77,0.6)" }}
        >
          โคมประธานเปิดงาน
        </h1>

        <div className="mt-6 w-full">
          <ChairmanCard nameText="ดร. สุภชัย จันปุ่ม" />
        </div>
      </div>
    </main>
  );
}
