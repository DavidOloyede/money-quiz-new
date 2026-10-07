# Plan: celebrations, sound, a cleaner look, real web addresses, and people

*Written 2026-10-03 on `feature/celebrations-and-routes` (stacked on
`feature/import-csv-clarity`, which carries docs/ROADMAP.md). Self-reviewed
and approved before building; the review notes are at the bottom.*

## What David asked for

1. Animations and styling cleaned up throughout the app.
2. A right answer gets a sound and an animation.
3. A level-up is shown clearly: a real "you reached the next level" moment.
4. Both on the iPhone and on the web.
5. Real web addresses (`/quiz`, `/dashboard`…) instead of one page whose
   address never changes, and new visitors land on the landing page.
6. Colorful, on-theme motion, and illustrated people of many races, with
   many of them at the darkest skin tones, in a consistent style.
7. Suggestions (not builds) for what else is missing, and which tools or
   connectors would make animation and sound better later.

docs/DESIGN.md already specifies most of 1–4 ("Celebration moments", "Sound",
"Motion"), and says the web screens were never restyled to it while the
iPhone was. This plan builds that spec; it doesn't invent a new direction.

## The pieces

### 1. Shared engine (`packages/core`), platform-neutral

- **`lib/sounds.ts`**: the five DESIGN.md sounds (chime, soft low tone,
  drop, sparkle, fanfare) as small synthesis recipes (pure math, no audio
  API). A generator, `npm run gen:sounds` (`scripts/gen-sounds.mjs`), turns
  them into WAV files for both apps: `public/sounds/` (web) and
  `apps/mobile/assets/sounds/` (phone). One recipe means one sound identity
  on both platforms. We made them ourselves, so there's no licence to track.
  Tests lock in DESIGN.md's rules: each sound under 1s (the fanfare up to 2s)
  and quiet (peak well under full scale).
- **`lib/milestones.ts`**: `milestonesBetween(prev, next)`, which spots a
  level-up (from, to, new title) and newly earned badges between two game
  states, plus a `useMilestones()` hook that watches the store and queues
  them. It starts from whatever the store loaded, so opening the app, a sync
  pull or an account switch never fakes a celebration. Tested.
- **Store**: a per-device `sound` on/off preference under a **new** key,
  `moneyquiz.sound.v1`. It isn't synced (like `theme`) and it isn't wiped
  by "Clear all data". No existing key changes.
- **`data/people.ts` + `lib/people.ts`**: a small illustrated cast described
  as plain shapes (circles, paths), which both apps draw with their own SVG
  renderer, so the characters match exactly. Skin and hair colors join
  `theme.ts` as illustration tokens. Most of the cast is at the two deepest
  skin tones, and a test locks that so a later edit can't quietly undo it.
  The people are illustrations of small wins ("12-day streak"), never named
  testimonials or quotes.

### 2. Web: real addresses (`src/lib/routes.ts`, web-only)

| Address | Shows |
| --- | --- |
| `/` | The landing page for a new visitor. Anyone with data goes on to `/dashboard`; signed in with no data, to `/import`. |
| `/dashboard`, `/year`, `/quiz`, `/import`, `/settings` | Those screens |
| `/account`, `/signin`, `/signup` | The Account screen (sign-in or sign-up mode) |
| `/admin` | Admin (admins only) |
| anything else | A friendly "this page wandered off" page with a way home |

- A small in-house router on the History API: no new dependency. The `View`
  names stay; only the address follows them. Back and Forward work, each
  page sets its own tab title ("Quiz · Manna Money"), and nav items become
  real links (open in a new tab works).
- **New visitors land on the landing page.** Someone with no data and no
  account who opens any in-app address goes to `/`, except the entry doors
  the landing itself links to (`/import`, `/signin`, `/signup`). Once they
  step in, they move around freely for that visit, as today.
- "Leave the quiz?" also guards the browser's Back button.
- The production server already returns the app for any non-API address,
  and so does Vite in dev, so no server change is needed.

### 3. Web: the look, cleaned up (DESIGN.md rollout)

- Shared utilities in `src/index.css` (Tailwind v4 `@utility`, no new
  framework): `btn-primary` (the press-in button), `btn-secondary`,
  `btn-reward` (honey), `card` (16px corners). Swept across every screen.
- Headings and buttons move to Nunito (`font-rounded`); Fraunces stays for
  scripture and story only.
- "Not quite" and over-budget move from `rose` to `coral`; destructive
  confirmations use `rose` (not `red`), per DESIGN.md.
- Gentle motion everywhere, and calm on the money screens: each screen fades
  up on arrival (about 200ms), and popups fade and settle in. All of it
  switches off with "reduce motion".

### 4. Web: the moments

- **Right answer** (quiz and question of the day share one `AnswerChoice`):
  the answer pops green with the reward overshoot, the check draws in,
  manna flakes burst out, "+10 XP" floats up, and the chime plays.
- **Not quite**: a gentle shake, a coral outline, the soft low tone, and the
  encouraging line.
- **Quiz finished**: the score counts up around a filling ring, with
  confetti in honey, forest, cream, sky and coral and a short fanfare. Under
  half right it's a softer "drop" and no confetti: still warm, not a party.
- **Level up**: a full-screen moment. The bowl fills with manna and glows,
  a slow sunburst turns behind it, "LEVEL UP!" lands in a comic burst, the
  level number flips from old to new, the new title flips in with a shine,
  a small crowd of people cheers in a wave, confetti falls, and the sparkle
  chord plays. A **new badge** gets the same treatment, with the badge
  flipping in. Tap anywhere or press Esc to close, and it never blocks
  input. Under "reduce motion" it shows the finished picture.
- **XP anywhere**: the sidebar level widget's bar fills smoothly, a small
  "+N" floats up from it, and the level circle pops on a level change.
- **Sound controls**: a Sounds switch in Settings next to Appearance, and a
  speaker button on the quiz. Sound only plays at these moments, never on
  money screens, and stays quiet under "reduce motion" (ROADMAP.md).
- Keyboard: 1–4 pick an answer and Enter moves on.

### 5. Web: people

- A new landing section, **"Small wins, every morning"**, between "How it
  works" and "Why Manna": a row of illustrated people in dawn arches, each
  with a small win chip that pops in on scroll. They bob gently out of step
  while manna drifts behind them.
- The same cast cheers at the bottom of the level-up moment.

### 6. iPhone (`apps/mobile`)

- Add `expo-audio` and `expo-haptics`, pinned to 57.0.0 (the SDK release
  versions, per AGENTS.md), then rebuild the dev client.
- `lib/sound.ts` (respects the silent switch and mixes with the person's
  music instead of stopping it) and `lib/haptics.ts` (Success, Light
  warning, Heavy, per DESIGN.md's table).
- `AnswerOption` animates with Reanimated (pop, shake, flakes, "+10 XP").
  The quiz results count up with confetti. The same level-up and badge
  moment is mounted at the root, with the bowl filling, the crowd and
  confetti.
- Settings gets a Sounds switch; the quiz gets a speaker button.
- The Welcome screen gains the row of people.

### 7. Docs

ARCHITECTURE.md (plain voice: addresses, moments, sound, people),
DESIGN.md ("Where things stand"), ROADMAP.md (strike "A sound on the right
answer", note progress on "More game and delight"), CLAUDE.md (new commands
and web-only lib files), apps/mobile/AGENTS.md (audio, haptics,
illustrations), and the design-sync `app.css` refresh.

## Build order (one concern per commit)

1. This plan.
2. Core: sounds + generator + WAVs, sound preference, milestones, people.
   Tests.
3. Web routing + tests.
4. Web style foundation (utilities, motion keyframes, screen and popup
   entrances).
5. Web moments (answers, results, level-up and badge moment, sound
   controls).
6. Web styling sweep across the remaining screens.
7. Web people (landing section and crowd).
8. iPhone (deps, sound and haptics, answers, results, level-up, settings,
   welcome).
9. Docs and design-sync CSS.

Checks: `npm test` at each core step, `npm run lint` and `npm run build`
before done. Playwright screenshots of every moment in light and dark, and
each address. Simulator screenshots of the phone moments.

## Self-review (approved with these adjustments)

- **No false celebrations.** Milestones are measured from the first game
  state the store loads, and the store remounts on sync and account
  changes, so a pull or sign-in never celebrates someone else's progress.
- **Moments don't pile up.** A milestone waits about 1.4s after it's
  detected, so the quiz fanfare or the right-answer chime lands first and
  the level-up follows it. Several new badges at once (for example, loading
  the sample year) become one moment, not a stack of them.
- **Sound needs a tap on the web.** Browsers block audio until the person
  interacts. A level-up from the daily check-in on page load plays silently,
  which is fine.
- **The phone's level-up is an overlay, not a native modal**, because iOS
  won't present two modals at once (AGENTS.md). If it fires while a sheet is
  open, it shows when the sheet closes.
- **Design-sync**: DailyQuestionCard, ProgressWidget/Chip, BadgesCard,
  StatCard and EmptyState change their styling, not their props, so
  `entry.tsx`, `componentSrcMap`, `index.d.ts` and `dtsPropsFor` stay as
  they are. `app.css` must be regenerated, and David re-runs the sync.
- **Nothing hardcoded**: skin and hair colors are tokens in `theme.ts`; the
  components take every color from tokens.
- **Privacy**: no new network calls. Sounds and art ship with the app.

## Outcome (2026-10-03)

Built as planned, in the commit order above, on web and iPhone. Verified with
`npm test` (553 passing), `npm run lint` and `npm run build`, scripted
Playwright runs of every web moment, address and screen in light and dark at
desktop and phone widths, and a scripted run on the iPhone 17 simulator (no
harness code left behind).

What changed from the plan along the way:

- **iPhone fonts were all one weight.** Every static cut shared the
  variable source's PostScript name, so iOS merged each family into one
  weight. Fixed in `scripts/gen-mobile-fonts.py` (unique names, plus a guard)
  and the fonts regenerated. This affected the whole phone app, not just this
  work.
- **The web's phone-width tab row wrapped and clipped.** It now scrolls
  sideways instead.
- **On iPhone the sunburst painted over the title card**, so it now lives in
  its own layer behind everything.
- The landing's people section shows five across on a computer and three on
  a phone, and the longest win label was shortened so no chip runs to three
  lines.
