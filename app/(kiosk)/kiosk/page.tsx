import Link from "next/link";

export default function KioskPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-2">No runs active</h1>
        <p className="text-muted-foreground">Tap below to start the next run on this machine.</p>
      </div>
      <Link href="/kiosk/run">
        <button className="flex h-[var(--tap)] items-center justify-center rounded-lg bg-primary px-12 text-[length:var(--base)] font-semibold text-primary-foreground shadow-sm">
          Start next run
        </button>
      </Link>
    </div>
  );
}
