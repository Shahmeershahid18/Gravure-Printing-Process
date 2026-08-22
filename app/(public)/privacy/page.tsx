import type { Metadata } from "next"
import Link from "next/link"
import {
  Doc, DocHeader, H2, P, Ul, Li, Definitions, Callout, DraftNotice, SeeAlso,
} from "@/components/landing/Prose"

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Intaglio records about people, why, and for how long.",
}

const UPDATED = "23 August 2026"

export default function PrivacyPage() {
  return (
    <Doc>
      <DocHeader
        eyebrow="Policy"
        title="Privacy policy"
        lede="Intaglio is a production record for a printing factory. Most of what it stores is about machines and materials — but some of it is about people, and this page says exactly which parts and why."
        meta={`Last updated ${UPDATED}`}
      />

      <div className="mt-9">
        <DraftNotice>
          <P>
            This policy describes what the software actually does, and it is
            accurate about that. It is not legal advice, and it is not finished
            until somebody responsible fills in the parts only your organisation
            knows:
          </P>
          <Ul>
            <Li>The legal entity that operates this system, and its address.</Li>
            <Li>A contact point for privacy questions and data requests.</Li>
            <Li>
              The hosting and database providers you use, where they store data,
              and your agreement with them.
            </Li>
            <Li>How long you keep production records, and what your customer contracts require.</Li>
            <Li>The law that applies where your staff work, and where your customers are.</Li>
          </Ul>
          <P>
            Have it reviewed by someone qualified before you rely on it. If your
            staff are in the EU or UK, note that a workplace system recording
            individual output has obligations this page does not attempt to
            cover on its own.
          </P>
        </DraftNotice>
      </div>

      <H2 id="who">Who this covers</H2>
      <P>
        Everyone with an account: operators at the machines, supervisors,
        planners, quality staff and administrators. It also covers the small
        amount of personal information that appears inside production records —
        principally, who was running a machine when something was recorded.
      </P>
      <P>
        It does not cover the general public. There is nothing here to sign up
        for, and no account can be created by anyone outside the organisation.
      </P>

      <H2 id="what">What is recorded about a person</H2>
      <Definitions
        items={[
          ["Name", "So colleagues can tell who did what, in words they recognise."],
          ["Work email address", "Used to sign in, and nothing else. It is never used for marketing."],
          ["Employee number", "Optional. Ties an account to existing personnel records."],
          ["Role", "Decides which screens open and what the system will let that person change."],
          ["Assigned machine", "Which press someone normally works on."],
          ["Short code", "A four-digit code used to identify yourself at a machine tablet. It is stored only as an irreversible cryptographic hash — it cannot be read back, by anyone, including administrators."],
          ["Activity in records", "Which account created or changed a production record, and when."],
          ["Photographs", "Pictures taken to show a printing fault. These are pictures of printed film, not of people — but a photograph taken on a factory floor can capture someone incidentally."],
        ]}
      />
      <P>
        There is no tracking of location, no monitoring of activity outside the
        system, and no analytics or advertising technology of any kind. Nothing
        on these pages is loaded from a third-party service.
      </P>

      <H2 id="why">Why it is recorded</H2>
      <Ul>
        <Li>
          <strong className="text-ink-900">To run the factory.</strong> A
          production record is only useful if it says who was there. When a
          customer questions a delivery, the answer often depends on knowing who
          to ask.
        </Li>
        <Li>
          <strong className="text-ink-900">To control access.</strong> Roles
          exist so that an operator cannot accidentally change a customer record
          and a viewer cannot change anything at all.
        </Li>
        <Li>
          <strong className="text-ink-900">To meet obligations to customers.</strong>{" "}
          Food and pharmaceutical packaging buyers routinely require a
          traceable record of how their material was produced.
        </Li>
      </Ul>
      <Callout tone="warn" title="What it is not for">
        <P>
          This system records output, and output can be attributed to
          individuals. Using it to rank or discipline staff is a decision your
          organisation makes, not something the software assumes — and in many
          places it carries obligations to tell people first. Decide that
          deliberately, and say so in writing.
        </P>
      </Callout>

      <H2 id="access">Who can see it</H2>
      <P>
        Access is enforced by the database itself, not merely hidden in the
        interface. A request for data a role may not read returns nothing, even
        if someone bypasses the screens entirely.
      </P>
      <Ul>
        <Li>Everyone signed in can see who recorded a production entry.</Li>
        <Li>Supervisors and administrators can see the account list.</Li>
        <Li>Only administrators can change roles or set a person&rsquo;s short code.</Li>
        <Li>Nobody, at any level, can read a short code back. Only replace it.</Li>
        <Li>Nothing is readable without signing in.</Li>
      </Ul>

      <H2 id="sharing">Sharing</H2>
      <P>
        Personal information is not sold, rented, or shared for anyone
        else&rsquo;s purposes. It is handled by the hosting and database
        providers that run this system on the organisation&rsquo;s behalf, which
        must be listed above before this page is published. Production records
        may be shown to a customer when they ask about their own order — those
        records can include the name of the person who ran the job.
      </P>

      <H2 id="keeping">How long it is kept</H2>
      <P>
        Production records are kept for as long as the organisation needs to
        answer questions about what it delivered, which is usually driven by
        customer contracts rather than by choice. Accounts are deactivated
        rather than deleted when someone leaves, because deleting an account
        would orphan the records it created and damage the traceability the
        system exists to provide. A deactivated account cannot sign in.
      </P>

      <H2 id="rights">Your rights</H2>
      <P>
        Depending on where you work, you may have the right to ask what is held
        about you, to have mistakes corrected, to object to certain uses, and in
        some cases to have information erased. Ask the contact named at the top
        of this page.
      </P>
      <P>
        Erasure has a limit worth stating honestly: a production record is
        evidence of what was manufactured, and there may be a legal or
        contractual obligation to keep it. Where that applies, your name may be
        removed from a record while the record itself remains.
      </P>

      <H2 id="security">Security</H2>
      <Ul>
        <Li>All traffic is encrypted in transit.</Li>
        <Li>Passwords and short codes are stored only as irreversible hashes.</Li>
        <Li>Permissions are enforced in the database, so the rules hold even outside the interface.</Li>
        <Li>Deactivating an account takes effect on the account&rsquo;s next request, not whenever its session happens to expire.</Li>
        <Li>The pages load nothing from third-party servers, so nobody else can observe you using it.</Li>
      </Ul>
      <P>
        No system is perfect. If you believe something is wrong, report it to the
        contact above rather than testing it further.
      </P>

      <H2 id="changes">Changes</H2>
      <P>
        If this policy changes in a way that affects what is recorded about you
        or who can see it, the people using the system should be told directly
        rather than left to notice the date at the top of this page.
      </P>

      <SeeAlso
        links={[
          { href: "/cookies", label: "Cookie policy" },
          { href: "/terms", label: "Terms of service" },
          { href: "/guide/signing-in", label: "Signing in at the machine" },
        ]}
      />

      <p className="mt-10 text-[length:calc(var(--base)*0.85)] text-steel-400">
        Questions about this page belong with whoever administers the system
        where you work. <Link href="/guide" className="underline underline-offset-4 hover:text-ink-900">The guides</Link>{" "}
        explain what the software does day to day.
      </p>
    </Doc>
  )
}
