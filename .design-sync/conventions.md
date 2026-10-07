# Building with Manna Money

Manna Money is a faith-informed personal-finance app: a dashboard, a daily
money question, and quizzes with streaks, XP and badges. Rule of thumb:
**playful at the moments, calm at the money** - neutral linen surfaces and
forest green for the money; honey and celebration only for wins. Copy is warm
and encouraging, never generic fintech and never preachy.

## Setup

- Wrap the whole tree once in `StoreProvider` (`window.MoneyQuiz.StoreProvider`).
  `ProgressWidget`, `ProgressChip`, `TopMerchantsCard` and `DailyQuestionCard`
  read the app store and render nothing useful without it. It loads saved state
  from localStorage on mount; no network.
- Dark mode is class-based: put `dark` on `<html>`. Components already carry
  their `dark:` styles; give your own glue the same treatment.
- `styles.css` ships the fonts (Fraunces, Inter, Nunito). Nothing to load.

## Styling: Tailwind classes from a frozen build

`_ds_bundle.css` is the app's compiled Tailwind v4 output. There is no Tailwind
compiler at design time, so **only classes the app already uses exist**. Use
the names below; for anything else, search `_ds_bundle.css` first - a class
that isn't there renders unstyled.

| Role | Classes |
|---|---|
| Surfaces | `card` (border, radius, cream fill; add padding: `p-5`), `bg-cream`, `bg-linen-50`, `border-linen-200`, `rounded-xl`, `rounded-2xl` |
| Text | `text-linen-900` (ink), `text-linen-500` (muted) |
| Dark | `dark:bg-linen-900`, `dark:border-linen-700`, `dark:text-linen-50`, `dark:text-linen-400` |
| Good news, primary | `text-forest-600`, `bg-forest-600` |
| Over budget, negative, "not quite" | `text-coral-700`, `bg-coral-50` (coral, never red) |
| Rewards, money-out chips | `bg-honey-50`, `text-honey-700` |
| Info | `text-sky-700` |
| Destructive actions only | `text-rose-600`, `btn-danger` |
| Buttons | `btn-primary`, `btn-secondary`, `btn-reward`, `btn-danger` - complete color/press styles; add only size: `px-4 py-2 text-sm` |
| Type | `font-rounded` (Nunito: headings, game text), default sans (Inter: body), `font-display` (Fraunces: scripture only), `tabular-nums` on every money figure |
| Size | `text-xs`, `text-sm`, `text-lg`, `text-2xl`, `font-semibold`, `font-bold`, `font-extrabold`; labels `uppercase tracking-wide text-xs` |
| Layout | `flex`, `grid`, `grid-cols-2`, `grid-cols-3`, `sm:grid-cols-3`, `gap-2`/`gap-3`/`gap-4`, `p-4`/`p-5`/`p-6`, `space-y-3`, `items-center`, `justify-between`, `max-w-md`, `max-w-2xl` |

## Where the truth lives

- `styles.css` and the `_ds_bundle.css` it imports: every class and token
  (`--color-forest-600`, `--font-rounded`, ...) that exists.
- `components/<group>/<Name>/<Name>.d.ts` and `<Name>.prompt.md`: props and
  examples. `StatCard`'s `accent` takes one text-color class
  (`text-forest-600` good news, `text-coral-700` negative).

## Example

```jsx
const { StoreProvider, StatCard, ProgressWidget, VerseOfDay } = window.MoneyQuiz;

<StoreProvider>
  <div className="max-w-2xl space-y-3 p-4">
    <VerseOfDay />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Net this month" value="+$1,284" sub="Income − spending" accent="text-forest-600" />
      <StatCard label="Over budget" value="−$148" sub="Dining + shopping" accent="text-coral-700" />
      <StatCard label="Income" value="$4,796" sub="3 deposits" />
    </div>
    <ProgressWidget />
    <div className="card p-5">
      <h3 className="font-rounded text-lg font-bold text-linen-900 dark:text-linen-50">You're on track</h3>
      <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">Small wins add up. Groceries came in under budget again.</p>
      <button className="btn-primary mt-4 px-4 py-2 text-sm">See my budget</button>
    </div>
  </div>
</StoreProvider>
```
