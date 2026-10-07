const page = await figma.getNodeByIdAsync('4:63');
await figma.setCurrentPageAsync(page);
const gs = await figma.getNodeByIdAsync('10:2');
const draw = (parent, opts, name) => { const n = figma.createNodeFromSvg(omer(opts)); n.name = name; parent.appendChild(n); return n; };
const renum = async (from, to) => { const n = gs.children.find(c => c.name.startsWith(from + ' ')); if (!n) return null; n.name = to + n.name.slice(from.length); const t = n.findOne(x => x.type === 'TEXT' && x.characters === from); if (t) t.characters = to; return n.id; };
const renumbered = [await renum('3.5', '3.6'), await renum('3.4', '3.5')];
const old33 = gs.children.find(n => n.name.startsWith('3.3 '));
const idx = gs.children.indexOf(old33);
old33.remove();

// ── 3.3 rebuilt with legs
let b = await block(gs, '3.3', 'Omer: model sheet', 'A round, honey-gold manna bowl with a friendly face, two stubby arms and two stubby legs, who catches the manna falling from the logo. Cheerful and kind, not babyish. Because the bowl is round, Omer turns cleanly: only the face and limbs move.');
gs.insertChild(idx, b);
const tr = AL(b, 'H', { fillW: true, bg: 'cream', r: 16, stroke: 'linen/200', p: [32, 40], gap: 24, justify: 'SPACE_BETWEEN', name: 'Turnaround' });
for (const [v, lab] of [['front', 'Front'], ['34', 'Three-quarter'], ['side', 'Side'], ['back', 'Back']]) { const st = AL(tr, 'V', { gap: 8, align: 'CENTER' }); draw(st, { view: v, size: 240 }, `Omer/${lab}`); await tx(st, lab, { font: FN.nXB, size: 15, color: 'linen/700' }); }
const cons = AL(b, 'H', { gap: 24, fillW: true, name: 'Construction' });
const cf = figma.createFrame(); cf.name = 'Construction drawing'; cf.resize(520, 520); cf.cornerRadius = 16; cf.fills = [P('cream')]; cf.strokes = [P('linen/200')]; cf.strokeWeight = 1; cons.appendChild(cf);
const big = figma.createNodeFromSvg(omer({ size: 400 })); big.name = 'Omer construction'; cf.appendChild(big); big.x = 60; big.y = 40;
const S = 2, OX = 60, OY = 40;
const guide = (x1, y1, x2, y2) => { const l = figma.createVector(); l.vectorPaths = [{ windingRule: 'NONE', data: `M ${x1} ${y1} L ${x2} ${y2}` }]; l.strokes = [P('coral/500')]; l.strokeWeight = 1; l.dashPattern = [4, 4]; l.name = 'Guide'; cf.appendChild(l); };
for (const y of [78, 112, 160, 183]) guide(10, OY + y * S, 510, OY + y * S);
for (const x of [20, 88, 100, 112, 180]) guide(OX + x * S, 10, OX + x * S, 510);
const lab = async (s, x, y) => { const t = await tx(cf, s, { font: FN.iSB, size: 11, color: 'coral/700' }); t.x = x; t.y = y; };
await lab('Rim line', 14, OY + 78 * S - 16); await lab('Eye line', 14, OY + 112 * S - 16); await lab('Bowl base', 14, OY + 160 * S - 16); await lab('Feet', 14, OY + 183 * S - 16);
await lab('1 unit = rim width', OX + 20 * S + 6, 14); await lab('Hips 0.15 apart', OX + 88 * S - 34, 494);
await kv(cons, 'Proportions (1 unit = rim width)', [
  ['Rim', '1 unit wide, an ellipse 0.2 units tall. Cream #FFFCF5 with a honey-200 #F5DFA3 opening; a small heap of flakes peeks over.'],
  ['Bowl', '0.51 units deep, rim line to base. Honey-400 #E5B13C body, honey-500 #CE9118 shade on the lower right.'],
  ['Legs', 'Two stubby legs built exactly like the arms: a 7px honey limb inside a 14px ink outline. Hips 0.15 units apart under the bowl, about 0.16 units of leg showing, each ending in a tiny rounded foot that turns outward. No knees, toes or shoes. Straight and simple, so a pose is just a bend.'],
  ['Arms', 'About 0.15 units long, the same limb build, round ends. No hands or fingers.'],
  ['Eyes', '0.14 × 0.18 units, centers 0.3 apart, on the eye line 0.41 of the way down the bowl. Linen-900 with a white four-point star and a dot.'],
  ['Cheeks', 'Coral-300 #E9AEA0 ovals, 0.12 × 0.08, just below and outside each eye.'],
  ['Mouth', '0.12 units wide, centered, its top level with the eye bottoms.'],
  ['Outline', 'Linen-900 #201A13 at 2.5% of rim width (4px at 200px, never under 2px).'],
  ['Ground', 'Feet touch a soft linen-900 shadow at 12%, 0.6 units wide. When Omer jumps, the shadow shrinks.'] ]);
const posesB = AL(b, 'V', { gap: 16, fillW: true, name: 'Poses' });
await tx(posesB, 'The eight poses', { style: 'Coach/Card Title' });
const PINFO = [['idle', 'Idle', 'Gentle breathing. Loading screens, the level card.'], ['wave', 'Wave hello', 'Welcome, sign-in success, first visit. One foot taps.'], ['cheer', 'Cheer', 'Right answer, quiz finished. Feet planted wide.'], ['jump', 'Jump', 'Level up. Legs dangle, the shadow shrinks.'], ['thinking', 'Thinking', 'Loading, a question, “working on it”. Legs crossed.'], ['oops', 'Oops', 'Not quite. Knees in, still smiling.'], ['proud', 'Proud', 'New badge, pinned on the lower right of the bowl. Arms on hips.'], ['giving', 'Giving', 'Generosity: holding out a flake.']];
const pgr = AL(posesB, 'H', { gap: 16, wrap: true, fillW: true });
for (const [k, name, use] of PINFO) { const c = card(pgr, { w: 300, p: [20, 20, 22, 20], gap: 6, align: 'CENTER', name: `Pose/${name}` }); draw(c, { pose: k, size: 200 }, `Omer/${name}`); await tx(c, name, { font: FN.nXB, size: 16 }); await tx(c, use, { font: FN.iR, size: 13, lh: 18, color: 'linen/500', align: 'CENTER', fill: true }); }
const use = AL(b, 'H', { gap: 24, fillW: true, name: 'Using Omer' });
await kv(use, 'Using Omer', [
  ['Sizes', '48px inline · 96px cards and empty states · 160px celebrations · 240px+ landing. Below 64px drop the eye dots and inner flakes, and use base Omer (no outfit).'],
  ['Where', 'Moments only: quiz, question of the day, streaks, badges, level-ups, milestones, welcome, empty states.'],
  ['Motion', 'Idle breathing 3–4s with a slow weight shift between the feet. Reward poses 600–1200ms with the overshoot curve. Tapping anywhere dismisses. Reduce motion: a still pose.'],
  ['Files', 'Transparent WebP poses and sprite sheets in public/mascot/, each under ~150 KB; outfits as omer-{outfit}-{pose}.webp; master and turnaround in docs/design/mascot/.'],
  ['Prompts', 'When generating art, describe traits (round honey bowl, cream rim, glossy eyes, rosy cheeks, bold outline, short straight noodle limbs with tiny feet). Never prompt “in the style of” a studio, show or artist.'],
  ['Never', 'Add a nose, ears, hair, hands, fingers, knees or shoes. Recolor the body. Make Omer sad, scared or crying. Put Omer next to an amount, an error or a money table.'] ], 90);

// ── 3.4 Wardrobe
b = await block(gs, '3.4', 'Omer’s wardrobe', 'A costume for each kind of moment, so the outfit tells you what is happening before anyone reads a word. Base Omer stays the default. Earned outfits unlock with a badge or level and then appear in that moment; contextual outfits show up with matching content.');
gs.insertChild(idx + 1, b);
const OUT = [
  ['hero', 'The Hero', 'Earned', 'Debt paid off (the “PAID OFF!” party), the Debt Slayer badge, the top levels. Only the Hero flies.', 'Forest-600 cape with honey-300 clasps at the rim and honey cuffs. One arm forward, legs trailing, speed lines behind.'],
  ['detective', 'The Detective', 'Contextual', 'Thinking and loading, quiz questions, “show the receipts”, spotting a new recurring charge.', 'Linen-400 deerstalker with linen-600 checks, and a magnifying glass that enlarges one eye. Legs crossed, a knowing smirk.'],
  ['coach', 'The Coach', 'Earned', 'The daily habit: the question-of-the-day streak, streak goal days, Week of Diligence and Month of Faithfulness.', 'Coral-500 sweatband with a cream stripe tied at the side, coral wristbands, and a barbell weighted with two big manna flakes.'],
  ['chef', 'The Chef', 'Contextual', 'Food questions and insights: groceries vs dining out, a week of cooking at home, the Dining budget.', 'A puffy cream toque on a band and a wooden spoon raised like a toast.'],
  ['wrangler', 'The Wrangler', 'Contextual', 'Rounding up recurring charges and subscriptions; the Know Your Flock badge for a perfect quiz.', 'Honey-700 hat with a forest-600 band, a coral-500 bandana, and a lasso swinging overhead.'],
  ['builder', 'The Builder', 'Earned', 'Laying foundations: the First Steps badge (first import), setting up budgets, reaching Wise Builder (level 5).', 'Coral-500 hard hat with a ridge and a small mallet held high.'],
  ['gardener', 'The Gardener', 'Earned', 'Generosity and growth: the Cheerful Giver and First Fruits badges, a savings goal that grows.', 'Honey-200 straw sun hat with a forest band and a coral flower, holding a potted sprout.'],
  ['graduate', 'The Graduate', 'Contextual', 'Learning milestones: a quiz finished, a new level title.', 'Mortarboard (linen-700 board, honey-400 tassel) and a cream diploma tied in forest green.'],
  ['dreamer', 'The Dreamer', 'Contextual', 'After today’s question: “Come back tomorrow”. Also quiet hours and late-night empty states.', 'Sky-700 nightcap with honey stars and a cream pompom. Eyes closed, Z’s drifting up.'] ];
const og = AL(b, 'H', { gap: 16, wrap: true, fillW: true, name: 'Outfits' });
for (const [k, name, kind, when, wears] of OUT) {
  const c = card(og, { w: 405, p: 0, gap: 0, name: `Outfit/${name}` });
  const st = AL(c, 'H', { fillW: true, h: 252, bg: 'linen/100', justify: 'CENTER', align: 'CENTER', name: 'Stage' });
  st.topLeftRadius = 16; st.topRightRadius = 16;
  draw(st, { outfit: k, size: 228 }, `Omer/${name}`);
  const i = AL(c, 'V', { fillW: true, p: [18, 20, 22, 20], gap: 8 });
  const hr = AL(i, 'H', { fillW: true, justify: 'SPACE_BETWEEN', align: 'CENTER' });
  await tx(hr, name, { font: FN.nXB, size: 18 });
  const chip = AL(hr, 'H', { bg: kind === 'Earned' ? 'honey/100' : 'sky/50', r: 999, p: [4, 10] }); await tx(chip, kind, { font: FN.iM, size: 12, color: kind === 'Earned' ? 'honey/800' : 'sky/700' });
  for (const [label, text] of [['Shows up', when], ['Wears', wears]]) { const r = AL(i, 'V', { fillW: true, gap: 2 }); await tx(r, label, { style: 'Ledger/Label', color: 'linen/400' }); await tx(r, text, { font: FN.iR, size: 13, lh: 19, color: 'linen/700', fill: true }); }
}
const wr = AL(b, 'H', { gap: 24, fillW: true, name: 'Wardrobe rules' });
await kv(wr, 'Wardrobe rules', [
  ['One look', 'One outfit at a time: at most a hat, one or two wearables and one prop.'],
  ['One meaning', 'Each outfit means one kind of moment. Don’t borrow the Chef for a savings win because it’s cute.'],
  ['Face first', 'Outfits never cover the eyes or the smile (the Detective’s lens magnifies, it never hides). Hats sit on the rim and may cover the manna heap.'],
  ['Same hand', 'Palette colors only, the same ink outline, one cel shade. Simple checks, dots or stripes at most.'],
  ['Silhouette', 'Every outfit reads in silhouette at 96px. Below 64px, use base Omer.'],
  ['Calm money', 'Outfits appear in moments, lesson cards, badges and empty states, never next to amounts in tables or budgets.'],
  ['Never preachy', 'No clerical costumes or religious symbols as outfits. Generosity is shown by giving, not by vestments.'] ], 110);
const ideas = card(wr, { w: 420, fillH: true, bg: 'honey/50', stroke: 'honey/200', p: 24, gap: 10, name: 'Ideas' });
await tx(ideas, 'Next in the wardrobe', { style: 'Coach/Card Title' });
for (const line of ['Party hat and noisemaker: a 100-day streak, the app’s birthday.', 'Explorer with a map and backpack: the first bank connection.', 'Firefighter helmet: an emergency fund reaches its goal.', 'Painter’s beret: tidying categories and renaming merchants.', 'Earmuffs and scarf: a cozy seasonal look for winter.']) await tx(ideas, '•  ' + line, { font: FN.iR, size: 14, lh: 21, color: 'linen/700', fill: true });

// ── Inventory: add the outfits row
const inv = gs.findOne(n => n.name === 'Inventory table');
const after = inv.findOne(n => n.name === 'Omer sprite sheets');
const r = AL(null, 'H', { gap: 16, p: [12, 0], align: 'CENTER', name: 'Omer outfits × 9' });
inv.insertChild(inv.children.indexOf(after) + 1, r); r.layoutSizingHorizontal = 'FILL';
r.strokes = [P('linen/100')]; r.strokeTopWeight = 1; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0;
const vals = [['Omer outfits × 9', FN.iSB, 'linen/900', 220], ['Hero, Detective, Coach, Chef, Wrangler, Builder, Gardener, Graduate, Dreamer. This sheet is the brief.', FN.iR, 'linen/700', 330], ['Transparent WebP per outfit pose, < 150 KB', FN.iR, 'linen/600', 250], ['public/mascot/outfits/', FN.iM, 'linen/600', 250]];
for (const [v, f, c, w] of vals) { const cc = AL(r, 'H', { w }); await tx(cc, v, { font: f, size: 13, lh: 19, color: c, fill: true }); }
const sc = AL(r, 'H', { fillW: true }); const chip = AL(sc, 'H', { bg: 'linen/100', r: 999, p: [4, 10] }); await tx(chip, 'To draw', { font: FN.iM, size: 12, color: 'linen/600' });

const n33 = gs.children[idx], n34 = gs.children[idx + 1];
await n33.screenshot({ scale: 0.35 });
await n34.screenshot({ scale: 0.4 });
return { renumbered, order: gs.children.map(n => n.name), height: Math.round(gs.height) };
