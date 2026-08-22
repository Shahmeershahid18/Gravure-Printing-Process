import type { Metadata } from "next"
import {
  Doc, DocHeader, H2, P, Ul, Li, Callout, DraftNotice, SeeAlso,
} from "@/components/landing/Prose"

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "The four things Intaglio stores in your browser, what each one does, and why none of them track you.",
}

const UPDATED = "23 August 2026"

/** Every browser-stored value the product actually sets. Keep this honest. */
const STORED: {
  name: string
  kind: string
  purpose: string
  life: string
  essential: boolean
}[] = [
  {
    name: "Session",
    kind: "Cookie, set by the server and unreadable by scripts",
    purpose:
      "Keeps you signed in from one page to the next. Without it every click would ask for your password again.",
    life: "Until you sign out, or the session expires",
    essential: true,
  },
  {
    name: "Operator at this machine",
    kind: "Cookie, set by the server and unreadable by scripts",
    purpose:
      "On a machine tablet, records which operator identified themselves with their short code, so entries are attributed to the right person.",
    life: "30 minutes of inactivity, then it clears itself",
    essential: true,
  },
  {
    name: "Operator name for display",
    kind: "Cookie, readable by the page",
    purpose:
      "Shows the current operator's name in the bar at the top of the tablet. It holds a name and nothing else.",
    life: "30 minutes of inactivity",
    essential: true,
  },
  {
    name: "Theme choice",
    kind: "Local storage, never sent to the server",
    purpose:
      "Remembers whether you chose light, dark, or to follow your device. It stays in your browser.",
    life: "Until you clear your browser data",
    essential: false,
  },
  {
    name: "Daylight mode",
    kind: "Local storage, never sent to the server",
    purpose:
      "Remembers that a particular tablet sits near a window and needs higher contrast.",
    life: "Until you clear your browser data",
    essential: false,
  },
  {
    name: "Pending entries",
    kind: "Browser database, never sent anywhere except to this system",
    purpose:
      "Holds run entries typed while the machine tablet has no network, so nothing is lost. They are sent and cleared as soon as the connection returns.",
    life: "Until sent, usually seconds",
    essential: true,
  },
]

export default function CookiePolicyPage() {
  return (
    <Doc>
      <DocHeader
        eyebrow="Policy"
        title="Cookie policy"
        lede="Six things are stored in your browser. Three keep you signed in, two remember how you like the screen, and one stops work being lost when the wifi drops. None of them track you."
        meta={`Last updated ${UPDATED}`}
      />

      <div className="mt-9">
        <DraftNotice>
          <P>
            This list is accurate for the software as built. Confirm it still
            matches before publishing, add your organisation&rsquo;s contact
            details, and check whether the law where your staff work requires a
            consent banner. As it stands there is nothing here that consent
            rules normally apply to — but that is a judgement for someone
            qualified to make.
          </P>
        </DraftNotice>
      </div>

      <H2 id="none">What is not here</H2>
      <P>
        It is shorter to say what is absent. There is no advertising, no
        analytics, no social media pixel, no session recording, no
        fingerprinting, and no third-party cookie of any kind. Nothing on these
        pages is loaded from another company&rsquo;s server — the browser is
        instructed to refuse such requests outright, so it is enforced rather
        than promised.
      </P>
      <P>
        Nothing stored in your browser is shared with anyone, and nothing
        follows you to any other website.
      </P>

      <H2 id="list">Everything that is stored</H2>

      <div className="mt-5 overflow-x-auto rounded-[var(--radius)] border border-steel-200 bg-paper-000">
        <table className="w-full min-w-[38rem] text-left">
          <thead>
            <tr className="border-b border-steel-200 text-[length:calc(var(--base)*0.75)] uppercase tracking-wide text-steel-400">
              <th className="px-4 py-3 font-semibold">What</th>
              <th className="px-4 py-3 font-semibold">Why it exists</th>
              <th className="px-4 py-3 font-semibold">How long</th>
              <th className="px-4 py-3 font-semibold">Needed?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-200 text-[length:calc(var(--base)*0.92)]">
            {STORED.map((c) => (
              <tr key={c.name} className="align-top">
                <td className="px-4 py-4">
                  <span className="block font-semibold text-ink-900">{c.name}</span>
                  <span className="mt-1 block text-[length:calc(var(--base)*0.82)] text-steel-400">
                    {c.kind}
                  </span>
                </td>
                <td className="px-4 py-4 leading-relaxed text-ink-600">{c.purpose}</td>
                <td className="px-4 py-4 text-ink-600">{c.life}</td>
                <td className="px-4 py-4">
                  {/* The word carries the meaning, not a colour or a tick. */}
                  <span
                    className={
                      c.essential
                        ? "font-semibold text-ink-900"
                        : "text-ink-600"
                    }
                  >
                    {c.essential ? "Essential" : "Preference"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2 id="control">Turning them off</H2>
      <P>
        Every browser lets you block or clear stored data, usually under
        settings for the individual site.
      </P>
      <Ul>
        <Li>
          Clearing the <strong className="text-ink-900">preference</strong> items
          simply resets the screen to its default appearance.
        </Li>
        <Li>
          Blocking the <strong className="text-ink-900">essential</strong> items
          stops the system working. You will not be able to stay signed in, and a
          machine tablet will not be able to hold entries typed while offline.
        </Li>
      </Ul>
      <Callout tone="warn" title="On a machine tablet, clear with care">
        <P>
          If a tablet has entries waiting to be sent because the network is
          down, clearing its stored data discards that work permanently. Wait
          until the connection is back and the entries have gone through.
        </P>
      </Callout>

      <H2 id="changes">Changes</H2>
      <P>
        If anything is added to this list, this page is updated before the change
        reaches anyone using the system.
      </P>

      <SeeAlso
        links={[
          { href: "/privacy", label: "Privacy policy" },
          { href: "/terms", label: "Terms of service" },
          { href: "/guide/daylight-and-theme", label: "Reading the screen on the floor" },
        ]}
      />
    </Doc>
  )
}
