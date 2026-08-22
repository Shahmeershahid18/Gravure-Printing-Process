export default function KioskLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full flex-col bg-background" data-shell="kiosk">
      <header className="flex h-[var(--row-h)] items-center justify-between border-b border-border bg-card px-[var(--gap)]">
        <h2 className="text-[length:var(--base)] font-semibold text-foreground">Machine Home</h2>
        <div className="text-sm font-medium text-muted-foreground">Operator: None</div>
      </header>
      <main className="flex-1 overflow-y-auto p-[var(--gap)]">
        {children}
      </main>
    </div>
  );
}
