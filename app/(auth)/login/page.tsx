import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const message = params?.message;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">Login</h1>
        <form className="flex flex-col gap-4">
          
          {message && (
            <div className="rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
              {message}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full rounded border border-border bg-background p-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="admin@gravuretrace.local"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full rounded border border-border bg-background p-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              required
            />
          </div>
          <button formAction={login} className="mt-2 rounded bg-primary p-2 text-primary-foreground font-semibold">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
