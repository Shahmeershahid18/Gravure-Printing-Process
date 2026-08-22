import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { GUIDES, getGuide } from "@/lib/guides"
import {
  Doc, DocHeader, H2, P, Steps, Definitions, Callout, SeeAlso,
} from "@/components/landing/Prose"

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return { title: "Guide" }
  return { title: guide.title, description: guide.summary }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  const related = (guide.related ?? [])
    .map((s) => getGuide(s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))

  return (
    <Doc>
      <nav aria-label="Breadcrumb" className="mb-7 text-[length:calc(var(--base)*0.88)]">
        <Link href="/guide" className="text-ink-600 transition-colors hover:text-ink-900">
          ← All guides
        </Link>
      </nav>

      <DocHeader
        eyebrow={guide.group}
        title={guide.title}
        lede={guide.question}
        meta={`For ${guide.who.toLowerCase()}`}
      />

      <article>
        {guide.sections.map((s, i) => {
          switch (s.kind) {
            case "text":
              return <P key={i}>{s.body}</P>
            case "steps":
              return (
                <div key={i}>
                  {s.title && <H2>{s.title}</H2>}
                  <Steps items={s.items} />
                </div>
              )
            case "points":
              return (
                <div key={i}>
                  {s.title && <H2>{s.title}</H2>}
                  <Definitions items={s.items} />
                </div>
              )
            case "note":
              return (
                <Callout key={i} tone={s.tone} title={s.title}>
                  {s.body}
                </Callout>
              )
          }
        })}
      </article>

      <SeeAlso
        links={related.map((g) => ({ href: `/guide/${g.slug}`, label: g.title }))}
      />
    </Doc>
  )
}
