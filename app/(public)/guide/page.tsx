import Link from "next/link"
import type { Metadata } from "next"
import { GUIDES, GUIDE_GROUPS } from "@/lib/guides"
import { Doc, DocHeader } from "@/components/landing/Prose"

export const metadata: Metadata = {
  title: "Guides",
  description:
    "How to use every part of Intaglio, written for someone with no printing background.",
}

export default function GuideIndex() {
  return (
    <Doc className="max-w-4xl">
      <DocHeader
        eyebrow="Guides"
        title="How to use it"
        lede="One page per screen. What it is for, who reaches for it, and the steps to do the everyday jobs. No printing background assumed anywhere."
      />

      <div className="mt-12 space-y-14">
        {GUIDE_GROUPS.map((group) => {
          const guides = GUIDES.filter((g) => g.group === group)
          if (guides.length === 0) return null
          return (
            <section key={group}>
              <h2 className="text-[length:calc(var(--base)*0.78)] font-semibold uppercase tracking-[0.12em] text-accent">
                {group}
              </h2>
              <ul className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/guide/${g.slug}`}
                      className="group block h-full border-t border-steel-200 pt-4 transition-colors hover:border-accent"
                    >
                      <h3 className="font-semibold text-ink-900 group-hover:text-accent">
                        {g.title}
                      </h3>
                      <p className="mt-1.5 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
                        {g.summary}
                      </p>
                      <p className="mt-2 text-[length:calc(var(--base)*0.8)] uppercase tracking-wide text-steel-400">
                        {g.who}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Doc>
  )
}
