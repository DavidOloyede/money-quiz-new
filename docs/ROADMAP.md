# Manna Money product roadmap

The running list of what's built, what's next, and what's later. This is the
product roadmap; the phone app's build plan lives in
[ROADMAP-mobile.md](ROADMAP-mobile.md).

**How to keep this file:** never delete a line. When something ships, strike it
through (`~~like this~~`) and add the date. When a plan changes, strike the old
line and add the new one under it.

_Started 2026-09-24._

## Now

- [ ] **Import CSV screen clarity.** Clearer "where is this file from?"
      (checking vs. credit card) and "money out / money in" instead of
      "debit / credit", with the user's own rows shown under each column.
      A stopgap: connecting a bank is meant to be the main way in.
      _Built on `feature/import-csv-clarity` 2026-09-24, waiting on review._
- [ ] **Google sign-in, live in production.** The app already supports it
      (Supabase Auth); finish the Google Cloud + Supabase provider setup in
      docs/SETUP-backend.md and turn it on for real users.
- [ ] **Real bank connections for everyone.** Plaid works end to end; finish
      Plaid production access so anyone can link a real bank.
- [x] ~~**A sound on the right answer.** A short, happy chime alongside the
      green pop and confetti. Needs a mute switch in Settings, stays quiet
      when the device asks for reduced motion or is on silent, and follows
      the sound rules in docs/DESIGN.md.~~
      _Built 2026-10-03 on `feature/celebrations-and-routes` (web + iPhone),
      with all five DESIGN.md sounds, a Sounds switch and a quiz speaker
      button. Waiting on review._
- [x] ~~**Celebrations and a clear level-up, web and iPhone.** Right answer,
      not quite, quiz finished, and a full-screen level-up / new-badge
      moment, with iPhone haptics.~~ _Built 2026-10-03, waiting on review._
- [x] ~~**Real web addresses.** Every screen at its own address (`/quiz`,
      `/dashboard`, `/year`…), new visitors land on the welcome page first,
      and a friendly not-found page.~~ _Built 2026-10-03, waiting on review._
- [x] ~~**Illustrated people of many backgrounds**, leaning toward the
      deepest skin tones, on the landing, the level-up and the phone's
      welcome.~~ _Built 2026-10-03, waiting on review. Taken out again
      2026-10-06 to be redrawn (see "Illustrated people, redrawn" below)._
- [x] ~~**A streak kept by the question of the day, with its own moment.**
      Answering the question of the day, right or wrong, counts the day and
      earns its streak points (quiz answers don't); a flame lights,
      the count flips up, and a track fills toward a week, then two weeks or
      a month and beyond, with a bigger party on each goal day. Web and
      iPhone.~~ _Built 2026-10-06, waiting on review._

## Next

- [ ] **Earn-it Year Sheet + subscription ("Manna Plus", name TBD).**
      Subscribers get the full year-end planning sheet. Free users can unlock
      it too by keeping a streak *and* answering a set number of daily
      questions correctly that day. Paying buys convenience; showing up earns
      access. This is the main "come back tomorrow" hook, and it keeps people
      informed on their money so they use the other features.
      Open questions: how many correct answers count for the day; what a free
      user sees when the streak breaks (a preview? a grace day?).
- [ ] **AI money coach.** A big part of the app: explains your money in plain
      words ("where did my money go?"), teaches the money idea behind each quiz
      question, and helps organize transactions (categories, renames,
      recurring). Must keep the privacy rules in CLAUDE.md: no money data sent
      anywhere without the user choosing it.
- [ ] **iPhone app in the App Store.** Built (apps/mobile); TestFlight for
      friends first, then App Store review.
- [ ] **More game and delight, like Duolingo.** Omer the mascot's artwork,
      streak freezes, daily goals, more animations, more badges, and small
      celebrations that make people want to come back.
      _Progress 2026-10-03: the answer, quiz-finished and level-up / badge
      celebrations are built on both platforms. Still to come: Omer's art,
      streak freezes, daily goals, the debt-paid-off party, more badges._
      _Progress 2026-10-06: the streak moment is built on both platforms._
- [ ] **Illustrated people, redrawn.** Bring people back with richer
      drawings and better animation than the first simple-shape cast (taken
      out 2026-10-06; it's kept on the `archive/illustrated-people-v1` branch).
      Same rules as before: many backgrounds, leaning toward the deepest
      skin tones, illustrations rather than testimonials (docs/DESIGN.md).

## Later

- [ ] **Church partnerships.** A church or financial ministry sponsors the
      subscription for its members; start with a 20-50 member pilot.
- [ ] **Android app.** The shared engine (packages/core) makes this a smaller
      step than the iPhone app was.

## Pitch notes to build into the product story

- Personal: why David built it, how it affects families, churches and the
  next generation, what's different from other money apps, and why
  Christians and everyone else need it. The full pitch prep lives in the
  "Manna Money - Pitch & Praise Prep" doc (2026-09-24).
