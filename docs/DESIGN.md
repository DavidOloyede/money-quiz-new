# Manna Money design system

*Started 2026-09-23. This is the rulebook for how Manna Money looks, moves,
sounds and talks. Read it before you build or restyle a screen. The exact
colors and fonts live in code (see "Where the tokens live"); this page says
when to use which.*

## The one rule: playful at the moments, calm at the money

Manna Money should feel as warm as Duolingo, as friendly as a storybook, and
as trustworthy as EveryDollar. Where each feeling goes depends on the screen:

- **Moments are playful.** The quiz, the question of the day, streaks, badges,
  level-ups and milestones like a paid-off debt get color, bounce, sound and
  Omer.
- **Money is calm.** The dashboard, transaction table, Year Sheet, budgets
  and imports stay quiet and steady: clear numbers, no confetti, no alarms.

If you're unsure, ask: "Is the person learning or celebrating right now, or
are they reading their money?" Only the first gets the party.

## Color

Each color has one job. Stick to the job and the app reads as calm even when
it's playful.

| Color | Its job | Typical use |
| --- | --- | --- |
| **cream / linen** | The page | Page background `bg-linen-50`, cards `bg-cream`, text `text-linen-900`, quiet text `text-linen-500` |
| **forest** | The action | Primary buttons `bg-forest-600`, links, "correct", income |
| **honey** | The reward | XP, streaks, badges, manna, the spending series in charts |
| **sky** | The backdrop and "for your info" | Hero backgrounds, info badges ("In progress", "Synced") |
| **coral** | "Not quite" | Wrong answers, over budget, a negative month, always with a next step |

**The mix.** Aim for about 60% cream and linen, 30% forest and sky, and 10%
honey. Honey is special because it's scarce: if everything is gold, nothing
feels earned.

**The dawn backdrop.** Manna arrived each morning, so hero areas use a soft
morning sky: cream fading through a peach glow into pale blue, e.g.
`bg-linear-to-b from-cream via-honey-100 to-sky-100`. The gradient carries the
story on its own, with no scripture needed. Use it for heroes and big
moments only, never behind tables or numbers.

### Contrast (text must pass 4.5:1)

Every pair below passes WCAG AA for normal text. The pairs for the two new
colors are locked by a test (`packages/core/theme.test.ts`), so a future
tweak can't quietly break them.

| Pair (light mode) | Ratio | Pair (dark mode, on a `linen-900` card) | Ratio |
| --- | --- | --- | --- |
| `linen-900` on `cream` | 16.8 | `linen-100` on `linen-900` | 15.0 |
| `linen-500` on `cream` | 5.7 | `linen-400` on `linen-900` | 5.7 |
| white on `forest-600` | 6.1 | `forest-300` on a `forest-500/10` wash | 7.8 |
| `forest-700` on `forest-50` | 7.5 | `honey-300` on a `honey-500/10` wash | 9.4 |
| `honey-700` on `honey-50` | 5.8 | `sky-300` on a `sky-500/10` wash | 8.9 |
| `sky-700` on `sky-50` | 5.5 | `coral-300` on a `coral-500/10` wash | 8.1 |
| `coral-700` on `coral-50` | 5.5 | | |
| `coral-800` on `coral-50` | 7.2 | | |
| white on `coral-600` | 4.5 | | |
| white on `sky-700` | 5.9 | | |

The rules that fall out of that:

- **Text on a light tint uses the 700 or 800 step.** The 600 step is for icons
  and solid fills. For example, `coral-600` on `coral-100` is only 3.75, fine
  for an icon and too faint for words.
- **No white text on `sky-600`** (4.0). Use `sky-700` or darker.
- **Never use color alone.** "Right" and "not quite" always come with an
  icon (✓ / ✕) or a word, because red-green color blindness is common.
- **No red alarms on money screens.** Over budget or a negative month is
  coral plus a next step ("$40 over. Want to move it from Dining?"). Tailwind's
  `rose` stays only for destructive confirmations (delete, clear all data),
  where a real alarm is the point.

### Where the tokens live

All colors and fonts are defined once in `packages/core/theme.ts`, which both
the website and the iPhone app read. After changing it, run
`npm run gen:theme` to regenerate the website's `src/theme.css`. Never edit
that file by hand. Two notes on the newer colors:

- **coral** matches the brightness of Tailwind's `rose` step for step, so
  replacing `rose-N` with `coral-N` keeps every contrast pair.
- **sky** matches Tailwind's `sky` the same way and replaces it: any
  `sky-*` class in the app is now our softer dawn blue.

## Type: three voices

| Voice | Font | Utility | Use it for |
| --- | --- | --- | --- |
| **The coach** | Nunito (rounded) | `font-rounded` | Headlines, buttons, quiz and game text, badges, celebration words |
| **The storyteller** | Fraunces, softened | `font-display font-soft` | Scripture, the verse of the day, the "Why Manna?" story |
| **The ledger** | Inter | `font-sans` (the default) + `tabular-nums` | Tables, amounts, money columns, forms, ordinary body text |

- Nunito looks best bold: 700 to 800 for headlines and buttons, 600 for game
  text.
- `font-soft` turns Fraunces's SOFT axis all the way up (100), which rounds
  off its sharp corners. Without it, Fraunces looks exactly as it does today.
- Money always uses Inter with `tabular-nums`, so columns of numbers line up.
- All three fonts ship with the app from `public/fonts/`. There's no font
  service, so nobody watches you download them.

## Shape and space

- **Cards:** 16px corners, `rounded-2xl`.
- **Buttons:** 12px corners, `rounded-xl`.
- **Chips and tags:** full pills, `rounded-full`.
- **Primary buttons press in.** They have a 4px darker edge along the bottom
  that shrinks when pressed, so the button feels physical:

  ```
  rounded-xl bg-forest-600 font-rounded font-bold text-white
  shadow-[0_4px_0_var(--color-forest-800)]
  active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-forest-800)]
  transition-[translate,box-shadow] duration-150
  ```

  A reward button uses the same recipe in honey (`bg-honey-400`,
  `text-linen-900`, edge `honey-600`).
- **Touch targets** are at least 44px tall.
- **Every field has a visible label** above it (Inter 500, 13px, `linen-700`,
  6px above the box). A placeholder is an example ("you@example.com"), never
  the field's only name: it vanishes as soon as you type. Hints like "8 or
  more characters" go under the field, and errors say what's wrong in coral,
  next to it.
- **Landing-page sections** get 80 to 120px of space above and below.

## Motion

| Kind | How long | Feel |
| --- | --- | --- |
| UI feedback (hover, press, open/close) | 150 to 250ms | Quick and plain |
| Rewards (right answer, +XP, a flake landing) | 600 to 1200ms | A slight overshoot, like a little bounce: `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Milestones (level up, badge, debt paid off) | Up to about 3s | The one time it's allowed to be big |

- **Never block input.** The next tap always works, even mid-celebration, and
  tapping anywhere dismisses a celebration.
- **Respect "reduce motion."** With `prefers-reduced-motion`, skip particles
  and bounces and just show a check mark, as the logo already does.

## Celebration moments

Six moments cover almost all the joy. Everything else stays calm.

| Moment | What you see | What you hear | iPhone haptic |
| --- | --- | --- | --- |
| Right answer | The answer pops green; a few manna flakes fall into the bowl by the XP counter; "+10 XP" floats up | A bright two-note chime | Success |
| Not quite | A gentle shake, a coral outline, Omer's "oops" face and an encouraging line | A soft low tone, never a buzzer | Light warning |
| Quiz finished | Confetti in honey, forest and cream; Omer cheers in his graduation cap beside the score; the score counts up | A short fanfare | Success |
| Streak (answering the question of the day) | The flame lights and flickers, the day count flips up, and the way to the next goal fills (a pip per day to a week, a bar after). "Keep going" closes it, and a bar under the button drains over 10s and closes it when empty, so it never vanishes unannounced. On a goal day (no countdown) (a week, two weeks, a month…) a shout, sunburst, confetti and Omer as the Coach beside the flame | A soft "drop" (the sparkle on a goal day) | Light tap (Success on a goal day) |
| Level up or new badge | Omer jumps and glows as manna falls into his rim; the new title or badge flips in with a shine, Omer beside the medal in its outfit | A sparkle chord | Success |
| Debt paid off | The biggest party: Omer in a cape and a comic "PAID OFF!" burst | The fanfare | Heavy |

- **Celebrate learning and wise choices, never spending.** Money screens only
  celebrate milestones the person confirms, like a paid-off debt.
- **Keep big celebrations for milestones**, so they stay special.
- **The streak flame is drawn, never the 🔥 emoji** (October 2026): a
  coral-400 flame with a coral-700 edge and a honey-300 core, the same on
  every device. It's grey and faded until today's question is answered.
  Both apps draw it from `packages/core/lib/streak.ts`.

## Sound

- **Five sounds at most:** chime, soft low tone, drop, sparkle, fanfare.
- **Quiet:** it should sit under the phone's normal volume, not on top of it.
- **Short:** each one under 1 second. The quiz-finished fanfare can run to
  2 seconds.
- **On by default only in quizzes.** Everywhere else is silent unless the
  person turns sound on.
- **Always mutable:** a sound toggle in Settings next to Appearance, plus a
  speaker icon on the quiz. The setting is saved under a *new*
  `moneyquiz.*` key. Never rename an existing key: that would orphan
  everyone's synced data.
- On iPhone, sounds respect the silent switch.
- **The five sounds are our own** (October 2026): small synthesis recipes in
  `packages/core/lib/sounds.ts`, rendered to WAV for both apps by
  `npm run gen:sounds`. A test holds them to the rules above (short, quiet).
  To swap in recorded sounds later (Kenney Interface Sounds are CC0), drop
  same-named files into `public/sounds/` and `apps/mobile/assets/sounds/`.
- The setting lives under `moneyquiz.sound.v1`, per device (not synced).
  Sound also stays off under "reduce motion".

## Voice

Warm, short, specific. Faith-informed, never preachy.

| Instead of | Say |
| --- | --- |
| "Incorrect." | "Not quite. It was Dining, by $42." |
| "Great job!" | "Nice! You found your top expense." |
| "WARNING: Budget exceeded" | "$40 over on Dining this month. Want to adjust it?" |
| "Maximize your savings potential" | "A little set aside each week adds up." |
| "God wants you to budget" | "Enough for today, and a plan for tomorrow." |

- Name the actual thing: the category, the amount, the streak day.
- One idea per message. If it needs a second sentence, the second one is the
  next step.
- Words that welcome everyone: *provision, steward, generosity, daily bread*.
  Scripture lives in its own places (the verse of the day and the quiz
  takeaways), not sprinkled through buttons and errors.

## Omer, the mascot

Omer is a round, honey-gold manna bowl with a friendly face, who catches the
manna falling from the logo. The logo and the mascot tell one story, and the
bowl can show progress by filling as you earn XP and glowing at level-up.

- **The name** is a quiet nod: an omer was the daily measure of manna each
  person gathered (Exodus 16:16). People who know the story will smile; everyone
  else just sees a cute name.
- **The look:** honey-gold body (`honey-400`, #e5b13c) with a cream rim, big
  glossy eyes with small star highlights, rosy cheeks, tiny arms, two stubby
  legs, bold clean outlines and flat cel shading. Cheerful and kind, not
  babyish.
- **Arms and legs** (decided October 7, 2026, replacing the old pedestal
  foot): the legs are built exactly like the arms, short and straight with
  round ends, and each foot is a tiny nub that turns outward. No hands, knees,
  toes or shoes, so a pose is just a bend. From the side, the one visible arm
  hangs at the middle of the body, in front of the bowl.
- **Comic energy only at reward moments:** halftone bursts, speed lines,
  one-word shouts ("NICE!", "+10 XP"). A small cape is earned at a high level
  or with the Debt Slayer badge.
- **Eight poses:** idle (gentle breathing), wave hello, cheer (right answer),
  jump (level up), thinking (loading or a question), oops (not quite, still
  smiling), proud (a badge pinned on the lower right of the bowl), giving
  (holding out a flake, for generosity).
- **The wardrobe** (decided October 7, 2026): a costume for each kind of
  moment, so the outfit says what's happening before anyone reads a word.
  Base Omer stays the default. Earned outfits unlock with a badge or level:
  the Hero (the cape, and the only one who flies) for a paid-off debt, the
  Coach (sweatband, wristbands, a barbell) for the streak, the Builder (hard
  hat) for first steps and Wise Builder, the Gardener (straw hat, a sprout)
  for giving. Contextual outfits appear with matching content: the Detective
  (deerstalker, magnifier) for questions and receipts, the Chef for food, the
  Wrangler (cowboy hat, lasso) for rounding up subscriptions, the Graduate
  for a finished quiz, the Dreamer (nightcap) for "come back tomorrow". One
  outfit at a time, never covering the eyes or smile, palette colors only,
  base Omer below 64px, and no religious costumes or symbols.
- **Outfit colors** (decided October 8, 2026): where a costume's color is
  free, it wears the app's forest green: the Coach's sweatband and
  wristbands and the Wrangler's bandana are forest-500 (red is what people
  expect, green keeps him on theme). A costume keeps another color only when
  that color is what makes it recognizable: the Chef's white toque, the
  Dreamer's blue nightcap, the Detective's tan deerstalker, and the
  Builder's coral hard hat (a yellow one would vanish into his honey body,
  a green one reads as an army helmet). The Detective stands up straight;
  only the thinking pose crosses its legs.
- **Stay original.** When generating art, describe traits; never prompt "in
  the style of" a studio, show or hero.
- **Files:** in the app (since October 7, 2026) Omer is drawn by
  `packages/core/lib/omer.ts`, a port of `docs/design/mascot/omer.cjs` (a
  test holds the two to identical drawings, so change them together), and
  shown by one `Omer` component on each platform: an `<img>` on the web,
  react-native-svg's `SvgXml` on the iPhone. The commissioned art is
  arriving separately; when it does, it replaces these construction
  drawings inside those two components (transparent WebP, each under about
  150 KB), and no screen that shows him has to change. The master image and
  turnaround sheet will live in `docs/design/mascot/`, next to the
  construction drawings of every view, pose and outfit.
- **In dark mode** he gets a faint cream rim, so his ink outline doesn't
  vanish into a dark card. Under "reduce motion" he stands still.
- **Motion** (built October 7, 2026, from the design-system guide's
  Section 5): he pops in, then plays one signature move for his pose or
  outfit (the wave rocks from the shoulder, the Coach does reps, the
  Wrangler's lasso spins, the Builder taps his mallet, the Graduate tosses
  his cap, the Hero's cape ripples). Every move pivots at a joint, stays
  small (limbs turn 6–16°) and starts and ends on the drawn pose. A moment
  plays its move for about five seconds and he settles; only breathing and
  blinking keep going. Reduce motion shows the still pose. The moves are
  data in core `lib/omerMotion.ts`, so the website and the phone play the
  very same keyframes.
- **References:** the Figma file, the single-page design-system guide and the
  plan for building Omer into the app are all listed in
  `docs/design/HANDOFF-design-system.md`.

### Omer at the moments

Which Omer appears where, decided October 7, 2026. Both apps read it from
`packages/core/lib/omerMoments.ts`, so change it there (and here).

| Moment | Omer | Where |
| --- | --- | --- |
| Quiz start | The Detective (thinking below 64px) | The quiz intro |
| After each answer | Cheer or Oops, 56px | Beside "Next question", away from the answer detail and its amounts |
| Quiz finished | The Graduate | Beside the score ring |
| Level up | Jumps; the Builder at level 5 (Wise Builder), the flying Hero from level 8 (Trusted Steward) | Where the filling bowl used to be |
| New badge | The badge's outfit (Builder, Coach, Wrangler, Gardener, Hero), or Proud when several badges disagree | Beside the medals |
| Streak goal day | The Coach | Beside the flame; ordinary days stay flame-only |
| Question of the day, answered | The Dreamer | Beside "Come back tomorrow", at the foot of the card |
| No data yet, welcome | Wave (Idle in the landing hero, Cheer in its closing scene) | The quiz's empty state, the phone's welcome, the landing |

- **Earned outfits appear with the moment that earns them**: the Coach with
  the first streak goal (day 7 is also the Week of Diligence badge), the
  Builder with First Steps and level 5, the Gardener with the giving badges,
  the Hero with Debt Slayer and level 8.
- **Never on the money screens**, even when they're empty: the dashboard,
  transactions, budgets, Year Sheet and imports keep their quiet icons.
- **The Hero's "PAID OFF!" party** plays when a loan is confirmed paid off:
  he swoops in with a loop-the-loop and flies through a dawn sky while
  clouds, wind and manna stream past, "PAID OFF!" lands in a comic burst and
  confetti pops out of it. The first payoff brings the Debt Slayer badge
  inside the party instead of in a second moment after it.
- **Not yet placed:** the Chef (his moments, food questions and the Dining
  budget, would sit next to amounts or give a quiz answer away).

## Illustrated people

**Taken out on October 6, 2026, to be redrawn.** The first cast (ten people
drawn as simple shapes in `packages/core`, kept on the
`archive/illustrated-people-v1` branch) appeared on the landing's "Small
wins, every morning", in the crowd that cheered a level-up, on the quiz
intro and on the phone's welcome.
David wants them back with better drawings and motion; until then the
level-up cheers with a row of sparkles and nothing else uses people. When
they return, the rules below still hold.

The first cast shared one style with Omer: bold clean outlines, flat color,
white-rimmed eyes that read on every skin tone, rosy cheeks and a big smile.

- **Many households, many faces.** The cast leans deliberately toward the
  deepest skin tones (the first cast had a test keeping at least 60% at the
  two deepest; bring one back with the redraw), with a range of hair (afro
  puffs, locs, braids, a fade, a headwrap, a hijab, curls, a bob, an
  elder's silver bun) and ages.
- **Colors come from the palette.** Skin and hair belong in `theme.ts` as
  tokens (the first cast's `illustration` tokens left with it); clothes use
  the brand ramps.
- **Illustrations, not testimonials.** No names, no quotes. A win chip
  shows the kind of small win the app is about.
- **Motion** (the first cast's): a slow sway out of step (3 to 4s a cycle),
  a wave, and at a level-up a hop in a wave with arms pumping. Reduce motion
  keeps them still.

## Where things stand (October 2026)

- **Done (October 3, `feature/celebrations-and-routes`):** the web rollout.
  Every screen uses Nunito headings and buttons, Fraunces only for scripture,
  Inter with tabular numbers for money, coral for "not quite" and over
  budget, rose only for destructive actions, the press-in buttons
  (`btn-primary`, `btn-secondary`, `btn-reward`, `btn-danger`) and the
  16px `card` surface. The five moments that involve answers and levels
  (right answer, not quite, quiz finished, level up or new badge) are built
  on both platforms, with sound and iPhone haptics. The streak moment is
  the flame flicker; the debt-paid-off party is still to come.
- **Done (October 6, `feature/streak-moment`):** the streak moment, on both
  platforms. The streak now counts answering the question of the day (right
  or wrong; quiz answers don't count) instead of opening the app, and the
  flame shows grey until today has counted. The illustrated people are out until they're redrawn.
- **Done (October 7, `feature/omer-in-the-app`):** Omer in the app on both
  platforms, at the moments in "Omer at the moments", with his poses and
  wardrobe; the drawn streak flame instead of the emoji; visible labels on
  the sign-in fields.
- **Done (October 7, `claude/youthful-lamport-qv4guf`):** the design guide's
  Section 5 in the app on both platforms: every pose's and outfit's own
  move, the Builder's extra hop at level 5, the Coach's reps on streak goal
  days, and the debt-paid-off party with the flying Hero.
- **Still to come:** Omer's commissioned artwork (construction drawings
  stand in for it), drawn badge medals (emoji stand in for them), and the
  rest of the celebration list.
- **Designed October 6–7:** the full design system in Figma and as a
  single-page guide (`docs/design/HANDOFF-design-system.md` lists where
  everything is). Omer's legs and wardrobe, the drawn flame and the sign-in
  labels were built on October 7; the button size names (Small 36, Medium
  44, Large 48) are still only a proposal.

## Where things stood (September 2026)

- **Done:** the sky and coral colors, the Nunito font, the softenable
  Fraunces, and this page.
- **Not yet:** existing screens haven't been restyled, apart from the four
  small info badges that already used `sky`. Quiz wrong answers are still
  `rose`. Omer, sound and celebrations come next, then a rollout through
  every screen on both platforms.
- **The iPhone app got there first (Sep 24, 2026):** its titles and buttons
  are Nunito, Fraunces is kept for scripture, errors and "over budget" use
  coral, info badges use sky, cards and buttons have 16/12pt corners, and the
  primary button presses in on its darker bottom edge.
