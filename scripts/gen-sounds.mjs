/**
 * Renders the five celebration sounds (packages/core/lib/sounds.ts) to WAV
 * for both apps: public/sounds/ for the web and apps/mobile/assets/sounds/
 * for the phone. Run via `npm run gen:sounds` after changing a recipe; the
 * output is committed. Node strips the .ts types natively, so there's no
 * build step.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { SOUND_IDS, renderSound, encodeWav } = await import('../packages/core/lib/sounds.ts')

// 22.05kHz mono keeps each file small; the highest overtone is well under its 11kHz ceiling.
const RATE = 22050
const targets = ['../public/sounds/', '../apps/mobile/assets/sounds/'].map((dir) =>
  fileURLToPath(new URL(dir, import.meta.url)),
)

for (const dir of targets) mkdirSync(dir, { recursive: true })
for (const id of SOUND_IDS) {
  const wav = encodeWav(renderSound(id, RATE), RATE)
  for (const dir of targets) writeFileSync(`${dir}${id}.wav`, wav)
  console.log(`${id}.wav  ${(wav.length / 1024).toFixed(1)} KB`)
}
