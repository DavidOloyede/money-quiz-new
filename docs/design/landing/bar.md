# The bar: duolingo.com homepage (mechanics only)

Measured 2026-09-23 at 1440×900 and 390×844. Reference screenshots live in
the session scratchpad (`ref/duo-*.png`). We borrow how the page works, never
its colors, art, lowercase styling or copy.

1. **Three text sizes do all the work.** Section headings are ~2.8× body
   (48px vs 17px/24px); the closing headline is ~3.8× (64px). Buttons are one
   small bold size (15px). Any section with a fourth text size, or with a
   heading under 2.5× body, fails. Headings are heavy (700+) and dark; body
   is regular weight in a muted neutral, visibly quieter. (The reference
   colors its headings with its brand accent; heading color is ours to set,
   and our design system keeps text in linen and forest for actions.)

2. **One idea per section.** Each section is a 2–4 word heading, at most 3
   lines of body (measure ≈ 470px, ~60–70 characters), and one visual. Split
   roughly 50/50, and the visual swaps sides every section (zig-zag). A
   section with two headings, a bullet list, or body over 3 lines fails.

3. **Even, generous rhythm.** Feature sections run ~530px tall at 1440 wide,
   with the content column capped near 990px and centered. The text block sits
   vertically centered against its visual, and at least ~180px of empty space
   separates one section's text from the next. Nothing is crammed into a card
   grid.

4. **Chunky buttons that press in.** The primary button is a solid fill, 12px
   corners, 50px tall, ~330px wide on desktop and full width on mobile, with a
   4px darker same-hue edge along the bottom. On press it moves down and the
   edge collapses. The secondary button is white with a 2px neutral border and
   the same 4px neutral edge. A flat button, or a flat hover-only state,
   fails.

5. **The CTA repeats, identically, at both ends.** The same primary button
   (same label, same size) appears on the first screen and on the last
   screen, and nowhere in between. Middle sections carry at most a text link.
   The last screen restates the promise in a big headline directly above that
   button.

6. **The hero says one thing.** Above the fold: one headline, one button
   stack, one hero visual, and the logo. No nav links and no feature list. At
   least ~50% of the first screen is empty space, and the visual is larger
   than the text block. On mobile the visual stacks above the headline and
   the button sits within the first screen.

7. **Motion is quick for UI and resolves one way for decoration.** Press
   and hover feedback lands in 150–250ms; larger UI moves (open/close,
   reveals) take up to ~500ms with a fast-out ease
   (`cubic-bezier(0.22, 1, 0.36, 1)`). Decorative objects gather around one
   central object (in the closing scene, rewards scatter around a single
   container) and any loop drifts in one consistent direction. Nothing
   jitters, and nothing loops faster than about 2s per cycle.
