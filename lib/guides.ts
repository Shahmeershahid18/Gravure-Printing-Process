/**
 * Guide content.
 *
 * The landing page answers "what is this and why". These answer "how do I
 * actually do it". Keeping them apart is the whole point: a stranger judging
 * the product and an operator looking up a procedure want opposite things from
 * the same words, and a page that tries to serve both serves neither.
 *
 * Written for somebody with no printing background. Every screen name here is
 * the name shown in the product, never a route or a table.
 */

export type Section =
  | { kind: "text"; body: string }
  | { kind: "steps"; title?: string; items: string[] }
  | { kind: "points"; title?: string; items: [string, string][] }
  | { kind: "note"; tone: "info" | "warn"; title: string; body: string }

export type Guide = {
  slug: string
  title: string
  /** One line for the index card. */
  summary: string
  /** Which screen family this belongs to. */
  group: "Start here" | "In the office" | "At the machine" | "Concepts"
  /** Who reaches for it. */
  who: string
  /** The question it answers, in the reader's words. */
  question: string
  sections: Section[]
  related?: string[]
}

export const GUIDES: Guide[] = [
  // ---------------------------------------------------------------- start --
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "What to set up first, in the order that avoids rework.",
    group: "Start here",
    who: "Whoever is bringing the system in",
    question: "We have just been given this. Where do we begin?",
    sections: [
      {
        kind: "text",
        body:
          "Nothing in this system stands on its own. A print run points at a job, a job points at a customer and a film, and each of eight colours points at an engraved roller. Set things up in the wrong order and you spend the first week typing the same names twice.",
      },
      {
        kind: "steps",
        title: "The order that works",
        items: [
          "Add your machines. Each press gets a short code — the one already painted on it, not a new one.",
          "Add your customers. Just the ones you actually print for today.",
          "Add your ink and film suppliers, then the inks and films themselves.",
          "Add your engraved rollers. This is the long one, so do the rollers for your busiest few jobs first and come back for the rest.",
          "Create job files for those jobs, and say which roller prints each colour.",
          "Add the people. Give the floor staff a short code so they can identify themselves at the machine.",
          "Run one real job through it, start to finish, with somebody watching.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "Do not try to load your history",
        body:
          "It is tempting to type in last year's runs so the reports look full. Do not. The value comes from the next run, not the last one, and hand-copied history is usually wrong in ways nobody notices until it is quoted back at a customer.",
      },
      {
        kind: "text",
        body:
          "Expect the first week to feel slower than the paperwork it replaces. It is. The payoff starts the second time a job runs, when the operator opens the briefing and finds last time's settings already there.",
      },
    ],
    related: ["jobs", "cylinders", "run-sheet"],
  },

  // ------------------------------------------------------------- concepts --
  {
    slug: "words",
    title: "The words the floor uses",
    summary: "Twenty terms, in plain English, enough to follow any screen.",
    group: "Concepts",
    who: "Anyone new to printing",
    question: "People keep saying words I do not know. What do they mean?",
    sections: [
      {
        kind: "text",
        body:
          "A gravure press is a very precise stamp machine. A long roll of thin plastic film unwinds and races through it at up to three metres a second. On the way it passes eight engraved metal rollers standing in a row, each dipped in one colour of ink, each pressing that colour onto the film. Eight rollers, eight colours, one finished design — the kind you see on a biscuit wrapper.",
      },
      {
        kind: "points",
        title: "The machine",
        items: [
          ["Cylinder", "An engraved metal roller that prints one colour. Expensive, and it wears out with use."],
          ["Station", "One position on the press. Eight of them, each holding one cylinder."],
          ["Web", "The strip of film travelling through the press. It is called a web because it is continuous."],
          ["Doctor blade", "A thin blade that scrapes surplus ink off the cylinder so only the engraved cells carry ink. When it wears it leaves fine lines down the print."],
          ["Dryer zone", "A heated section between stations that dries one colour before the next lands on it."],
          ["Tension", "How hard the film is being pulled. Too loose and it wanders; too tight and it stretches, so the colours no longer line up."],
        ],
      },
      {
        kind: "points",
        title: "The materials",
        items: [
          ["Substrate", "The film being printed on. Different deliveries of the same film behave differently."],
          ["Batch", "One delivery of ink or film, with its own number. When something goes wrong, the batch number is how you find everything else affected."],
          ["Viscosity", "How runny the ink is, measured by timing how long it takes to drain from a small cup. Too thick and the colour goes dark and blotchy."],
          ["Dyne", "A measure of how willing the film's surface is to accept ink. Too low and the ink beads up instead of laying flat."],
          ["Solvent", "The liquid the ink is thinned with. Adding it changes the viscosity, which is why viscosity is checked so often."],
        ],
      },
      {
        kind: "points",
        title: "The work",
        items: [
          ["Job", "One product you print — one design, for one customer, on one film."],
          ["Run", "One session of printing one job on one machine, from start to stop."],
          ["Registration", "How well the eight colours line up with each other. Out by a hair and the whole print looks blurred."],
          ["Waste", "Film printed but not good enough to sell. The number everyone is judged on."],
          ["Set-up waste", "The film used getting the colours right at the start of a run, before good production begins."],
          ["Shade card", "The approved printed sample the operator matches the colour against."],
          ["Artwork revision", "A version of the design. When a customer changes the design, that is a new revision, and it may need new cylinders."],
          ["Re-engrave", "Stripping a worn cylinder and cutting the design into it again. Its wear starts from zero."],
          ["Reel", "The finished roll coming off the end of the press."],
        ],
      },
    ],
    related: ["cylinder-life", "run-sheet"],
  },
  {
    slug: "cylinder-life",
    title: "Why every roller shows two totals",
    summary: "Lifetime metres against surface metres, and why the difference matters.",
    group: "Concepts",
    who: "Anyone reading a cylinder screen",
    question: "This roller says 842,000 metres and also 0 metres. Which is right?",
    sections: [
      { kind: "text", body: "Both. They measure different things, and confusing them is how a factory either scraps good rollers or keeps ruined ones." },
      {
        kind: "points",
        items: [
          ["Lifetime metres", "Everything this roller has ever printed, across its whole existence. It only ever goes up. This is the asset's history."],
          ["Surface metres", "What the current engraved surface has printed since it was last cut. This resets to zero on a re-engrave."],
        ],
      },
      {
        kind: "text",
        body:
          "When a cylinder wears out, it is not thrown away. The old surface is stripped off and the design is engraved again. Physically it is the same roller with the same number, but the printing surface is brand new — so as far as wear is concerned it is a new part.",
      },
      {
        kind: "note",
        tone: "warn",
        title: "Wear warnings always use surface metres",
        body:
          "If a warning used lifetime metres, a freshly re-engraved roller would look worn out on its first day and get pulled off the press for no reason. If a report needs the asset's full history, that is what lifetime metres is for.",
      },
      {
        kind: "text",
        body:
          "How many metres a surface is good for depends on how finely it is engraved and sometimes on what the customer will accept, so the limit is a rule you set rather than a single number for the whole factory.",
      },
    ],
    related: ["cylinders", "words"],
  },

  // --------------------------------------------------------------- office --
  {
    slug: "jobs",
    title: "Job files",
    summary: "The record of one product: its design, its film and its eight colours.",
    group: "In the office",
    who: "Planners and supervisors",
    question: "How do I set up a product so it can be printed?",
    sections: [
      {
        kind: "text",
        body:
          "A job file is the thing everything else hangs off. It names the customer, the product, the film it prints on, and which engraved roller sits at each of the eight stations. Once it exists, starting a run is a couple of taps at the machine.",
      },
      {
        kind: "steps",
        title: "Creating one",
        items: [
          "Open Job files and choose to add a new one.",
          "Pick the customer and give the product a name people will recognise on the floor.",
          "Choose the film it prints on, and the machine it normally runs on.",
          "Add the design as its first revision, with the approved sample it is matched against.",
          "For each of the eight stations, choose the colour and the engraved roller that prints it. Leave a station empty if the design uses fewer than eight colours.",
          "Save. The job is now available at the machine.",
        ],
      },
      {
        kind: "steps",
        title: "When a customer changes the design",
        items: [
          "Open the job and add a new revision rather than editing the old one — the old one is the record of everything already printed and delivered.",
          "Note what changed, and mark which rollers need re-engraving.",
          "Once the new rollers arrive, point the affected stations at them.",
          "The next briefing at the machine will show that the design changed, so nobody matches against the wrong sample.",
        ],
      },
      {
        kind: "note",
        tone: "warn",
        title: "Never edit a revision that has already printed",
        body:
          "The reels already in the customer's warehouse were printed against that revision. Change it and the record no longer describes what you actually shipped, which is exactly the question a complaint six months from now will ask.",
      },
    ],
    related: ["cylinders", "briefing", "run-sheet"],
  },
  {
    slug: "cylinders",
    title: "Cylinders",
    summary: "Where every engraved roller is, and how much life it has left.",
    group: "In the office",
    who: "Planners, store, supervisors",
    question: "Which rollers are worn, and where are they?",
    sections: [
      {
        kind: "text",
        body:
          "Engraved rollers are the most expensive thing in a gravure factory that is not the press itself, and they wear invisibly. This screen keeps track of where each one is, what condition it is in, and how far past its useful life it has printed.",
      },
      {
        kind: "points",
        title: "What a cylinder screen tells you",
        items: [
          ["Where it is", "In the store, on a machine, away at the engraver, being repaired, or with the customer who owns it."],
          ["What it has printed", "Its two totals — see the guide on why there are two."],
          ["How close it is to its limit", "A bar showing how much of the current surface's life has been used."],
          ["What has happened to it", "Engraved, chromed, cleaned, repaired, inspected, re-engraved — the whole history, with dates."],
        ],
      },
      {
        kind: "steps",
        title: "Deciding what to send for re-engraving",
        items: [
          "Open Cylinders and look at the rollers flagged as approaching their limit.",
          "Check what is scheduled to run in the next few weeks — a roller at 80% that is not needed for a month can wait.",
          "Send the ones that would run out mid-job. A roller that fails halfway through a run costs the whole run, not half of it.",
          "Record it as sent, so nobody plans a job around a roller that is not in the building.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "Rollers the customer owns",
        body:
          "Some customers own their own rollers and lend them to you. Those are marked as theirs, so nobody scraps a roller that is not yours to scrap.",
      },
    ],
    related: ["cylinder-life", "jobs"],
  },
  {
    slug: "shift-board",
    title: "Shift board",
    summary: "What is on every machine right now, and how waste is tracking.",
    group: "In the office",
    who: "Supervisors",
    question: "What is happening on the floor at this moment?",
    sections: [
      {
        kind: "text",
        body:
          "One screen for the whole floor. Every machine, what it is printing, who is running it, how far through it is, and how the waste compares with what the job usually costs. It updates itself as the floor works — no refreshing.",
      },
      {
        kind: "steps",
        title: "Using it during a shift",
        items: [
          "Scan the waste figures first. A run well above its usual waste is the one to walk over and look at.",
          "Check for machines showing no activity — either the run was never started on the tablet, or something has stopped.",
          "Open any run to see the eight stations and what the operator has recorded.",
          "Correct anything obviously mistyped. Supervisors can edit a run the operator has already closed.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "A quiet board is not the same as a quiet floor",
        body:
          "If a tablet has lost its network, the operator keeps working and the entries queue on the device until it reconnects. Before assuming a machine has stopped, check whether it simply has not reported yet.",
      },
    ],
    related: ["run-sheet", "reports"],
  },
  {
    slug: "issues",
    title: "Issues",
    summary: "Problems logged in seconds, and flagged to whoever runs the job next.",
    group: "In the office",
    who: "Everyone",
    question: "Something went wrong. How do I make sure it is not forgotten?",
    sections: [
      {
        kind: "text",
        body:
          "An issue is anything that went wrong and is worth remembering: lines down the print, ink drying too slowly, a reel that would not track straight. Each one records what happened, which station it was on, what was done about it, and a photograph if one helps.",
      },
      {
        kind: "steps",
        title: "Logging one",
        items: [
          "Choose the area — the cylinder, the ink, the film, the machine, registration, drying, and so on.",
          "Pick from the common problems for that area, or describe it yourself.",
          "Say how serious it was.",
          "Take a photograph if the problem is visible. On the tablet this uses the camera directly.",
          "Say what was done about it, if anything.",
          "If the next person running this job needs to watch for it, flag it for the next run.",
        ],
      },
      {
        kind: "text",
        body:
          "A flagged issue appears at the top of the briefing the next time that job is printed, and stays there until somebody clears it — which they do once they have acted on it, not once they have read it.",
      },
      {
        kind: "note",
        tone: "warn",
        title: "Say what you saw, not what you concluded",
        body:
          "\"Fine lines down the left of station 4 from about 65,000 metres\" is useful a year later. \"Cylinder bad\" is not. The person reading it next has no idea what you were looking at.",
      },
    ],
    related: ["briefing", "run-sheet"],
  },
  {
    slug: "reports",
    title: "Reports",
    summary: "Waste by job, machine and shift, so arguments are about numbers.",
    group: "In the office",
    who: "Supervisors and management",
    question: "Where is our waste actually coming from?",
    sections: [
      {
        kind: "text",
        body:
          "Every run records how much film was produced and how much was wasted, both in metres and in kilograms. Neither figure can be typed in by hand — they are calculated from what was entered, so nobody can round their own performance.",
      },
      {
        kind: "points",
        title: "The questions it answers",
        items: [
          ["Which jobs cost us most", "Some products are simply harder. Knowing which ones lets you quote them properly."],
          ["Which machine runs a job best", "The same job on two presses rarely costs the same. Plan it onto the better one."],
          ["Which shift", "Not to blame anyone — to find out what the better shift is doing and teach it."],
          ["Which problems recur", "The same issue appearing across many runs is a maintenance job, not bad luck."],
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "Give it a few weeks",
        body:
          "Reports built on three runs are noise. The comparisons start to mean something once each job has run several times.",
      },
    ],
    related: ["shift-board"],
  },
  {
    slug: "search",
    title: "Search",
    summary: "One box for batch codes, job numbers, customers and rollers.",
    group: "In the office",
    who: "Anyone answering a question",
    question: "A customer is asking about a delivery from months ago.",
    sections: [
      {
        kind: "text",
        body:
          "Type whatever you have. A batch code from the side of a reel, a job number, a customer's name, a roller number. Search finds it and takes you straight there.",
      },
      {
        kind: "steps",
        title: "Answering a complaint",
        items: [
          "Ask for the code printed on the reel or on the delivery note.",
          "Type it into search.",
          "Open the run it belongs to. You now have the date, the machine, who ran it, the settings at every station, the ink and film batches used, and any problems logged at the time.",
          "If a material batch is at fault, search that batch code to find every other run that used it — that is the real extent of the problem.",
        ],
      },
    ],
    related: ["issues", "reports"],
  },
  {
    slug: "settings",
    title: "Settings",
    summary: "Machines, inks, films, customers and people — set up once.",
    group: "In the office",
    who: "Planners and admins",
    question: "Where do the dropdown lists come from?",
    sections: [
      {
        kind: "text",
        body:
          "Everything chosen from a list somewhere in the product is maintained here. The point is that names are typed once and picked thereafter — so the same customer is not spelled three ways across a year of runs.",
      },
      {
        kind: "points",
        items: [
          ["Machines", "Your presses, with their working width and top speed."],
          ["Customers", "Who you print for."],
          ["Suppliers", "Who supplies your ink, film and engraving."],
          ["Colours", "The colour names used at the eight stations."],
          ["Common problems", "The shortlist an operator picks from when logging an issue. Keep it short and in the floor's own words."],
          ["Wear limits", "How many metres an engraved surface is good for, which can vary by how finely it is engraved or by customer."],
          ["People", "Who can sign in, what they are allowed to do, and which machine they normally work on."],
        ],
      },
      {
        kind: "note",
        tone: "warn",
        title: "Deactivate, do not delete",
        body:
          "A supplier you stopped using last year is still attached to runs you printed. Marking them inactive keeps them out of the dropdowns without breaking the history.",
      },
    ],
    related: ["getting-started"],
  },

  // -------------------------------------------------------------- machine --
  {
    slug: "briefing",
    title: "Pre-run briefing",
    summary: "The one page to read before starting. It is why the typing is worth it.",
    group: "At the machine",
    who: "Operators and supervisors",
    question: "I am about to run this job. What do I need to know?",
    sections: [
      {
        kind: "text",
        body:
          "Before printing starts, the tablet shows everything the factory already knows about this job on this machine. It is assembled from the runs that came before it — nobody writes it.",
      },
      {
        kind: "points",
        title: "What is on it",
        items: [
          ["The best run so far", "The settings from the lowest-waste run of this job. If the best run was on a different machine, it says so — treat those settings as a hint, not a target."],
          ["Last time", "What the previous run of this job actually did, whether it went well or not."],
          ["Open warnings", "Problems flagged by whoever ran it last, which nobody has cleared yet."],
          ["Recurring problems", "Things that have gone wrong more than once on this job. These are worth reading even when they are not flagged."],
          ["Roller warnings", "Any of the eight rollers close to needing re-engraving."],
          ["Film to watch", "Batches of film that have caused trouble before."],
          ["Machine change", "Whether this job normally runs on a different press."],
        ],
      },
      {
        kind: "text",
        body:
          "It prints to a single A4 page if you would rather have it on paper at the machine.",
      },
      {
        kind: "note",
        tone: "warn",
        title: "If the briefing will not load, do not start",
        body:
          "It means the system cannot see this job's history. Starting anyway is how a known problem gets repeated. Tell your supervisor.",
      },
    ],
    related: ["run-sheet", "issues"],
  },
  {
    slug: "run-sheet",
    title: "The run sheet",
    summary: "All eight stations on one screen, saving as you type, wifi or not.",
    group: "At the machine",
    who: "Operators",
    question: "How do I record a run while it is printing?",
    sections: [
      {
        kind: "text",
        body:
          "This is the screen the tablet spends the shift on. Eight rows, one per station, and three passes over them — setting up, running, and closing. Everything saves as you type; there is no save button to forget.",
      },
      {
        kind: "steps",
        title: "Running a job",
        items: [
          "Read the briefing first.",
          "Start the run and confirm the job, the machine and the film reel you are putting on.",
          "In the Setup pass, confirm the roller and ink at each station and the starting ink thickness.",
          "Once you are printing well, switch to the Running pass and record the actual settings — speed, ink thickness, tension, and the metres each station has run.",
          "Log anything that goes wrong as it happens, not at the end when you have forgotten the detail.",
          "At the end, switch to Close, enter what was produced and what was wasted, and close the run.",
        ],
      },
      {
        kind: "points",
        title: "Things worth knowing",
        items: [
          ["Apply to all stations", "One button copies the run's metres to every station that was actually printing, instead of typing the same number eight times."],
          ["It works without wifi", "Entries are held on the tablet and sent when the connection returns. Keep working."],
          ["Roller life warning", "If a station's roller will pass its wear limit during this run, the screen says so while there is still time to do something."],
          ["Two people, one run", "A supervisor correcting the run from the office and an operator entering at the machine will both see the other's changes appear."],
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "Closed is not locked",
        body:
          "Closing a run says the printing is finished. A supervisor can still correct a mistyped figure afterwards — the record should be right, not merely final.",
      },
    ],
    related: ["briefing", "issues", "signing-in"],
  },
  {
    slug: "signing-in",
    title: "Signing in at the machine",
    summary: "Why the tablet stays signed in, and how you identify yourself.",
    group: "At the machine",
    who: "Operators",
    question: "Do I need a password every shift?",
    sections: [
      {
        kind: "text",
        body:
          "No. The tablet belongs to the machine and stays signed in to it across shifts. You identify yourself by tapping your name and entering a short code, which takes a couple of seconds with gloves on.",
      },
      {
        kind: "steps",
        title: "Starting your shift",
        items: [
          "Tap your name on the tablet.",
          "Enter your code.",
          "The machine's home screen opens, showing today's runs and a button to start the next one.",
        ],
      },
      {
        kind: "steps",
        title: "Finishing your shift",
        items: [
          "Tap Lock in the bar at the top.",
          "The tablet returns to the name list, ready for the next person.",
          "It does not sign the tablet out — nobody needs to be called in to get it working again.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "It locks itself",
        body:
          "After half an hour without anyone touching it, the tablet returns to the name list on its own, so work is never recorded against whoever last used it.",
      },
      {
        kind: "note",
        tone: "warn",
        title: "Your code identifies your work",
        body:
          "Everything recorded while you are signed in is attributed to you. Do not share it, and do not enter it for somebody else.",
      },
    ],
    related: ["run-sheet"],
  },
  {
    slug: "daylight-and-theme",
    title: "Reading the screen on the floor",
    summary: "Daylight mode, dark mode, and when to use which.",
    group: "At the machine",
    who: "Operators",
    question: "I cannot read the tablet where it is mounted.",
    sections: [
      {
        kind: "points",
        items: [
          ["Daylight", "For a tablet near a window in the middle of the day. It raises the contrast without changing any colour, so colour judgement is unaffected."],
          ["Dark", "For a night shift, or a machine in a dim corner. Easier on the eyes and less of a beacon in a dark hall."],
          ["Auto", "Follows the tablet's own setting, which usually means light by day and dark at night."],
        ],
      },
      {
        kind: "text",
        body:
          "The choice is remembered per device, so a tablet by a window keeps daylight mode and the one in the corner does not. It changes instantly — nothing reloads and nothing you have typed is lost.",
      },
      {
        kind: "note",
        tone: "info",
        title: "The ink swatches never change",
        body:
          "The eight colour swatches are the same in every mode. They describe real ink, and shifting them to suit a screen would be describing the machine wrongly.",
      },
    ],
    related: ["run-sheet"],
  },
]

export const GUIDE_GROUPS = [
  "Start here",
  "At the machine",
  "In the office",
  "Concepts",
] as const

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
