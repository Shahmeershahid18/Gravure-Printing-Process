export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="border border-border rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Runs Today</h3>
          <p className="text-3xl font-semibold">12</p>
        </div>
        <div className="border border-border rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg Waste</h3>
          <p className="text-3xl font-semibold text-signal-ok">3.2%</p>
        </div>
        <div className="border border-border rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Cylinders Near Limit</h3>
          <p className="text-3xl font-semibold text-signal-warn">4</p>
        </div>
      </div>
    </div>
  );
}
