import type { Metadata } from "next"
import {
  Doc, DocHeader, H2, P, Ul, Li, Callout, DraftNotice, SeeAlso,
} from "@/components/landing/Prose"

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The rules for using Intaglio: who may use it, what is expected of you, and what the records mean.",
}

const UPDATED = "23 August 2026"

export default function TermsPage() {
  return (
    <Doc>
      <DocHeader
        eyebrow="Policy"
        title="Terms of service"
        lede="Intaglio is an internal production system, not a public service. These terms set out who may use it, what is expected of the people who do, and what the records it holds are taken to mean."
        meta={`Last updated ${UPDATED}`}
      />

      <div className="mt-9">
        <DraftNotice>
          <P>
            These terms describe how the system is intended to be used and are
            written to be readable by the people who use it. They are not legal
            advice and are not complete until someone responsible adds:
          </P>
          <Ul>
            <Li>The legal entity that provides this system, and its address.</Li>
            <Li>Which country&rsquo;s law governs them, and where disputes are settled.</Li>
            <Li>
              How they sit alongside employment contracts and any agreements with
              customers whose work is recorded here.
            </Li>
            <Li>Liability and warranty terms appropriate to your jurisdiction.</Li>
          </Ul>
          <P>Have them reviewed before you rely on them.</P>
        </DraftNotice>
      </div>

      <H2 id="who">Who may use it</H2>
      <P>
        Only people given an account by the organisation that operates this
        system. Accounts are issued for work, and each one belongs to one named
        person. There is no public sign-up, and access ends when your role ends.
      </P>

      <H2 id="account">Your account</H2>
      <Ul>
        <Li>
          Keep your password and your short code to yourself. Everything recorded
          while you are signed in is attributed to you.
        </Li>
        <Li>
          Do not sign in as somebody else, or let somebody else use your account —
          not as a favour, and not to save time at a shift change. It makes the
          record wrong in the one way that matters.
        </Li>
        <Li>
          On a shared machine tablet, lock it when you finish so the next person
          is not recorded as you.
        </Li>
        <Li>
          Tell an administrator immediately if you think someone else knows your
          code.
        </Li>
      </Ul>

      <H2 id="records">What the records mean</H2>
      <P>
        This system exists to say truthfully what happened on a press. Entries
        may be used to answer a customer&rsquo;s question about a delivery, to
        support a quality investigation, or to satisfy an audit — sometimes long
        after the shift they describe.
      </P>
      <Ul>
        <Li>
          Record what you actually observed and what you actually did. An
          estimate entered as a measurement is worse than a blank.
        </Li>
        <Li>
          Enter it as it happens. Detail written up at the end of a shift is
          detail already half-forgotten.
        </Li>
        <Li>
          If you find a mistake in an earlier record, say so rather than quietly
          adjusting figures to be consistent.
        </Li>
        <Li>
          Do not enter anything into a production record that does not belong in
          one — no personal remarks about colleagues, and no photographs taken
          for any reason other than showing a printing fault.
        </Li>
      </Ul>
      <Callout tone="warn" title="Falsifying a record is a serious matter">
        <P>
          Waste figures are calculated from what you enter and cannot be typed in
          directly, precisely so that nobody is tempted. A record that has been
          made to look better than reality can put a customer&rsquo;s packaging,
          and their product, at risk.
        </P>
      </Callout>

      <H2 id="fair">Reasonable use</H2>
      <Ul>
        <Li>Use it for the organisation&rsquo;s work, and not for anything else.</Li>
        <Li>
          Do not attempt to reach data your role does not open, or to work around
          the permissions. If you can see something you believe you should not,
          report it.
        </Li>
        <Li>
          Do not copy production data out of the system except where your job
          requires it and you are permitted to.
        </Li>
        <Li>
          Do not attempt to disrupt, overload, or probe the system. Report
          anything that looks like a weakness instead of testing it.
        </Li>
      </Ul>

      <H2 id="availability">Availability</H2>
      <P>
        The system is maintained on a working basis, not to a guaranteed level of
        uptime unless your organisation has agreed one separately. It will be
        unavailable at times for maintenance.
      </P>
      <P>
        Machine tablets keep working without a network: entries are held on the
        device and sent when the connection returns. That covers a dropped
        connection, not a lost device — a tablet that fails before its entries
        are sent takes them with it.
      </P>

      <H2 id="ownership">Ownership</H2>
      <P>
        Production records, customer information, designs and photographs belong
        to the organisation that operates this system and, where relevant, to its
        customers. Having an account does not give you rights over them.
      </P>

      <H2 id="ending">Ending access</H2>
      <P>
        Access can be withdrawn at any time — typically when someone changes role
        or leaves. Accounts are deactivated rather than deleted, so that the
        records they created remain attributable. A deactivated account cannot
        sign in, and the check happens on every request rather than whenever a
        session happens to expire.
      </P>

      <H2 id="changes">Changes</H2>
      <P>
        These terms may be updated. Where a change affects what is expected of
        the people using the system, they should be told directly rather than
        left to notice the date at the top of this page.
      </P>

      <SeeAlso
        links={[
          { href: "/privacy", label: "Privacy policy" },
          { href: "/cookies", label: "Cookie policy" },
          { href: "/guide/run-sheet", label: "The run sheet" },
        ]}
      />
    </Doc>
  )
}
