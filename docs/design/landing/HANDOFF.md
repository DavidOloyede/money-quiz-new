# Landing page redesign: handoff

*Written 2026-09-24 at the end of the first design-loop run, and updated the
same day after David's review of the rounds (see "David's round review" below).
Branch `feature/design-loop-landing`. Read this first if you're picking up the
landing page, restyling it, or running another design loop.*

## What exists now

A signed-out **Landing** screen for Manna Money. `src/App.tsx` shows it instead
of the app shell when the visitor is **signed out and has no data**; there are
no URL or auth-redirect changes. "Create a free account" opens the Account screen
in sign-up mode (`AccountView` takes `initialMode`), and "Try it with sample data"
runs `loadSample()` then opens the Dashboard. The import link and Sign in link
leave the landing page for the rest of that visit (`leftLanding` in `Shell`).

To see it, open http://localhost:5199 (or your dev port) in a private window,
signed out with no data.

| File | What it is |
| --- | --- |
| `src/components/landing/Landing.tsx` | Page shell and the `LandingActions` props (`onSignUp`, `onTrySample`, `onImport`, `onSignIn`). |
| `LandingHero.tsx` + `hero.css` | Headline, subheadline, `CtaPair`, and the visual: morning clouds with a sun behind them, manna falling into a bowl, beside a phone showing "Correct! +10 XP". |
| `LandingHowItWorks.tsx` + `how.css` | "From bank to budget": intro, the three step tiles (`HowSteps`), then two alternating rows: **One question a day** (the streak lives on this card, since answering daily is what grows it) and **Simple, steady budgets** (bars are forest green while under budget, as on the real Budgets card). |
| `HowSteps.tsx` + `steps.css` | The three small steps in round 2's tile style: connect your bank, see your categories (a list that opens onto Groceries' transactions), plan your whole year (the round-1 Year Sheet card; numbers ripple in ring by ring from the top-right cell, then the Net row swells and brightens). Each tile plays **on hover or keyboard focus**; on touch screens it plays when centred and a tap replays it. Bank tiles come from one `BANKS` array of neutral placeholders; swap each `mark` for a real bank SVG later. |
| `LandingWhy.tsx` + `why.css` | "Why Manna?" story (round-1 text in the storyteller voice, and the round-1 picture: manna falling into a honey bowl on a dawn disc), then room to give and safe and yours. |
| `LandingFinal.tsx` + `final.css` | Short FAQ ("Before you try it"), then the finale on its own dawn band: closing headline, `CtaPair`, import link, and the round-4 celebration: the phone centred (Quiz complete 4/5 counting up, Nice work, +50 XP and streak chips, level bar, Continue), confetti, medal and check bursting out, and `MannaBowl` in front of the phone's foot (where round 4's hands were) catching falling manna. Footer with wordmark and Sign in. |
| `ThemeSwitch.tsx` | The sun/moon pair in the hero's top bar. It sets the store's `theme`, the same setting as the app's own switch. |
| `CtaPair.tsx` | The shared button stack, so the hero and finale always match. Without accounts configured, sample data becomes the only (primary) button. |
| `PressButton.tsx` | The chunky press-in button (DESIGN.md recipe; the dark-mode edge steps up to forest-700 so it shows). |
| `MannaBowl.tsx` | The bowl the manna lands in (the logo's closed bowl, drawn large). This is **Omer's spot**: when his art exists he replaces it, in the hero and the finale. |
| `useReplayInView.ts` | Scroll motion: `rest` / `armed` / `play` phases. Plays only once the element's **middle reaches the middle of the screen** (within 12% of the viewport height); an element taller than the screen plays once it covers the middle, and at the very top or bottom of the page being fully on screen is enough. Replays every time it comes back, and stays at `rest` under reduced motion. The start pose must still show all content, **except the finale**, whose start pose is a true zero (David's call: a half-played celebration seen while scrolling in looked broken). |
| `useHoverPlay.ts` | The step tiles' trigger: the same phases, driven by hover/focus, falling back to `useReplayInView` plus tap-to-replay on touch screens. |
| `styles.ts` | The shared type scale and rhythm: `DISPLAY` (36/64px), `HEADING` (34/48px), `BODY` (17/18px, linen-500), `SECTION`, `COLUMN` (990px). |

Also changed outside the landing folder: **the logo** (`MannaLogo` in
`src/components/icons.tsx` and `public/manna.svg`) is now three flakes (two
sides and one centre; the top flake was removed so it reads as a smiling face)
over a **closed bowl** at a 1.6 stroke weight (the blush spike uses 1.4; 1.6
keeps the favicon legible). The hover animation in `src/index.css` lost its
fourth-flake rule. ARCHITECTURE.md §5 describes the welcome page in plain
language.

## Decisions David made (don't re-litigate)

- **Product emphasis:** bank connection via Plaid is the headline feature, and
  CSV upload is the alternative for people who'd rather not connect. Keep the
  bank wording.
- **Sign-up first:** primary CTA "Create a free account", secondary "Try it with
  sample data". Don't make "no account needed" a focal point. The safety message
  is "your info is safe, in your own account, seamless".
- **Hero copy:** headline "Enough for today. A plan for tomorrow."; subheadline
  ends "…small wins worth celebrating. Free and private." (the old "no bank login
  needed" was dropped because it contradicted the bank-first message).
- **Free-tier FAQ wording is approved.**
- **Logo:** three flakes, closed thinner bowl, reads as a smile, on purpose.
- **Hero art:** no big logo tile beside the phone; clouds (a sun peeking behind,
  like ⛅) drop manna into a bowl. Clouds rather than a rainbow, to stay in
  palette.
- **No hands.** The open-hands placeholder was tried and removed.
- **Finale:** keep the round-3-style celebration (quiz complete, confetti, medal)
  plus the phone's level card and Continue button.
- **Bank logos:** real SVG logos come later; placeholders for now.
- **Mascot:** Omer isn't drawn. Don't generate characters (and don't use
  Higgsfield). The bowl holds his spot.
- **Finale:** round 4's layout (phone centred, rewards around it) with the
  bowl in the hands' spot. The phone keeps one of each thing: score, verdict,
  XP and streak, level bar, Continue. The "You found your top expense…" line
  and "Next question tomorrow" were cut as redundant.
- **How it works:** the three setup steps are connect → categories → Year
  Sheet, as hover tiles in round 2's style. The streak goes with the daily
  question, never with budgets (they're separate features). Budget bars are
  green while under budget.
- **Why Manna:** round 1's story text ("Manna came each morning, just enough
  for the day…") and round 1's bowl. It speaks to anyone rather than one
  faith. "A pause each morning" was removed, mainly so the page never
  suggests skipping the verse ("skip straight past").
- **Motion timing:** scroll animations wait until the thing is in the middle
  of the screen, not when it first peeks in.
- **Finale start:** before it plays, the phone reads 0/5 with an empty ring,
  and the confetti, medal, check, "Nice work!", chips and Continue aren't
  there yet. They arrive in order as it plays: the score counts up, the
  rewards burst, the verdict and chips pop, the level bar grows, and
  Continue rises in.
- **Why Manna's bowl loops:** manna keeps falling into the bowl for as long
  as it's on screen (it pauses while scrolled away), rather than dropping once.
- **Theme switch:** a small sun/moon pair at the top of the page.

Design-system calls made during the loop (from docs/DESIGN.md):

- **Heading color:** headings and body text are linen; forest is for actions,
  links, correct and income. The reference colors its headings with its brand
  accent; we don't, and bar.md #1 was annotated to say so. The finale headline
  is still forest (a leftover). Make it linen for consistency, or decide the
  closing headline is an exception.
- **Color jobs:** honey stays scarce (reward only, plus the spending series in
  charts). Confetti is honey, forest and cream only, never sky. Streaks are
  honey. Status badges ("Linked securely") belong in sky.
- **Press-in edges** are for real buttons only, never badges or chips.
- **Honesty:** no testimonials, stats or ratings. Don't claim end-to-end
  encryption or "readable only by you"; the true claim is that it's tied to your
  account, bank tokens are encrypted, and no screen shows anyone else your
  finances.

## David's round review (after round 5)

David picked pieces from different rounds; these are now built:

| Piece | Now |
| --- | --- |
| Hero | Unchanged, plus the sun/moon theme switch in the top bar. |
| How it works | Round 2's three-tile layout for connect → categories → Year Sheet (hover to play), then the question-of-the-day row (with its streak) and a green budgets row. |
| Why Manna | Round 1's text and bowl, with the manna falling continuously; the Year Sheet moved into How it works; "A pause each morning" removed. |
| Final | Round 4's layout and motion with the bowl instead of hands; the current phone content, trimmed. It starts from zero and builds up. |

These haven't been through the critics. Current renders are the
`<piece>-now.jpg` files.

## Known open issues (from the round-5 critics; some since fixed)

Fixed since: "Linked securely" is sky; step 3's two-ideas problem (the streak
card is gone from budgets); the budget mockup no longer shows a "$X left" line
the real card doesn't have; Why Manna now avoids the faith-heavy verse block,
and the Year Sheet (the money-planning feature) is on the page in How it works;
the two ~36px-cornered tiles and the dark night-blue story fill went with the
old Why pictures.

The run stopped at David's 5-round checkpoint. No section passed all three
critics, but **Hero, How it works and Final pass the brief critic**.

- **All:** check dark mode's dawn in the finale: it reads as dusk (warm glow at
  the bottom, after the blue). The quiet text links ("Or import your own CSV",
  footer "Sign in") are linen; DESIGN.md says links are forest.
- **Hero:** the craft critic keeps asking for one dominant object. With the logo
  tile gone this may now be solved, but it hasn't been re-judged since the
  clouds and bowl went in. The light dawn's peach is faint.
- **How it works:** step 3 still reads as two ideas (a budget card plus a
  separate streak card). The placeholder bank tiles read as filler until real
  logos go in. "Linked securely" should be sky, not forest. The budget mockup's
  "$X left this month" line doesn't exist on the real Budgets card yet. The
  streak shown is the app-wide check-in streak, and the copy says so.
- **Why Manna:** brief failed. The features are the most faith-heavy (verse,
  giving) and nothing delivers the money side ("a plan for tomorrow"). Consider
  adding back a planning feature (the Year Sheet, framed as calm planning). The
  visuals mix three treatments (tiles vs. frameless), and the two big tiles use
  ~36px corners instead of 16px. The "room to give" pie separates its slice by
  color alone. The story block uses a dark sky-700 night fill for a morning story.
- **Final:** the craft critic wants the phone's screen fuller (now improved with
  the level card and Continue) and fewer actions on the last screen. The CSV link
  and Sign in are required, so that's a known conflict. The Continue button was
  restored at David's request, but early critics flagged a green in-mockup button
  as reading like a second CTA.
- **Go-live:** leading with bank connection assumes Plaid production access.
  Plaid is still on the Trial tier (10 Items), and the Chase OAuth follow-up is
  outstanding.
- **Mobile app:** the iPhone app's icon PNGs weren't touched by the logo change.

## Seeing past rounds

**Screenshots of every round** are in `docs/design/landing/rounds/`:
`<piece>-r1.jpg` … `<piece>-r5.jpg`, plus `<piece>-now.jpg` for the current
state, where piece is `hero`, `how`, `why` or `final`. Each is the desktop
render (1440 wide) the critics judged that round.

**Code:** individual rounds were **not** committed separately (a lesson for
next time; see below), so you can't check out "round 1" exactly. You can check
out these checkpoints:

| Commit | What it shows |
| --- | --- |
| `c457f86` | Scaffold only: stub sections, the App wiring and bar.md. |
| `ccdbc7a` | The mid-loop state: final r3 (the celebration David liked, with a dashed dev-only Omer box), how it works r4, hero and why at r3 plus part of r4 (a usage limit cut those builders off mid-round). One CTA ("Try it with sample data"). |
| `e4991c2` | End of round 5 for every piece, after the bank-first and sign-up direction; open hands in Omer's spot. |
| `1f7db25` | Hands removed, three-flake logo, round-3 celebration restored. |
| `f4ead08` | Closed-bowl logo, clouds and bowl in the hero, fuller finale phone. |
| `7c8b766` | Sun behind the clouds, mid-screen scroll trigger. |
| `8a791b3` | Current: David's round review: step tiles, round-1 Why, round-4 finale with the bowl, theme switch, centred scroll trigger. |

To look at one without touching your working copy, use a git worktree:

```bash
git worktree add ../mm-look ccdbc7a
cd ../mm-look && npm install && npm run dev -- --port 5200
# open http://localhost:5200 in a private window; when done:
cd - && git worktree remove ../mm-look
```

To bring one section back from a checkpoint, check out just that file and its
CSS: `git checkout ccdbc7a -- src/components/landing/LandingFinal.tsx
src/components/landing/final.css`. Shared pieces may have changed since
(`CtaPair`, `useReplayInView`, `styles.ts`), so run `npm run lint` after.

## How the design loop ran

This was the `design-loop` skill (`.claude/skills/design-loop/SKILL.md`):
interview → preflight → teardown to `bar.md` → loop. The bar is in
`docs/design/landing/bar.md`: seven mechanisms measured from duolingo.com
(type scale, one idea per section, rhythm, press-in buttons, CTA repeated at
both ends, hero says one thing, motion). The pieces were the four sections.
Each round was one builder per piece (a persistent agent keeping context
across rounds) plus three fresh critics per piece:

- **Brief critic:** judged the stated goal, renders only.
- **System critic:** judged against docs/DESIGN.md, renders only.
- **Craft critic:** blind A/B against the Duolingo section, labels stripped,
  side chosen at random.

**Rounds and biggest gaps (condensed):**

| Piece | R1 | R2 | R3 | R4 | R5 |
| --- | --- | --- | --- | --- | --- |
| Hero | Brief ✓. Visual is fragments, not one object | Still a collage; dark dawn reads as sunset | Visual no bigger than the text; animated logo not the brand mark | **Craft ✓ (only win vs. the reference)**; quiz didn't replay on a second visit | Brief ✓. Craft wants the logo gone (conflicts with brief); hands broken in dark mode |
| How it works | Can't grasp in 10s; mockups blank until scroll | Card grid, 13px text; budgets dropped | Rows too tight, double-boxed; spend bars in forest | Mockups too small; reward chip on a money card | **Brief ✓**. Step 3 still two ideas; placeholder tiles |
| Why Manna | Features rerun How it works | Honey bowl impersonates Omer; forecast contradicts "daily" | **System ✓**. No daily feature; visuals need captions | Too pale; honey overused; privacy overclaim | Features too faith-heavy; mixed visual treatments |
| Final | Close lands softly; faceless bowl competes with Omer | Big logo reads as a character | **Brief ✓**. Close split in two; sky confetti | Brief ✓. Not its own scene; CSV pill reads as a third CTA | Brief ✓. Phone half empty; dark dawn reads as dusk |

## Lessons for the next design loop

1. **The craft critic fought the brief.** It repeatedly asked to cut things
   David required (hero-size logo, CSV link, Sign in). Add a tie-break rule to
   every critic brief up front: *client brief > design system > bar*, and list
   the brief-mandated elements the craft critic must not count against the page.
2. **Pick a reference whose quality isn't mostly character art.** Duolingo's
   close and hero lean on professional mascot illustration, which this project
   forbids. The blind test kept rewarding that. Either choose a reference
   without mascots, or have the craft critic score mechanism by mechanism
   instead of an overall "which is better".
3. **Fresh critics drift.** Each round's new critics found new, smaller issues.
   That's fine while issues shrink, but pair it with a fixed checklist (the bar
   plus a DESIGN.md checklist) so a pass is reachable, and let a critic see the
   last round's verdict to confirm fixes. The judging must still be on renders.
4. **Commit after every round** (for example `git tag landing-r1`) so any round
   can be checked out later. This run only committed at checkpoints.
5. **Watch for critic contradictions** and settle them yourself before
   dispatching. Examples from this run: intro heading "too similar" in round 3
   vs. "a fourth size" in round 4; "show the steps at a glance" vs. "one tall row
   per step". Write the resolution into the builder's message.
6. **Render pitfalls we hit (the tools handle them now):**
   - Scroll-triggered animations make full-page captures show blank or armed
     states. Use `--scrollthrough`, and `--tall` for multi-row sections.
   - Dev-only placeholders (the dashed Omer box) confuse the craft critic. Use
     `--prod` for its renders.
   - Replay checks need a second visit (`--revisit`), and the hero needs
     `--topwait 0` because it replays the instant you're back at the top.
   - Since the scroll trigger waits for the middle of the screen, `--tall`
     (which stretches the viewport to the whole section) leaves rows in their
     start pose. Add `--reduced` for a still of the finished state. The step
     tiles only play on hover; check them with Playwright's `hover()`.
   - Parallel builders must own separate files. Put shared pieces (buttons,
     type scale, hooks) in files the orchestrator owns.
7. **Usage limits:** 4 builders + 12 critics per round is heavy, and the run hit
   the session limit once. Consider 2 pieces at a time.

## Reusing the tools

`docs/design/landing/loop-tools/` has everything from this run:

- `render.mjs`: standalone renderer; each call launches its own headless
  Chromium, so parallel agents never collide. Needs Playwright:
  `PLAYWRIGHT_DIR=/path/to/node_modules`. Flags: `--selector`, `--widths`,
  `--theme dark`, `--reduced`, `--scrollthrough`, `--revisit`, `--topwait`,
  `--tall`, `--viewport`, `--prod`, `--frames N --interval ms`, `--press
  'label'`, `--full`, `--settle ms`. It clears localStorage so you see a fresh
  signed-out visitor.
- `review-piece.sh <hero|how|why|final> <round>`: renders one piece for all
  three critics (desktop, phone, dark, reduced motion, before scroll, second
  visit, filmstrips) and builds the blind A/B folder. Output goes to
  `loop-tools/loop-output/` (gitignored); the blind key goes to
  `loop-output/blind-key.txt`, which critics must never see. Blind folders now
  use `.jpg` reference files, so critic briefs should say "every image in A/".
- `ref/`: the Duolingo reference screenshots (desktop and phone).
- `landing-loop.html`: the live progress page (published as a private artifact
  during the run; edit its `DATA` block and republish).

## Suggested next steps

1. Fix the objective leftovers in one pass: link color, dark dawn in the finale,
   the pie label, the finale headline color.
2. Give Why Manna's remaining pictures one consistent treatment (the round-1
   bowl disc, the pie and the device scene are three styles).
3. Drop in real bank logos (`BANKS` in LandingHowItWorks.tsx).
4. When Omer's art lands, replace `MannaBowl` in the hero and finale (look for
   the "Omer's spot" comments).
5. If you run another loop: apply the lessons above, commit per round, and
   consider re-running only Why Manna and How it works first.
