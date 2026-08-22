export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full" data-shell="desktop">
      <aside className="w-64 border-r border-border bg-sidebar p-4">
        <h2 className="mb-8 text-xl font-semibold">GravureTrace</h2>
        <nav className="flex flex-col gap-2">
          <a href="/" className="text-muted-foreground hover:text-foreground">Dashboard</a>
          <a href="/jobs" className="text-muted-foreground hover:text-foreground">Jobs</a>
          <a href="/cylinders" className="text-muted-foreground hover:text-foreground">Cylinders</a>
        </nav>
      </aside>
      <main className="flex-1 bg-background p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
