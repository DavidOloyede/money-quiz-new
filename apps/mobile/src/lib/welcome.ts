/**
 * Whether the welcome screen has been answered during this launch. Held in
 * memory on purpose, like the web's landing page: someone signed out with
 * no data sees the welcome each time they open the app, until they pick a
 * way in (and once they have data or an account, never again).
 */
let answered = false

export function welcomeAnswered(): boolean {
  return answered
}

export function answerWelcome(): void {
  answered = true
}
