const { omer } = require(require('path').join(__dirname, 'omer.cjs'));
const fs = require('fs');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const art = (o, label) => `<figure class="art">${omer(Object.assign({ size: 200 }, o)).replace('<svg ', `<svg role="img" aria-label="${esc(label)}" `)}</figure>`;
const VIEWS = [['front', 'Front'], ['34', 'Three-quarter'], ['side', 'Side'], ['back', 'Back']];
const POSES = [['idle', 'Idle', 'Gentle breathing. Loading screens, the level card.'], ['wave', 'Wave hello', 'Welcome, sign-in success, first visit. One foot taps.'], ['cheer', 'Cheer', 'Right answer, quiz finished. Feet planted wide.'], ['jump', 'Jump', 'Level up. Legs dangle, the shadow shrinks.'], ['thinking', 'Thinking', 'Loading, a question, “working on it”. Legs crossed.'], ['oops', 'Oops', 'Not quite. Knees in, still smiling.'], ['proud', 'Proud', 'New badge, pinned on the lower right of the bowl. Arms on hips.'], ['giving', 'Giving', 'Generosity: holding out a flake.']];
const OUT = [
  ['hero', 'The Hero', 'Earned', 'Debt paid off (the “PAID OFF!” party), the Debt Slayer badge, the top levels. Only the Hero flies.', 'Forest-600 cape with honey clasps at the rim and honey cuffs. One arm forward, legs trailing, speed lines behind.'],
  ['detective', 'The Detective', 'Contextual', 'Thinking and loading, quiz questions, “show the receipts”, spotting a new recurring charge.', 'Linen-400 deerstalker with linen-600 checks, and a magnifying glass that enlarges one eye. Stands up straight, with a knowing smirk.'],
  ['coach', 'The Coach', 'Earned', 'The daily habit: the question-of-the-day streak, streak goal days, Week of Diligence and Month of Faithfulness.', 'Forest-500 sweatband with a cream stripe tied at the side, forest wristbands, and a barbell with a black ball on each end.'],
  ['chef', 'The Chef', 'Contextual', 'Food questions and insights: groceries vs dining out, a week of cooking at home, the Dining budget.', 'A puffy cream toque on a band and a wooden spoon raised like a toast.'],
  ['wrangler', 'The Wrangler', 'Contextual', 'Rounding up recurring charges and subscriptions; the Know Your Flock badge for a perfect quiz.', 'Honey-700 hat with a forest-600 band, a forest-500 bandana with cream dots, and a lasso swinging overhead.'],
  ['builder', 'The Builder', 'Earned', 'Laying foundations: the First Steps badge (first import), setting up budgets, reaching Wise Builder (level 5).', 'Coral-500 hard hat with a ridge and a small mallet held high. It stays coral: a yellow hard hat would vanish into his honey body.'],
  ['gardener', 'The Gardener', 'Earned', 'Generosity and growth: the Cheerful Giver and First Fruits badges, a savings goal that grows.', 'Straw sun hat with a forest band and a coral flower, holding a potted sprout.'],
  ['graduate', 'The Graduate', 'Contextual', 'Learning milestones: a quiz finished, a new level title.', 'Mortarboard with a honey tassel and a cream diploma tied in forest green.'],
  ['dreamer', 'The Dreamer', 'Contextual', 'After today’s question: “Come back tomorrow”. Also quiet hours and late-night empty states.', 'Sky-700 nightcap with honey stars and a cream pompom. Eyes closed, Z’s drifting up.'] ];
const RULES = [['One look', 'One outfit at a time: at most a hat, one or two wearables and one prop.'], ['One meaning', 'Each outfit means one kind of moment. Don’t borrow the Chef for a savings win because it’s cute.'], ['Face first', 'Outfits never cover the eyes or the smile. The Detective’s lens magnifies; it never hides. Hats sit on the rim and may cover the manna heap.'], ['Same hand', 'Palette colors only, the same ink outline, one cel shade. Simple checks, dots or stripes at most.'], ['Silhouette', 'Every outfit reads in silhouette at 96px. Below 64px, use base Omer.'], ['Calm money', 'Outfits appear in moments, lesson cards, badges and empty states, never next to amounts in tables or budgets.'], ['Never preachy', 'No clerical costumes or religious symbols as outfits. Generosity is shown by giving, not by vestments.']];
const IDEAS = ['Party hat and noisemaker: a 100-day streak, the app’s birthday.', 'Explorer with a map and backpack: the first bank connection.', 'Firefighter helmet: an emergency fund reaches its goal.', 'Painter’s beret: tidying categories and renaming merchants.', 'Earmuffs and scarf: a cozy seasonal look for winter.'];
const LEGSPEC = [['Build', 'Exactly like the arms: a 7px honey limb inside a 14px ink outline, round ends.'], ['Placement', 'Hips 0.15 rim-widths apart, tucked under the bowl so the tops hide behind it.'], ['Length', 'About 0.16 rim-widths of leg showing, from the bowl base to the ground.'], ['Feet', 'A tiny rounded nub that turns outward. No toes, no shoes.'], ['Keep it simple', 'No knees and no joints: straight, noodle-simple limbs, so every pose is just a bend.']];

const html = `<title>Omer Model Sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Nunito:wght@700;800;900&display=swap">
<style>
:root{--ground:#faf7f1;--surface:#fffcf5;--ink:#201a13;--body:#40352a;--muted:#71634f;--line:#e8e0cf;--stage:#f4efe5;--stage-line:#e8e0cf;--accent:#1c5a32;--accent-soft:#f0f6f0;--earned-bg:#faefd1;--earned-ink:#714711;--ctx-bg:#e5f2f8;--ctx-ink:#286b8b;--note-bg:#fdf8ec;--note-line:#f5dfa3;
--display:"Nunito",ui-rounded,"SF Pro Rounded",system-ui,sans-serif;--text:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--ground:#14100a;--surface:#201a13;--ink:#faf7f1;--body:#e8e0cf;--muted:#a2937b;--line:#40352a;--stage:#f4efe5;--stage-line:#55483a;--accent:#8fc49d;--accent-soft:#0a2413;--earned-bg:#362108;--earned-ink:#eecb6b;--ctx-bg:#15303d;--ctx-ink:#9ad0ec;--note-bg:#2b241b;--note-line:#55483a}}
:root[data-theme="dark"]{color-scheme:dark;--ground:#14100a;--surface:#201a13;--ink:#faf7f1;--body:#e8e0cf;--muted:#a2937b;--line:#40352a;--stage:#f4efe5;--stage-line:#55483a;--accent:#8fc49d;--accent-soft:#0a2413;--earned-bg:#362108;--earned-ink:#eecb6b;--ctx-bg:#15303d;--ctx-ink:#9ad0ec;--note-bg:#2b241b;--note-line:#55483a}
body{background:var(--ground);color:var(--body);font:15px/1.6 var(--text)}
.wrap{max-width:1120px;margin:0 auto;padding-inline:clamp(16px,4vw,40px);padding-block:40px 72px;display:grid;gap:64px}
h1,h2,h3{font-family:var(--display);color:var(--ink);margin:0;text-wrap:balance;letter-spacing:-.01em}
h1{font-size:clamp(34px,5vw,52px);font-weight:900;line-height:1.05}
h2{font-size:clamp(24px,3vw,30px);font-weight:800;line-height:1.15}
h3{font-size:18px;font-weight:800}
p{margin:0;max-width:66ch}
.eyebrow{font:800 12px/1 var(--display);letter-spacing:.18em;text-transform:uppercase;color:var(--earned-ink)}
.lede{font-size:17px;color:var(--muted)}
header{display:grid;gap:14px}
.status{display:flex;gap:12px;align-items:flex-start;background:var(--ctx-bg);color:var(--ctx-ink);border-radius:12px;padding:14px 16px;max-width:760px;font-size:14px}
.status strong{color:var(--ctx-ink)}
section{display:grid;gap:22px}
.sh{display:grid;gap:8px}
.art{margin:0;background:var(--stage);border:1px solid var(--stage-line);border-radius:16px;display:grid;place-items:center;padding:8px}
.art svg{width:100%;height:auto;max-width:220px;display:block}
.compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:620px}
.compare figcaption{font:800 15px var(--display);color:var(--ink);margin-top:8px;text-align:center}
.cap{font:800 15px var(--display);color:var(--ink);text-align:center}
.views{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.views>div,.poses>div{display:grid;gap:8px}
.poses{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.poses p{font-size:13px;color:var(--muted);text-align:center;line-height:1.45}
.spec{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:24px;align-items:start}
dl{margin:0;display:grid;grid-template-columns:max-content 1fr;border-top:1px solid var(--line)}
dt,dd{margin:0;padding:11px 0;border-bottom:1px solid var(--line);font-size:14px}
dt{font-weight:600;color:var(--ink);padding-right:20px}
.wardrobe{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.outfit{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:grid;grid-template-rows:auto 1fr}
.outfit .art{border:0;border-bottom:1px solid var(--stage-line);border-radius:0;padding:14px}
.outfit .info{padding:16px 18px 20px;display:grid;gap:10px;align-content:start}
.row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.chip{font:500 12px/1 var(--text);padding:5px 10px;border-radius:999px;white-space:nowrap}
.chip.earned{background:var(--earned-bg);color:var(--earned-ink)}
.chip.ctx{background:var(--ctx-bg);color:var(--ctx-ink)}
.label{font:500 11px/1.2 var(--text);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.outfit p{font-size:14px;line-height:1.5}
.rules{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px;align-items:start}
.ideas{background:var(--note-bg);border:1px solid var(--note-line);border-radius:16px;padding:20px 22px;display:grid;gap:10px}
.ideas ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px}
.next{display:grid;gap:12px;max-width:760px}
.next ol{margin:0;padding-left:20px;display:grid;gap:8px}
code{font:500 13px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--stage);color:#40352a;padding:2px 6px;border-radius:6px;word-break:break-all}
@media (max-width:860px){.wardrobe{grid-template-columns:repeat(2,minmax(0,1fr))}.poses,.views{grid-template-columns:repeat(2,minmax(0,1fr))}.spec,.rules{grid-template-columns:1fr}}
@media (max-width:520px){.wardrobe{grid-template-columns:1fr}}
</style>
<div class="wrap">
<header>
  <span class="eyebrow">Manna Money · Graphics System · §3.3–3.4</span>
  <h1>Omer, now with legs and a wardrobe</h1>
  <p class="lede">The pedestal foot is gone: Omer stands on two stubby legs built just like his arms. And he has nine outfits, each tied to a real moment in the app, so the costume tells you what’s happening before anyone reads a word.</p>
  <div class="status"><span aria-hidden="true">●</span><span><strong>Not in Figma yet.</strong> Figma’s Starter plan allows 20 tool calls a month, and building the design system used them up. This page is the review copy; the Figma update is written and ready to run.</span></div>
</header>

<section>
  <div class="sh"><h2>Before and after</h2><p>Same bowl, same face, same proportions. Only the bottom changes.</p></div>
  <div class="compare">
    <figure style="margin:0">${art({ legacy: true }, 'Omer before, with a pedestal foot')}<figcaption>Before · pedestal foot</figcaption></figure>
    <figure style="margin:0">${art({}, 'Omer after, with two stubby legs')}<figcaption>After · two stubby legs</figcaption></figure>
  </div>
</section>

<section>
  <div class="sh"><h2>Turnaround</h2><p>Because the bowl is round, Omer turns cleanly: only the face and limbs move. In the side view, the one visible arm hangs at the middle of the body, in front of the bowl and above the legs; the far leg drops back into the shade color.</p></div>
  <div class="views">${VIEWS.map(([v, l]) => `<div>${art({ view: v }, `Omer, ${l.toLowerCase()} view`)}<span class="cap">${l}</span></div>`).join('')}</div>
  <div class="spec">
    <div class="sh"><h3>How the legs are drawn</h3><p>Short, straight and simple: a pose is just a bend. Measurements use the rim width as one unit, the same as the rest of the model sheet.</p></div>
    <dl>${LEGSPEC.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
  </div>
</section>

<section>
  <div class="sh"><h2>The eight poses, with legs</h2><p>The legs carry as much of the feeling as the arms: wide when cheering, crossed when thinking, knees in for “oops”.</p></div>
  <div class="poses">${POSES.map(([k, n, u]) => `<div>${art({ pose: k }, `Omer, ${n.toLowerCase()} pose`)}<span class="cap">${n}</span><p>${u}</p></div>`).join('')}</div>
</section>

<section>
  <div class="sh"><h2>Omer’s wardrobe</h2><p>Base Omer stays the default. <strong>Earned</strong> outfits unlock with a badge or level and then appear in that moment. <strong>Contextual</strong> outfits show up with matching content, no unlock needed. The cape is the recurring superhero look, and only the Hero flies.</p></div>
  <div class="wardrobe">${OUT.map(([k, n, kind, when, wears]) => `<article class="outfit">${art({ outfit: k }, `Omer as ${n}`)}<div class="info"><div class="row"><h3>${n}</h3><span class="chip ${kind === 'Earned' ? 'earned' : 'ctx'}">${kind}</span></div><div><div class="label">Shows up</div><p>${when}</p></div><div><div class="label">Wears</div><p>${wears}</p></div></div></article>`).join('')}</div>
</section>

<section>
  <div class="rules">
    <div class="sh" style="gap:14px"><h2>Wardrobe rules</h2><dl>${RULES.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>
    <aside class="ideas"><h3>Next in the wardrobe</h3><ul>${IDEAS.map(i => `<li>${i}</li>`).join('')}</ul></aside>
  </div>
</section>

<section class="next">
  <h2>Getting this into Figma</h2>
  <ol>
    <li>When Figma’s monthly allowance resets (or after an upgrade to a Professional plan with a Full or Dev seat), one call rebuilds §3.3 with the legs, adds §3.4 Omer’s wardrobe, renumbers the motifs and inventory to §3.5 and §3.6, and adds the outfits to the asset inventory.</li>
    <li>Until then, every drawing above is an editable SVG in <code>~/Downloads/omer-model-sheet-v2/</code>. Drag them onto page 3 of the Figma file to swap them in by hand.</li>
  </ol>
</section>
</div>`;
fs.writeFileSync(require('path').join(__dirname, 'omer-model-sheet.html'), html);
console.log('bytes', html.length);
