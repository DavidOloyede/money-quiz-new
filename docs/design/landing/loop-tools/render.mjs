// Standalone renderer for the design loop. Each call launches its own headless
// Chromium, so parallel agents never fight over one browser.
//
// Usage:
//   node render.mjs --out <dir> [--url http://localhost:5199/] [--selector '#landing-hero']
//        [--widths 1440,390] [--theme light|dark] [--reduced] [--full]
//        [--frames 8 --interval 250]   (filmstrip of the element over time)
//        [--press 'button text']       (screenshot mid-press of that button)
// Our app URL gets localStorage cleared (fresh signed-out visitor, no data).
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
// Playwright isn't a project dependency; point PLAYWRIGHT_DIR at any node_modules
// folder that has it (e.g. an npx cache, or `npm i -D playwright` somewhere).
const require = createRequire(
  (process.env.PLAYWRIGHT_DIR ?? '/Users/doloy/.npm/_npx/e41f203b7505f1fb/node_modules').replace(/\/?$/, '/'),
)
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf('--' + k); return i === -1 ? d : args[i + 1] }
const flag = (k) => args.includes('--' + k)
const url = opt('url', 'http://localhost:5199/')
const out = opt('out')
const selector = opt('selector')
const widths = opt('widths', '1440,390').split(',').map(Number)
const theme = opt('theme', 'light')
const frames = Number(opt('frames', 0))
const interval = Number(opt('interval', 250))
const press = opt('press')
if (!out) { console.error('--out required'); process.exit(1) }
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const ours = url.includes('localhost')
for (const w of widths) {
  const h = w < 600 ? 844 : 900
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    reducedMotion: flag('reduced') ? 'reduce' : 'no-preference',
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  if (ours) {
    await ctx.addInitScript((t) => {
      if (!sessionStorage.getItem('__dl_init')) {
        localStorage.clear()
        sessionStorage.setItem('__dl_init', '1')
      }
      localStorage.setItem('moneyquiz.theme.v1', JSON.stringify(t))
    }, theme)
  }
  await page.goto(url, { waitUntil: 'networkidle' })
  // --prod: hide only the dev-only Omer slot outline/label, as production does;
  // the slot's reserved space stays.
  if (flag('prod')) await page.addStyleTag({ content: '[data-slot="omer"]{border-color:transparent!important;outline-color:transparent!important;background:none!important;box-shadow:none!important}[data-slot="omer"] *{visibility:hidden!important}' })
  await page.waitForTimeout(800)
  const tag = `${w}-${theme}${flag('reduced') ? '-reduced' : ''}`
  const target = selector ? page.locator(selector).first() : null
  if (flag('scrollthrough')) {
    // Scroll the whole page like a visitor would, so scroll-triggered
    // reveals fire, then come back to the target.
    const H = await page.evaluate(() => document.body.scrollHeight)
    for (let y = 0; y < H; y += Math.round(h / 3)) {
      await page.evaluate((y) => window.scrollTo(0, y), y)
      await page.waitForTimeout(350)
    }
    await page.waitForTimeout(1500)
    if (flag('revisit')) {
      // Second pass: back to the top, then return, to prove motion replays.
      await page.evaluate(() => window.scrollTo(0, 0))
      // --topwait 0 for the hero: it replays the moment the page is back on top.
      await page.waitForTimeout(Number(opt('topwait', 1200)))
    }
  }
  if (target) await target.scrollIntoViewIfNeeded()
  if (flag('tall') && target) {
    // Fit the whole section on screen so every row is in view and settled,
    // as a visitor sees each row when it's on their screen.
    const box = await target.boundingBox()
    await page.setViewportSize({ width: w, height: Math.ceil(box.height) + 40 })
    await target.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
  }
  await page.waitForTimeout(Number(opt('settle', 600)))
  if (frames > 0) {
    for (let i = 0; i < frames; i++) {
      const p = `${out}/${tag}-frame${String(i).padStart(2, '0')}.png`
      if (target && !flag('viewport')) await target.screenshot({ path: p })
      else await page.screenshot({ path: p })
      await page.waitForTimeout(interval)
    }
  } else if (press) {
    const btn = page.getByRole('button', { name: press }).first()
    await btn.scrollIntoViewIfNeeded()
    const box = await btn.boundingBox()
    const clip = { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 24), width: box.width + 48, height: box.height + 48 }
    await page.screenshot({ path: `${out}/${tag}-press-rest.png`, clip })
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${out}/${tag}-press-down.png`, clip })
    await page.mouse.up()
  } else if (target && !flag('viewport')) {
    await target.screenshot({ path: `${out}/${tag}.png` })
  } else {
    await page.screenshot({ path: `${out}/${tag}.png`, fullPage: flag('full') })
  }
  if (errors.length) console.log(`[${tag}] console errors:\n  ` + errors.join('\n  '))
  console.log(`[${tag}] saved`)
  await ctx.close()
}
await browser.close()
