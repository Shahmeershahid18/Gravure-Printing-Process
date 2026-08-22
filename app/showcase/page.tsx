import { StationRail } from "@/components/run/StationRail";
import { Button } from "@/components/ui/button";

export default function ShowcasePage() {
  return (
    <div className="p-8 flex flex-col gap-12 bg-background min-h-screen font-ui">
      <div>
        <h1 className="text-2xl font-semibold mb-6">Design System Showcase</h1>
        <p className="text-muted-foreground mb-4">
          This page renders components to verify that tokens and the dual-shell density variables (`--base`, `--row-h`, `--tap`) apply correctly. 
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">1. Station Rail</h2>
        <div className="flex gap-8 items-start">
          <div>
            <h3 className="mb-2 text-sm text-muted-foreground">Desktop Density (Default)</h3>
            <div data-shell="desktop" className="bg-paper-100 p-4 rounded border border-border">
              <StationRail />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm text-muted-foreground">Kiosk Density</h3>
            <div data-shell="kiosk" className="bg-paper-100 p-4 rounded border border-border">
              <StationRail />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">2. Buttons & Typography</h2>
        <div className="flex gap-8 items-start">
          <div data-shell="desktop" className="flex flex-col gap-4 bg-paper-100 p-4 rounded border border-border">
            <h3 className="text-[length:var(--base)] font-semibold text-foreground">Desktop Buttons</h3>
            <Button className="h-[var(--tap)] text-[length:var(--base)]">Primary Action</Button>
            <Button variant="outline" className="h-[var(--tap)] text-[length:var(--base)]">Secondary Action</Button>
            <div className="font-data text-[length:var(--base)] text-ink-600 mt-2">Data Font: 1,000,000 m</div>
          </div>

          <div data-shell="kiosk" className="flex flex-col gap-4 bg-paper-100 p-4 rounded border border-border">
            <h3 className="text-[length:var(--base)] font-semibold text-foreground">Kiosk Buttons</h3>
            <Button className="h-[var(--tap)] text-[length:var(--base)]">Primary Action</Button>
            <Button variant="outline" className="h-[var(--tap)] text-[length:var(--base)]">Secondary Action</Button>
            <div className="font-data text-[length:var(--base)] text-ink-600 mt-2">Data Font: 1,000,000 m</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">3. Colors</h2>
        <div className="flex gap-4 mb-4">
          <div className="w-16 h-16 bg-ink-900 rounded border flex items-center justify-center text-white text-xs">ink-900</div>
          <div className="w-16 h-16 bg-ink-600 rounded border flex items-center justify-center text-white text-xs">ink-600</div>
          <div className="w-16 h-16 bg-steel-400 rounded border flex items-center justify-center text-white text-xs">steel-400</div>
          <div className="w-16 h-16 bg-steel-200 rounded border flex items-center justify-center text-ink-900 text-xs">steel-200</div>
          <div className="w-16 h-16 bg-paper-100 rounded border flex items-center justify-center text-ink-900 text-xs">paper-100</div>
          <div className="w-16 h-16 bg-paper-000 rounded border shadow flex items-center justify-center text-ink-900 text-xs">paper-000</div>
        </div>
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-signal-ok rounded border flex items-center justify-center text-white text-xs">OK</div>
          <div className="w-16 h-16 bg-signal-warn rounded border flex items-center justify-center text-white text-xs">WARN</div>
          <div className="w-16 h-16 bg-signal-critical rounded border flex items-center justify-center text-white text-xs">CRIT</div>
          <div className="w-16 h-16 bg-signal-info rounded border flex items-center justify-center text-white text-xs">INFO</div>
        </div>
      </section>
    </div>
  );
}
