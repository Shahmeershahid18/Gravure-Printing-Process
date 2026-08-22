"use client"

import * as React from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * Motion, confined to the public landing page.
 *
 * Plan Section 4.4 rule 8 says motion is nearly absent, and it means it -- on a
 * tablet clamped to a press, animation reads as lag. That rule is about the
 * application. This is the marketing page: a different room, a different
 * reader, and no one is trying to close a run on it. Nothing in this file is
 * imported by the app or kiosk shells, so the rule stays intact where it was
 * written to apply.
 *
 * Three safeguards, because content that animates in is content that can fail
 * to appear:
 *
 *   - prefers-reduced-motion reveals everything at once and binds nothing;
 *   - a <noscript> rule in the page resets the hidden state;
 *   - any throw in here reveals everything and gives up quietly.
 */
export function Motion() {
  React.useEffect(() => {
    const revealAll = () => {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((el) => {
          el.style.opacity = "1"
          el.style.transform = "none"
        })
      document.documentElement.classList.remove("reveal-ready")
      document.body.classList.remove("reveal-ready")
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealAll()
      return
    }

    let ctx: gsap.Context | undefined
    try {
      gsap.registerPlugin(ScrollTrigger)

      ctx = gsap.context(() => {
        // The hero is above the fold, so it plays on load rather than on
        // scroll. Short, and never bouncy: this is a tool, not a product tour.
        const hero = gsap.utils.toArray<HTMLElement>("[data-reveal='hero']")
        if (hero.length) {
          gsap.to(hero, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.07,
          })
        }

        // The eight station cells resolve left to right, the same direction the
        // film travels through the press.
        const cells = gsap.utils.toArray<HTMLElement>("[data-reveal='cell']")
        if (cells.length) {
          gsap.to(cells, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.045,
            delay: 0.25,
          })
        }

        // Everything below the fold arrives as it is scrolled to, in one batch
        // per row so a grid does not ripple item by item.
        ScrollTrigger.batch("[data-reveal='block']", {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.45,
              ease: "power2.out",
              stagger: 0.06,
            }),
        })

        // The accent hairline under the header, tracking read progress.
        const bar = document.querySelector<HTMLElement>("[data-scroll-progress]")
        if (bar) {
          gsap.fromTo(
            bar,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: document.documentElement,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.3,
              },
            }
          )
        }
      })

      // If a trigger never fires -- a very short viewport, a hidden tab on
      // load -- nothing should stay invisible.
      const failsafe = window.setTimeout(() => {
        document
          .querySelectorAll<HTMLElement>("[data-reveal]")
          .forEach((el) => {
            if (getComputedStyle(el).opacity === "0" && el.getBoundingClientRect().top < window.innerHeight) {
              el.style.opacity = "1"
              el.style.transform = "none"
            }
          })
      }, 2500)

      return () => {
        window.clearTimeout(failsafe)
        ctx?.revert()
      }
    } catch {
      ctx?.revert()
      revealAll()
    }
  }, [])

  return null
}
