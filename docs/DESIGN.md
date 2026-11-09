# Design

Written for the handover door in `web/`.

**Mood.** An engine room at night seen through brass and glass. Calm, exact, warm metal on deep teal. Magazine layout: a large serif headline, tracked mono labels, hairlines and numbered sections.

**Colour tokens** (in `web/app/globals.css`): hull `#0F1D23` to hull-2 `#16303A` for the base, never pure black; brass `#E2B86B` for rules and numerals; glass `#5EEAD4` for interactive elements and focus; seen `#8BF0B5`, watch `#F5C66B`, alarm `#FF7A66`; paper `#F2EDE3` for text; fog `#9FB3B8` for secondary text. Glow: `0 0 24px rgba(94,234,212,.28)`.

**Fonts.** Display: Fraunces, italic for the emphasis word. Body: Hanken Grotesk. Labels and numbers: JetBrains Mono, tracked and uppercase. Zodiak and Switzer were the first choice but their files are not in the repository, so these three free fonts are used instead.

**Motion.** One signature move: the instrument's needle sweeps to its reading and the sight glass rises with it, 1.4 s. Everything else is a 500 ms fade and a 12 px rise on scroll. Reduced motion shows the final state at once.

**Hero.** The photograph fills the hero. A left to right gradient keeps the headline readable and leaves the right side clear, so the image and the text do not compete. The instrument is a separate block directly below, not drawn over the photograph.

**Navigation.** A square capsule (12 px radius) with a brass hairline border, translucent hull and blur. Below 900 px the links fold into a Menu.

**Checked by tool.** `web/tests/viewports.mjs` runs headless Chrome on 393x852, 412x915, 820x1180, 1366x768, 1440x900 and 1920x1080 across five pages: no horizontal scroll, no text outside the viewport, no overlap between the headline, buttons, instrument and stat cards, no serious accessibility violation, no console error.
