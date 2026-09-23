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
| Quiz finished | Confetti in honey, forest and cream; Omer cheers; the score counts up | A short fanfare | Success |
| Streak or daily check-in | The flame grows and one flake drops into the bowl | A soft "drop" | Light tap |
| Level up or new badge | The bowl fills and glows; the new title or badge flips in with a shine | A sparkle chord | Success |
| Debt paid off | The biggest party: Omer in a cape and a comic "PAID OFF!" burst | The fanfare | Heavy |

- **Celebrate learning and wise choices, never spending.** Money screens only
  celebrate milestones the person confirms, like a paid-off debt.
- **Keep big celebrations for milestones**, so they stay special.

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
- A free starting set: Kenney Interface Sounds (CC0, no credit needed).

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
  glossy eyes with small star highlights, rosy cheeks, tiny arms, bold clean
  outlines and flat cel shading. Cheerful and kind, not babyish.
- **Comic energy only at reward moments:** halftone bursts, speed lines,
  one-word shouts ("NICE!", "+10 XP"). A small cape is earned at a high level
  or with the Debt Slayer badge.
- **Eight poses:** idle (gentle breathing), wave hello, cheer (right answer),
  jump (level up), thinking (loading or a question), oops (not quite, still
  smiling), proud (badge), giving (holding out a flake, for generosity).
- **Stay original.** When generating art, describe traits; never prompt "in
  the style of" a studio, show or hero.
- **Files:** the app uses transparent WebP poses and sprite sheets from
  `public/mascot/`, each under about 150 KB. The master image and turnaround
  sheet live in `docs/design/mascot/`, so any tool can redraw Omer
  consistently. The art is arriving separately.

## Where things stand (September 2026)

- **Done:** the sky and coral colors, the Nunito font, the softenable
  Fraunces, and this page.
- **Not yet:** existing screens haven't been restyled, apart from the four
  small info badges that already used `sky`. Quiz wrong answers are still
  `rose`. The iPhone app still uses rose for errors and 10/14px corners.
  Omer, sound and celebrations come next, then a rollout through every
  screen on both platforms.
