import Link from "next/link"
import type { Metadata } from "next"
import { getSessionProfile, landingFor, roleLabel } from "@/lib/auth"
import { Mark } from "@/components/brand/Logo"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { Section, Tile, Step, CTA } from "@/components/landing/Pieces"
import { Motion } from "@/components/landing/Motion"

export const metadata: Metadata = {
  title: "Intaglio — the memory of your printing press",
  description:
    "Intaglio records how every reel was printed and hands it back to the next shift before they start. A short plain-English guide.",
}

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#inside", label: "What's inside" },
  { href: "#people", label: "Who uses it" },
  { href: "#words", label: "Glossary" },
]

/** The eight print stations, in press order, in their real ink colours. */
const STATIONS = [
  { n: 1, name: "Cyan", ink: "var(--stn-cyan)" },
  { n: 2, name: "Magenta", ink: "var(--stn-magenta)" },
  { n: 3, name: "Yellow", ink: "var(--stn-yellow)" },
  { n: 4, name: "Black", ink: "var(--stn-black)" },
  { n: 5, name: "Ground", ink: "var(--stn-ground)" },
  { n: 6, name: "Self 1", ink: "var(--stn-self1)" },
  { n: 7, name: "Self 2", ink: "var(--stn-self2)" },
  { n: 8, name: "White", ink: "var(--stn-white)" },
]

const WORDS: [string, string][] = [
  ["Cylinder", "An engraved metal roller that prints one colour. Expensive, and it wears out."],
  ["Station", "One position on the press. Eight of them, each holding one cylinder."],
  ["Run", "One session of printing one job on one machine, from start to stop."],
  ["Substrate", "The plastic film being printed on. Different batches behave differently."],
  ["Viscosity", "How runny the ink is, timed with a small cup. Too thick and the colour goes blotchy."],
  ["Registration", "How well the eight colours line up. Out by a hair and the print looks blurred."],
  ["Waste", "Film printed but not good enough to sell. The number everyone is judged on."],
  ["Re-engrave", "Stripping a worn cylinder and cutting the design again. Its wear starts from zero."],
]

/** A press, drawn at a glance: film in, eight inked stations, printed reel out. */
function Press() {
  return (
    <figure className="mt-14 rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-5">
      <div className="flex items-stretch gap-3">
        <div className="hidden w-14 shrink-0 flex-col justify-center border-r border-dashed border-steel-200 pr-3 text-right sm:flex">
          <span className="text-[length:calc(var(--base)*0.7)] uppercase tracking-wide text-steel-400">
            Film in
          </span>
        </div>

        <ol className="grid min-w-0 flex-1 grid-cols-4 gap-2 lg:grid-cols-8">
          {STATIONS.map((s) => (
            <li
              key={s.n}
              data-reveal="cell"
              className="rounded-[var(--radius)] bg-paper-100 p-2"
            >
              <span
                aria-hidden="true"
                style={{ backgroundColor: s.ink }}
                className="block h-1.5 rounded-full ring-1 ring-inset ring-black/10"
              />
              <span
                data-numeric=""
                className="mt-2 block text-[length:calc(var(--base)*0.7)] text-steel-400"
              >
                0{s.n}
              </span>
              <span className="block truncate text-[length:calc(var(--base)*0.82)] text-ink-900">
                {s.name}
              </span>
            </li>
          ))}
        </ol>

        <div className="hidden w-14 shrink-0 flex-col justify-center border-l border-dashed border-steel-200 pl-3 sm:flex">
          <span className="text-[length:calc(var(--base)*0.7)] uppercase tracking-wide text-steel-400">
            Reel out
          </span>
        </div>
      </div>
      <figcaption
        data-reveal="hero"
        className="mt-4 border-t border-steel-200 pt-3 text-[length:calc(var(--base)*0.9)] leading-relaxed text-ink-600"
      >
        A gravure press is a very precise stamp machine. Plastic film races
        through it at three metres a second, picking up one colour at each of
        eight engraved rollers. Intaglio records the settings behind every one of
        those eight.
      </figcaption>
    </figure>
  )
}

export default async function LandingPage() {
  const profile = await getSessionProfile()
  const home = profile ? landingFor(profile.role) : "/login"
  const cta = profile ? "Open the app" : "Sign in"

  return (
    <div data-shell="desktop" className="reveal-ready min-h-screen bg-paper-100">
      {/* Without JS the entrance never runs, so the hidden state is undone. */}
      <noscript>
        <style>{`.reveal-ready [data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <Motion />

      {/* Header ---------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-steel-200 bg-paper-000/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-6">
          <Link
            href="/"
            aria-label="Intaglio home"
            className="flex shrink-0 items-center gap-2.5"
          >
            <Mark size={30} />
            <span className="text-[length:calc(var(--base)*1.15)] font-semibold tracking-tight text-ink-900">
              Intaglio
            </span>
          </Link>

          <nav aria-label="Page sections" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="rounded-[var(--radius)] px-3 py-2 text-[length:calc(var(--base)*0.9)] text-ink-600 transition-colors hover:bg-paper-100 hover:text-ink-900"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            <CTA href={home} primary>
              {cta}
            </CTA>
          </div>
        </div>

        {/* Read progress. A hairline, in the accent, and the only moving part
            of the chrome. */}
        <div
          data-scroll-progress=""
          aria-hidden="true"
          className="h-px origin-left scale-x-0 bg-accent"
        />
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        {/* Hero ---------------------------------------------------------- */}
        <section className="pt-16 sm:pt-24">
          <p
            data-reveal="hero"
            className="flex items-center gap-2 text-[length:calc(var(--base)*0.78)] font-semibold uppercase tracking-[0.12em] text-accent"
          >
            <span aria-hidden="true" className="h-px w-6 bg-accent" />
            Gravure print traceability
          </p>
          <h1
            data-reveal="hero"
            className="mt-4 max-w-3xl text-[length:clamp(2.1rem,5.5vw,3.6rem)] font-semibold leading-[1.06] tracking-tight text-ink-900"
          >
            Every reel remembers how it was printed.
          </h1>
          <p
            data-reveal="hero"
            className="mt-6 max-w-xl text-[length:calc(var(--base)*1.2)] leading-relaxed text-ink-600"
          >
            The settings, the materials, the problems and the fixes — captured at
            the machine, and handed to the next shift before they start the same
            job again.
          </p>

          <div data-reveal="hero" className="mt-9 flex flex-wrap items-center gap-3">
            <CTA href={home} primary>
              {profile
                ? `Go to my ${roleLabel(profile.role).toLowerCase()} view`
                : "Sign in"}
            </CTA>
            <CTA href="#how">See how it works</CTA>
            {profile && (
              <span className="text-[length:calc(var(--base)*0.88)] text-steel-400">
                Signed in as {roleLabel(profile.role)}
              </span>
            )}
          </div>

          <Press />
        </section>

        {/* Problem ------------------------------------------------------- */}
        <Section
          eyebrow="Why it exists"
          title="A press forgets. This doesn't."
          lede="Factories already write all of this down. The problem was never the writing down — it was finding it again three weeks later."
        >
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            <div data-reveal="block">
              <h3 className="font-semibold text-ink-900">Knowledge leaves at 6am</h3>
              <p className="mt-1.5 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
                The night shift solves a problem. The fix goes home with them.
                Now it is on the screen before the next run starts.
              </p>
            </div>
            <div data-reveal="block">
              <h3 className="font-semibold text-ink-900">Rollers wear invisibly</h3>
              <p className="mt-1.5 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
                Every metre printed is counted against each cylinder, so worn
                ones are flagged before they ruin a job, not after.
              </p>
            </div>
            <div data-reveal="block">
              <h3 className="font-semibold text-ink-900">Complaints arrive late</h3>
              <p className="mt-1.5 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
                A customer questions a delivery from four months ago. Search the
                batch code and the full record of that reel opens.
              </p>
            </div>
          </div>
        </Section>

        {/* Loop ---------------------------------------------------------- */}
        <Section
          id="how"
          eyebrow="How it works"
          title="Four steps, then it repeats"
          lede="Steps 1 to 3 are typing. Step 4 is the reason the typing is worth doing."
        >
          <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <Step n={1} title="Plan the job">
              The office sets up the customer, the design, the film and which
              engraved roller prints each colour.
            </Step>
            <Step n={2} title="Brief the operator">
              Before printing starts, the tablet shows the best previous run of
              this job and every problem worth watching for.
            </Step>
            <Step n={3} title="Record the run">
              Speed, ink thickness, tension and waste are entered at the machine
              as it runs — on a tablet built for gloved hands.
            </Step>
            <Step n={4} title="Recall it later">
              Next time the job runs, that record becomes the briefing. The
              factory keeps getting better at jobs it has done before.
            </Step>
          </ol>
        </Section>

        {/* Inside -------------------------------------------------------- */}
        <Section
          id="inside"
          eyebrow="What's inside"
          title="Nine things it does"
          lede="An office side on a desktop, and a stripped-back tablet at the machine. Same data, two very different screens."
        >
          <div className="grid gap-x-10 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
            <Tile name="Jobs" where="Office">
              Every product you print, with its design, its film and its eight
              colours. The file everything else hangs off.
            </Tile>
            <Tile name="Pre-run briefing" where="Both">
              One page an operator reads before starting: last time&rsquo;s best
              settings, open warnings, and what went wrong before. Prints to A4.
            </Tile>
            <Tile name="Run sheet" where="Tablet">
              The live record of a print run — all eight stations on one screen,
              saving as you type, and working with the wifi down.
            </Tile>
            <Tile name="Cylinders" where="Office">
              Where each engraved roller is, how far it has printed, and which
              ones are close to needing re-engraving.
            </Tile>
            <Tile name="Issues" where="Both">
              Problems logged with a photo in seconds, flagged to the next run,
              and cleared once someone has acted on them.
            </Tile>
            <Tile name="Shift board" where="Office">
              What is on every machine right now, who is running it, and how the
              waste is tracking against target.
            </Tile>
            <Tile name="Reports" where="Office">
              Waste by job, by machine and by shift, so the arguments are about
              numbers rather than memory.
            </Tile>
            <Tile name="Search" where="Office">
              One box. A batch code, a job number, a customer or a cylinder —
              type it and go straight there.
            </Tile>
            <Tile name="Settings" where="Office">
              Machines, inks, films, customers and people. Set up once, then
              chosen from a list instead of retyped.
            </Tile>
          </div>
        </Section>

        {/* People -------------------------------------------------------- */}
        <Section
          id="people"
          eyebrow="Who uses it"
          title="Six roles, each shown only their own work"
          lede="Signing in decides what opens. Nobody has to learn a screen that isn't theirs."
        >
          <div
            data-reveal="block"
            className="overflow-x-auto rounded-[var(--radius)] border border-steel-200 bg-paper-000"
          >
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="border-b border-steel-200 text-[length:calc(var(--base)*0.75)] uppercase tracking-wide text-steel-400">
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Opens on</th>
                  <th className="px-4 py-3 font-semibold">What they do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-200 text-[length:calc(var(--base)*0.95)]">
                {[
                  ["Operator", "The tablet", "Records the run at the machine and logs problems"],
                  ["Supervisor", "Shift board", "Watches every machine and corrects the record"],
                  ["Planner", "Job files", "Sets up products, designs and cylinders"],
                  ["QC", "Dashboard", "Checks quality and answers customer complaints"],
                  ["Admin", "Dashboard", "Manages people, machines and reference data"],
                  ["Viewer", "Dashboard", "Reads everything, changes nothing"],
                ].map(([role, opens, does]) => (
                  <tr key={role} className="transition-colors hover:bg-paper-100">
                    <td className="px-4 py-3 font-semibold text-ink-900">{role}</td>
                    <td className="px-4 py-3 text-ink-600">{opens}</td>
                    <td className="px-4 py-3 text-ink-600">{does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-reveal="block"
            className="mt-5 max-w-2xl text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600"
          >
            At the machine the tablet stays signed in all shift, and operators
            identify themselves with a short code — so nobody types a password
            with ink on their gloves.
          </p>
        </Section>

        {/* Glossary ------------------------------------------------------ */}
        <Section
          id="words"
          eyebrow="Glossary"
          title="Eight words the floor uses"
          lede="Enough to follow any screen in the app."
        >
          <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {WORDS.map(([word, meaning]) => (
              <div key={word} data-reveal="block" className="border-t border-steel-200 pt-3">
                <dt className="font-semibold text-ink-900">{word}</dt>
                <dd className="mt-1 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
                  {meaning}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* Close --------------------------------------------------------- */}
        <section
          data-reveal="block"
          className="mt-16 overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-ink-900 px-8 py-14 text-center"
        >
          <Mark size={40} className="mx-auto" />
          <h2 className="mt-6 text-[length:clamp(1.4rem,3vw,2rem)] font-semibold tracking-tight text-paper-000">
            {profile ? "Everything is where you left it." : "Ready when you are."}
          </h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-steel-400">
            {profile
              ? "Pick up your work from where the app opens for your role."
              : "Sign in with the account your supervisor set up for you."}
          </p>
          <Link
            href={home}
            className="mt-8 inline-flex h-[var(--tap)] items-center justify-center rounded-[var(--radius)] bg-paper-000 px-7 font-semibold text-ink-900 transition-colors hover:bg-accent hover:text-accent-fg"
          >
            {cta}
          </Link>
        </section>
      </main>

      <footer className="border-t border-steel-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-[length:calc(var(--base)*0.86)] text-steel-400 sm:px-6">
          <span className="flex items-center gap-2.5">
            <Mark size={20} />
            Intaglio — gravure print traceability
          </span>
          <div className="flex items-center gap-4">
            <ThemeToggle className="sm:hidden" />
            <Link href={home} className="transition-colors hover:text-ink-900">
              {cta}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
