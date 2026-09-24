# Landing page redesign: handoff

*Written 2026-09-24 at the end of the first design-loop run. Branch
`feature/design-loop-landing`, last commit `7c8b766`. Read this first if you're
picking up the landing page, restyling it, or running another design loop.*

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
| `LandingHowItWorks.tsx` + `how.css` | "From bank to budget": three alternating rows (connect your bank / one question a day / steady budgets + small wins). Bank tiles come from one `BANKS` array of neutral placeholders; swap each `mark` for a real bank SVG later. |
| `LandingWhy.tsx` + `why.css` | "Why Manna?" story (Fraunces softened, body size) and feature blocks: a pause each morning (verse of the day, optional), room to give, safe and yours. |
| `LandingFinal.tsx` + `final.css` | Short FAQ ("Before you try it"), then the finale on its own dawn band: closing headline, `CtaPair`, import link, and the celebration (phone showing Quiz complete 4/5, Nice work, +50 XP, streak chip, level progress, Continue; confetti burst, medal, check; small logo dropping manna into the bowl). Footer with wordmark and Sign in. |
| `CtaPair.tsx` | The shared button stack, so the hero and finale always match. Without accounts configured, sample data becomes the only (primary) button. |
| `PressButton.tsx` | The chunky press-in button (DESIGN.md recipe; the dark-mode edge steps up to forest-700 so it shows). |
| `MannaBowl.tsx` | The bowl the manna lands in (the logo's closed bowl, drawn large). This is **Omer's spot**: when his art exists he replaces it, in the hero and the finale. |
| `useReplayInView.ts` | Scroll motion: `rest` / `armed` / `play` phases. Plays when the element reaches the **middle band** of the screen (centre 30%), replays every time it comes back, and stays at `rest` under reduced motion. The start pose must still show all content. |
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

## Known open issues (from the round-5 critics; not yet fixed)

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
| `7c8b766` | Current: sun behind the clouds, mid-screen scroll trigger. |

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
   the 36px tile corners, the pie label, the "Linked securely" color, the finale
   headline color.
2. Give Why Manna a real money-planning feature and one consistent visual
   treatment.
3. Drop in real bank logos (`BANKS` in LandingHowItWorks.tsx).
4. When Omer's art lands, replace `MannaBowl` in the hero and finale (look for
   the "Omer's spot" comments).
5. If you run another loop: apply the lessons above, commit per round, and
   consider re-running only Why Manna and How it works first.
