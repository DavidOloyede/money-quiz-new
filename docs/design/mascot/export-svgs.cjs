// Writes every Omer view, pose and outfit to svg/ as editable SVGs (drag them into Figma).
const fs = require('fs'), path = require('path');
const { omer, OUTFITS, POSES } = require(path.join(__dirname, 'omer.cjs'));
const out = path.join(__dirname, 'svg');
fs.mkdirSync(out, { recursive: true });
for (const v of ['front', '34', 'side', 'back']) fs.writeFileSync(path.join(out, `omer-view-${v}.svg`), omer({ view: v, size: 400 }));
for (const p of Object.keys(POSES)) fs.writeFileSync(path.join(out, `omer-${p}.svg`), omer({ pose: p, size: 400 }));
for (const p of Object.keys(OUTFITS)) fs.writeFileSync(path.join(out, `omer-outfit-${p}.svg`), omer({ outfit: p, size: 400 }));
console.log(fs.readdirSync(out).length, 'SVGs in', out);
