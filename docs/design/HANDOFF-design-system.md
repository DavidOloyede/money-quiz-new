# Design system and Omer v2: handoff

*Written 2026-10-07 after two sessions of design-system work (October 6–7).
Read this first when you bring that work into the app: Omer's new design, his
wardrobe, the drawn streak flame, and the practices in the design-system guide.
It all lives in Figma, two Claude artifacts, and the files in this folder.*

**Update, October 7 (`feature/omer-in-the-app`):** Omer, his poses and
wardrobe, the drawn streak flame and the sign-in labels are now built into
both apps; see "What is and isn't in the app" below and DESIGN.md's "Omer at
the moments". `omer.cjs` stays the design docs' copy of the drawing code, and
a test in `packages/core/lib/omer.test.ts` keeps it identical to the app's
`packages/core/lib/omer.ts`.

**Update, October 8:** the Detective stands up straight, and the Coach's
sweatband and wristbands and the Wrangler's bandana are forest-500 instead of
coral (DESIGN.md's "Outfit colors"). The design-system guide gained Section 5,
"Moments in motion": every pose and outfit animated, the Hero flying through
a sky (with a sketch of the "PAID OFF!" party), live copies of the streak
moment (day 7 is the one-week goal) and the level-up, the full level ladder
and the badges with their outfits. The part-by-part moves there (an arm, a
prop, the cape) are a spec; the app still moves Omer as one piece. Section 5
is built by `system-guide/motion.cjs` from `src/p7-motion.html` and
`src/p8-motion-script.html`.

## Where everything is

| What | Where | Notes |
| --- | --- | --- |
| **Figma file** "Manna Money — Design System" | https://www.figma.com/design/78Sw1rki7AaxCVHPPgdvX6 | Open with the Figma connector. Three pages (the Starter plan's limit): Cover + §1 Visual Language · §2 Component Library (guide on the left, editable main components on the right) · §3 Graphics System + §4 Style Guide. **Out of date on Omer**: §3.3 still shows the old pedestal foot and there is no wardrobe section yet (see "Figma follow-ups"). |
| **Design-system guide** (single page) | https://claude.ai/artifact/UvFPZk3juASfd6vQ3jtG5c | Private Claude artifact. Same content as Figma plus live specimens (quiz, question of the day, sign-in, XP card) and Section 5's animations, with an Animate / Still switch. Source: `system-guide/`. |
| **Omer model sheet v2** (review page) | https://claude.ai/artifact/7HNTp338LsrM33NLmUT12i | Private Claude artifact: before/after legs, turnaround, eight poses, wardrobe and rules. Source: `mascot/`. |
| **Omer drawing source** | `docs/design/mascot/omer.cjs` | The design docs' copy of Omer's drawing code: a small function that returns SVG markup for any view, pose or outfit. Everything else in this folder is generated from it. The app's copy is `packages/core/lib/omer.ts`; a test keeps the two identical, so change both. |
| **Omer SVGs** | `docs/design/mascot/svg/` (21 files) | Editable vectors: 4 views, 8 poses, 9 outfits. Drag into Figma, or use as references. An older copy is in `~/Downloads/omer-model-sheet-v2/`; this folder is the source of truth. |
| **Pending Figma update** | `docs/design/figma/figma-update.js` | One `use_figma` script that rebuilds §3.3 with legs, adds §3.4 Omer's wardrobe, renumbers motifs and inventory to §3.5 and §3.6, and adds the outfits row to the asset inventory. Syntax-checked, never run: no Figma calls were left on October 6, and a try on October 7 still hit the Starter limit. Since October 7 it also fixes the Level card, so one call does both. |
| **Rules** | `docs/DESIGN.md` | The rulebook. Its Omer section was updated on October 7 for the legs and wardrobe. |

To read an artifact in a later session, give Claude its link (the Artifact tool's
`read` action takes the URL), or just use the sources in this folder, which are
identical to what's published.

## Rebuilding (from the repo root)

```bash
node docs/design/mascot/export-svgs.cjs        # svg/ from omer.cjs
node docs/design/mascot/build-model-sheet.cjs  # mascot/omer-model-sheet.html
node docs/design/system-guide/build.cjs        # system-guide/manna-money-design-system.html
node docs/design/figma/assemble.cjs            # figma/figma-update.js (keep under 50,000 chars)
```

The scripts are `.cjs` because the root `package.json` is `"type": "module"`.
None of them are part of the app build, lint or tests. To republish an artifact,
publish the rebuilt HTML file to its existing URL.

## What was decided (October 6–7)

- **Omer has legs.** Two stubby legs built exactly like his arms (a 7px honey
  limb inside a 14px ink outline), hips 0.15 rim-widths apart, about 0.16
  showing, a tiny rounded foot turning outward. No knees, toes or shoes. The
  pedestal foot is gone.
- **Side view:** the one visible arm hangs at the middle of the body, in front
  of the bowl and above the legs.
- **Wardrobe** (earned = unlocks with a badge or level; contextual = appears
  with matching content):

  | Outfit | Kind | Shows up |
  | --- | --- | --- |
  | Hero: cape, flying, honey cuffs | Earned | Debt paid off ("PAID OFF!"), Debt Slayer badge, top levels. Only the Hero flies. |
  | Detective: deerstalker, magnifier over one eye | Contextual | Thinking/loading, quiz questions, "show the receipts", a new recurring charge |
  | Coach: sweatband, wristbands, barbell with black balls | Earned | The question-of-the-day streak, streak goal days, Week of Diligence, Month of Faithfulness |
  | Chef: toque, wooden spoon | Contextual | Groceries vs dining questions, cooking-at-home wins, the Dining budget |
  | Wrangler: cowboy hat, bandana, lasso | Contextual | Rounding up recurring charges and subscriptions; Know Your Flock (perfect quiz) |
  | Builder: hard hat, mallet | Earned | First Steps (first import), setting up budgets, Wise Builder (level 5) |
  | Gardener: straw hat, potted sprout | Earned | Cheerful Giver and First Fruits badges, a savings goal growing |
  | Graduate: mortarboard, diploma | Contextual | A quiz finished, a new level title |
  | Dreamer: nightcap, Z's | Contextual | After today's question ("Come back tomorrow"), quiet hours |

- **Wardrobe rules:** one outfit at a time; each outfit means one kind of
  moment; never cover the eyes or smile; palette colors and the same ink
  outline only; base Omer below 64px; never next to amounts, tables or budgets;
  no clerical costumes or religious symbols.
- **Proud pose:** the badge is pinned on the lower right of the bowl, not
  floating above him.
- **Proposed (not yet agreed in code):** ~~a drawn streak flame replaces the 🔥
  emoji; visible labels above the sign-in fields~~ (both built October 7);
  button sizes named Small 36 / Medium 44 / Large 48.

## What is and isn't in the app

**Already in the app (October 6):** the tokens and three fonts, `btn-*` and
`card` utilities, answer tiles, five of the six celebration moments with sound
and haptics, the streak moment, the level card, the sign-in module, the logo's
hover animation. The design-system guide documents these as they are.

**Not in the app yet:**

1. ~~**Omer himself.**~~ Built October 7: core `lib/omer.ts` and an `Omer`
   component on each platform (he replaced the level-up's honey bowl).
2. ~~**Legs, poses and the wardrobe.**~~ Built October 7, wired to the moments
   by core `lib/omerMoments.ts`. The Chef isn't placed yet (see DESIGN.md).
3. ~~**The drawn flame.**~~ Built October 7 (`StreakFlame` on each platform).
4. ~~**Visible labels on the sign-in fields.**~~ Built October 7, web and iPhone.
5. **The debt-paid-off party** (the Hero and a "PAID OFF!" burst), still listed as to come in DESIGN.md.
6. **Illustrated people:** removed October 6 to be redrawn (v1 on `archive/illustrated-people-v1`).
7. **Badge illustrations:** badges are emoji + name today (`packages/core/lib/badges.ts`).
8. **The final, commissioned Omer art.** The drawings here are construction
   references from `omer.cjs`. When real art arrives, it should replace the
   generated drawings behind the same component API.

## A suggested way to build it

- **One Omer for both apps.** Port `mascot/omer.cjs` to a typed, pure string
  builder in core (for example `packages/core/lib/omer.ts`). It has no DOM, so
  it is allowed in core. Web renders the SVG string inline; iPhone renders it
  with `SvgXml` from `react-native-svg` (already a dependency). A component like
  `<Omer pose="cheer" outfit="coach" size={160} />` on each platform keeps the
  door open to swap in commissioned WebP art later without touching call sites.
  Extend core's tests (CLAUDE.md: "when you touch a lib file, extend its test
  file"): every pose and outfit returns valid SVG, outfits fall back to base
  Omer below 64px.
- **Map moments to Omer** (a proposal to confirm with David):

  | Moment | Web file | iPhone file | Omer |
  | --- | --- | --- | --- |
  | Right answer | `AnswerChoice.tsx`, `celebrate/RewardBurst.tsx` | `AnswerOption.tsx`, `celebrate/RewardBurst.tsx` | Cheer |
  | Not quite | same | same | Oops |
  | Quiz intro / question | `QuizView.tsx` | `app/(tabs)/quiz.tsx` | Detective |
  | Quiz finished | `QuizView.tsx` | `app/(tabs)/quiz.tsx` | Graduate (cheer) |
  | Level up | `celebrate/MilestoneOverlay.tsx` | `celebrate/MilestoneOverlay.tsx` | Jump |
  | New badge | `MilestoneOverlay.tsx`, `BadgesCard.tsx` | same | Proud, or the badge's outfit |
  | Streak moment | `celebrate/StreakOverlay.tsx` | `celebrate/StreakOverlay.tsx` | Coach |
  | Question of the day answered | `DailyQuestionCard.tsx` | `DailyQuestion.tsx` | Dreamer ("come back tomorrow") |
  | Empty states, welcome | `EmptyState.tsx`, landing | matching screens | Idle, Wave |

- **Keep the rules:** calm at the money (no Omer on the dashboard, transactions,
  budgets, Year Sheet or imports), reduce motion gives a still pose, never block
  input, never next to an amount.
- **Respect the repo's rules** (CLAUDE.md): a feature branch, one concern per
  commit, `npm test` / `npm run lint` / `npm run build` green, the mobile
  code-sharing rule, and if Omer becomes a design-sync tracked component,
  update all four files (`.design-sync/entry.tsx`, `componentSrcMap`,
  root `index.d.ts`, `dtsPropsFor`) together. Update ARCHITECTURE.md in plain
  language when the app's behavior changes, and strike items in docs/ROADMAP.md
  as they ship.

## Figma follow-ups

- **Limits:** the team is on Starter with a View seat, which gives only
  **20 Figma MCP tool calls a month** (`create_new_file` and `whoami` are free).
  They were used up on October 6. Batch work into as few `use_figma` calls as
  possible, syntax-check scripts locally first, and expect failed scripts to
  roll back cleanly. Upgrading to Professional with a Full or Dev seat gives 200
  calls a day. Starter also allows only 3 pages per file and one mode per
  variable collection (so Light and Dark are twin collections, "Color · Light"
  and "Color · Dark").
- **To do when calls are available:** run `figma/figma-update.js` in one
  `use_figma` call (file key `78Sw1rki7AaxCVHPPgdvX6`; it targets page `4:63`
  and frame `10:2`). Its last step also fixes the Level card component
  (`8:316`, on page `4:62`): the subtitle "40 / 120 XP to level 4" becomes
  "120 / 300" (the app's formula, 50 · L · (L − 1), at level 3) and the bar
  fills 40%; it returns what it changed. Rebuild it with
  `node docs/design/figma/assemble.cjs` after editing the header or body.
- **Node IDs** (for scripts): pages `0:1`, `4:62`, `4:63`; frames Cover `5:2`,
  §1 `5:55`, §2 guide `9:147`, Main components `7:2`, §3 `10:2`, §4 `12:47`;
  component sets Button `7:172`, Input `7:202`, Chip `7:225`, Answer tile
  `7:281`, Progress bar `7:300`, Score ring `7:317`, Streak pips `7:334`,
  Question of the day `8:89`, Sign-in module `8:293`, Stat card `8:306`;
  components Quiz intro `8:90`, Quiz question `8:105`, Quiz result `8:160`,
  Verse `8:307`, Level card `8:316`; icons Check `7:12` … Flame `7:54`, Google `7:60`.

## Prompt for the next session

Paste this to pick the work up:

> Read `docs/design/HANDOFF-design-system.md`, `docs/DESIGN.md`, `CLAUDE.md`
> and `apps/mobile/AGENTS.md`. Then plan, before building anything, how to bring
> the October 2026 design-system work into the app on web and iPhone: Omer as
> one shared component (ported from `docs/design/mascot/omer.cjs` into
> packages/core and rendered on both platforms), his poses and wardrobe wired to
> the moments in the handoff's table, the drawn streak flame replacing the
> emoji, and visible labels on the sign-in fields. Show me the plan in phases
> with the files each phase touches, and ask me about anything in the
> moment-to-outfit table you'd change. Once I approve, work on a feature
> branch, one concern per commit, keeping `npm test`, `npm run lint` and
> `npm run build` green, and update DESIGN.md, ARCHITECTURE.md and
> docs/ROADMAP.md as you go. If Figma MCP calls are available, also run
> `docs/design/figma/figma-update.js` and fix the Level card numbers.
