export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">Login</h1>
        <form className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded border border-border bg-background p-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="admin@gravuretrace.local"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded border border-border bg-background p-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <button className="mt-2 rounded bg-primary p-2 text-primary-foreground font-semibold">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
