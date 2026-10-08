// The guide's §5 "Moments in motion": Omer's moves, the Hero's flight, and the level and badge tables.
// Every move starts from the same drawing as §3 (mascot/omer.cjs) and wraps one part of it (an arm, a prop,
// the cape) in a classed group that src/p7-motion.html animates. Nothing is redrawn, so with motion off each
// figure rests on its pose exactly as the model sheet shows it.
const path = require('path');
const { omer, OUTFITS, POSES, ARMS, LEGS, PAL, limb, eyes } = require(path.join(__dirname, '..', 'mascot', 'omer.cjs'));
const INK = PAL.ink;
const star4 = (cx, cy, r) => `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
const els = s => s.match(/<[a-z]+[^>]*\/>/g);
const draw = o => omer(Object.assign({ size: 200 }, o));

// Wrap the first copy of `part` in a classed group. Throws when the drawing changed under it, so a stale move fails the build.
function wrap(svg, part, cls, style) {
  const i = svg.indexOf(part);
  if (i < 0) throw new Error(`motion.cjs: nothing to wrap for .${cls}`);
  return svg.slice(0, i) + `<g class="${cls}"${style ? ` style="${style}"` : ''}>` + part + '</g>' + svg.slice(i + part.length);
}
// Omer's body: everything between the ground shadow and the `extra` layer. Wrap inner parts first, outer ones after.
function wrapBody(svg, extra, cls) {
  const start = svg.indexOf('<g'), tail = '</g>' + (extra || '') + '</svg>';
  if (start < 0 || !svg.endsWith(tail)) throw new Error(`motion.cjs: no body for .${cls}`);
  const end = svg.length - tail.length + 4;
  return svg.slice(0, start) + `<g class="${cls}">` + svg.slice(start, end) + '</g>' + svg.slice(end);
}
const shadowOf = svg => svg.match(/<ellipse cx="100" cy="191"[^>]*\/>/)[0];
const twinkles = (extra, step = 0.45) => els(extra).map((e, i) => `<g class="mo-twinkle" style="--d:${(-i * step).toFixed(2)}s">${e}</g>`).join('');
const finish = (svg, smil) => svg.replace('<svg ', `<svg aria-hidden="true" focusable="false"${smil ? ' class="mo-smil"' : ''} `);

// ── The cape ripples by morphing between three outlines with the same commands (SMIL, so Safari plays it too).
const CAPE = [
  'M156 74C116 60 60 60 26 72C10 54 -16 44 -40 52C-28 64 -32 80 -26 92C-38 104 -34 120 -24 130C-12 120 6 118 18 124C16 106 24 92 42 86Z',
  'M156 74C116 60 60 60 26 72C10 50 -18 38 -46 44C-32 60 -38 78 -32 90C-44 104 -40 122 -32 134C-18 124 4 120 18 124C16 106 24 92 42 86Z',
  'M156 74C116 60 60 60 26 72C10 58 -14 54 -34 60C-24 72 -28 86 -22 96C-32 108 -28 122 -18 128C-8 118 8 118 18 124C16 106 24 92 42 86Z'];
const FOLDS = [
  'M-22 60C-12 74 -10 92 -12 112M0 58C8 72 10 90 6 112',
  'M-27 54C-15 70 -14 90 -18 116M-2 54C6 70 8 90 3 113',
  'M-17 66C-9 80 -7 95 -7 112M2 63C10 77 12 92 8 112'];
const ripple = (frames, dur) => `<animate attributeName="d" dur="${dur}" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="${Array(4).fill('0.45 0 0.55 1').join(';')}" values="${[frames[0], frames[1], frames[0], frames[2], frames[0]].join(';')}"/>`;
function morph(el, frames, dur) {
  if (!el.includes(`d="${frames[0]}"`)) throw new Error('motion.cjs: the cape changed; update CAPE and FOLDS');
  return el.slice(0, -2) + '>' + ripple(frames, dur) + '</path>';
}
const SPEED = 'M6 140H26M12 156H36M6 172H24';
function hero({ ground = true } = {}) {
  const H = OUTFITS.hero, [cape, folds] = els(H.back);
  const back = morph(cape, CAPE, '0.9s') + morph(folds, FOLDS, '0.9s');
  const extra = SPEED.split('M').filter(Boolean).map((d, i) => `<g class="mo-speed" style="--d:${(-i * 0.23).toFixed(2)}s">${H.extra.replace(SPEED, 'M' + d)}</g>`).join('');
  let s = wrapBody(draw({ outfit: 'hero', back, extra }), extra, 'mo-fly');
  s = ground ? wrap(s, shadowOf(s), 'mo-fly-shadow') : s.replace(shadowOf(s), '');
  return finish(s, true);
}

// ── One builder per move. Each returns finished SVG markup.
const MOVE = {
  idle() {
    const s = wrap(draw({ pose: 'idle' }), eyes('open', 0, 0), 'mo-blink');
    return wrapBody(s, '', 'mo-breathe');
  },
  wave() {
    const extra = `<g class="mo-marks">${POSES.wave.extra}</g>`;
    let s = draw({ pose: 'wave', extra });
    s = wrap(s, limb(ARMS.wave.R), 'mo-wave-arm');
    s = wrap(s, limb(LEGS.tap.R), 'mo-tap');
    return wrapBody(s, extra, 'mo-sway');
  },
  cheer() {
    const extra = twinkles(POSES.cheer.extra);
    let s = draw({ pose: 'cheer', extra });
    s = wrap(s, limb(ARMS.cheer.L), 'mo-pump-l');
    s = wrap(s, limb(ARMS.cheer.R), 'mo-pump-r');
    s = wrapBody(s, extra, 'mo-hop');
    return wrap(s, shadowOf(s), 'mo-hop-shadow');
  },
  jump() {
    let s = wrapBody(draw({ pose: 'jump' }), '', 'mo-jump');
    s = wrap(s, s.match(/<path d="M84 176v10[^>]*\/>/)[0], 'mo-jump-lines');
    return wrap(s, shadowOf(s), 'mo-jump-shadow');
  },
  thinking() {
    const extra = els(POSES.thinking.extra).map((e, i) => `<g class="mo-bubble" style="--d:${i * 0.25}s">${e}</g>`).join('');
    const s = wrap(draw({ pose: 'thinking', extra }), limb(ARMS.thinking.R), 'mo-chin');
    return wrapBody(s, extra, 'mo-ponder');
  },
  oops() {
    const extra = `<g class="mo-drop">${POSES.oops.extra}</g>`;
    const s = wrap(draw({ pose: 'oops', extra }), limb(ARMS.oops.L), 'mo-scratch');
    return wrapBody(s, extra, 'mo-wobble');
  },
  proud() {
    const onBody = `<g class="mo-medal">${POSES.proud.onBody}</g>`;
    const extra = `<g class="mo-glint"><path d="${star4(146, 136, 7)}" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/></g>`;
    return wrapBody(draw({ pose: 'proud', onBody, extra }), extra, 'mo-proud');
  },
  giving() {
    const [glow, flake] = els(POSES.giving.props);
    return wrapBody(draw({ pose: 'giving', props: `<g class="mo-glow">${glow}</g><g class="mo-offer">${flake}</g>` }), '', 'mo-lean-in');
  },
  hero: () => hero(),
  detective() {
    const glint = `<path class="mo-lens-glint" d="M109 107A15 15 0 0 1 118 97" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" stroke-opacity="0.9"/>`;
    let s = draw({ outfit: 'detective', props: `<g class="mo-search">${OUTFITS.detective.props}${glint}</g>` });
    s = wrap(s, limb(ARMS.magnify.R), 'mo-search');
    return wrapBody(s, '', 'mo-lean');
  },
  coach() {
    const C = OUTFITS.coach, armL = limb(ARMS.lift.L), armR = limb(ARMS.lift.R);
    let s = draw({ outfit: 'coach', back: `<g class="mo-bar">${C.back}</g>`, props: `<g class="mo-bar">${C.props}</g>` });
    // Each back arm is its limb plus its wristband; the wrap takes both so the band rides along.
    const cuffAfter = arm => { const i = s.indexOf(arm) + arm.length; const band = s.slice(i).match(/^(<path[^>]*\/>){2}/)[0]; return arm + band; };
    s = wrap(s, cuffAfter(armL), 'mo-lift');
    s = wrap(s, cuffAfter(armR), 'mo-lift');
    return wrapBody(s, '', 'mo-rep-body');
  },
  chef() {
    const C = OUTFITS.chef, extra = twinkles(C.extra);
    return wrapBody(draw({ outfit: 'chef', hat: `<g class="mo-toque">${C.hat}</g>`, props: `<g class="mo-spoon">${C.props}</g>`, extra }), extra, 'mo-breathe');
  },
  wrangler() {
    const W = OUTFITS.wrangler, [ropeInk, rope, loopInk, loop] = els(W.props);
    // The knot (honda) runs round the loop, which is what makes a flat ellipse read as spinning.
    const knot = `<circle r="4.2" fill="${PAL.l600}" stroke="${INK}" stroke-width="2"><animateMotion dur="0.8s" repeatCount="indefinite" path="M126 30A30 9 0 1 1 186 30A30 9 0 1 1 126 30"/></circle>`;
    const props = `<g class="mo-lasso">${ropeInk}${rope}<g class="mo-loop">${loopInk}${loop}${knot}</g></g>`;
    const extra = `<g class="mo-whoosh"><path d="M118 15Q156 -2 194 15M126 47Q156 56 186 47" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" fill="none" stroke-opacity="0.45"/></g>`;
    const s = draw({ outfit: 'wrangler', props, extra, onBody: `<g class="mo-bandana">${W.onBody}</g>` });
    return finish(wrapBody(s, extra, 'mo-bounce'), true);
  },
  builder() {
    const extra = `<g class="mo-spark"><path d="${star4(214, 40, 8)}" fill="${PAL.h300}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>`;
    return wrapBody(draw({ outfit: 'builder', props: `<g class="mo-mallet">${OUTFITS.builder.props}</g>`, extra }), extra, 'mo-dip');
  },
  gardener() {
    const P = OUTFITS.gardener.props, pot = P.indexOf('<rect x="74" y="136"');
    return wrapBody(draw({ outfit: 'gardener', props: `<g class="mo-sprout">${P.slice(0, pot)}</g>${P.slice(pot)}` }), '', 'mo-breathe');
  },
  graduate() {
    const G = OUTFITS.graduate, extra = twinkles(G.extra);
    return wrapBody(draw({ outfit: 'graduate', hat: `<g class="mo-cap">${G.hat}</g>`, props: `<g class="mo-diploma">${G.props}</g>`, extra }), extra, 'mo-toss');
  },
  dreamer() {
    const D = OUTFITS.dreamer, zz = 'M24 38H38L24 52H38M46 18H56L46 28H56';
    const extra = ['M24 38H38L24 52H38', 'M46 18H56L46 28H56'].map((d, i) => `<g class="mo-z" style="--d:${-i * 1.6}s">${D.extra.replace(zz, d)}</g>`).join('');
    return wrapBody(draw({ outfit: 'dreamer', hat: `<g class="mo-nightcap">${D.hat}</g>`, extra }), extra, 'mo-sleep');
  } };
const move = k => { const s = MOVE[k](); return s.startsWith('<svg aria-hidden') ? s : finish(s, false); };

// ── §5.1 cards: [move, name, what moves, timing, status]
const POSE_CARDS = [
  ['idle', 'Idle', 'Breathes, squashing toward the ground, and blinks every few seconds.', '3.2s breath · 4.2s blink', 'app'],
  ['wave', 'Wave hello', 'The raised arm rocks from the shoulder and one foot taps.', '0.9s wave · 0.9s tap', 'app'],
  ['cheer', 'Cheer', 'Two quick hops with his arms pumping; the sparkles twinkle.', '1.8s · two hops, then a rest', 'app'],
  ['jump', 'Jump', 'Lands, squashes, springs up; the shadow grows and shrinks under him.', '1.4s · overshoot on take-off', 'app'],
  ['thinking', 'Thinking', 'Thought bubbles pop up one by one while he taps his chin.', '3.2s · bubbles 0.25s apart', 'app'],
  ['oops', 'Oops', 'A gentle wobble and a scratch of the head; the drop slides away.', '2.4s · wobble in the first 0.8s', 'app'],
  ['proud', 'Proud', 'Puffs up and the badge swings on its ribbon, with a glint.', '2.4s puff · 1.2s swing', 'app'],
  ['giving', 'Giving', 'Leans in as the flake he holds out glows.', '2.6s', 'app'] ];
// Every move plays in both apps (core lib/omerMotion.ts ports this file; change both).
const OUTFIT_CARDS = [
  ['hero', 'The Hero', 'Flies: the cape ripples, speed lines stream past, the shadow breathes with his height.', '0.9s cape · 2.4s bob'],
  ['detective', 'The Detective', 'Peers through the lens as it drifts over his eye; the glass catches the light.', '2.6s · stands up straight'],
  ['coach', 'The Coach', 'Reps: the barbell comes down to the rim and presses back up.', '1.8s per rep'],
  ['chef', 'The Chef', 'Raises the spoon like a toast while the toque puffs.', '1.2s spoon · 2.4s toque'],
  ['wrangler', 'The Wrangler', 'Swings the lasso overhead; the knot runs round the loop and the bandana flutters.', '0.8s per turn'],
  ['builder', 'The Builder', 'Two taps of the mallet, each with a spark, then a rest.', '1.8s · tap, tap, rest'],
  ['gardener', 'The Gardener', 'The sprout grows out of the pot, then its leaves sway.', '1.3s grow · 2.4s sway'],
  ['graduate', 'The Graduate', 'Tosses the cap, which spins and lands back on the rim.', '3.2s · one toss'],
  ['dreamer', 'The Dreamer', 'Sleepy breathing, a nodding nightcap, Z’s drifting up.', '4.4s breath · 3.2s per Z'] ];
const STATUS = { app: '<span class="tag tag--code">In the app</span>' };
const card = ([k, name, what, timing, status]) => `<figure class="mo-card"><button class="mo-stage" type="button" data-mo-replay${k === 'gardener' ? ' data-mo-onview' : ''} aria-label="Replay ${name}">${move(k)}<span class="mo-replay" aria-hidden="true">Replay</span></button><figcaption><span class="mo-top"><b>${name}</b>${STATUS[status || 'app']}</span><span>${what}</span><span class="mo-time">${timing}</span></figcaption></figure>`;

// ── §5.2 the sky the Hero flies through: drifting clouds, wind streaks and flakes, all right to left.
let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const CLOUD = '<svg viewBox="0 0 120 56" aria-hidden="true"><path d="M20 50C8 50 4 38 14 33C11 20 28 13 37 22C41 8 64 5 72 20C84 12 102 20 98 34C110 35 112 50 98 50Z" fill="var(--mo-cloud)"/><path d="M14 44C30 48 80 49 104 44C104 48 102 50 98 50H20C16 50 14 48 14 44Z" fill="var(--mo-cloud-shade)"/></svg>';
const clouds = [[18, 1.25, 26, 0], [62, 0.8, 34, -9], [36, 1, 30, -17], [8, 0.65, 40, -26], [74, 1.1, 24, -5]]
  .map(([y, s, dur, d]) => `<span class="mo-cloud" style="top:${y}%;--s:${s};--dur:${dur}s;--d:${d}s;left:${(100 + d * 4).toFixed(0)}%">${CLOUD}</span>`).join('');
const winds = Array.from({ length: 7 }, (_, i) => `<span class="mo-wind mo-particle" style="top:${(10 + rnd() * 74).toFixed(1)}%;--dur:${(1.5 + rnd() * 0.9).toFixed(2)}s;--d:${(-rnd() * 2.4).toFixed(2)}s;--w:${(70 + rnd() * 70).toFixed(0)}px"><svg viewBox="0 0 140 14" aria-hidden="true"><path d="M2 7H112C124 7 130 2 126 -1" stroke="var(--mo-wind)" stroke-width="3" stroke-linecap="round" fill="none"/></svg></span>`).join('');
const flakes = Array.from({ length: 6 }, (_, i) => `<span class="mo-sky-flake mo-particle" style="top:${(14 + rnd() * 70).toFixed(1)}%;--dur:${(5 + rnd() * 4).toFixed(2)}s;--d:${(-rnd() * 8).toFixed(2)}s;--sz:${(7 + rnd() * 6).toFixed(0)}px"></span>`).join('');
const BURST = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2, out = i % 2 === 0; return `${(130 + Math.cos(a) * (out ? 124 : 96)).toFixed(1)},${(56 + Math.sin(a) * (out ? 54 : 38)).toFixed(1)}`; }).join(' ');
const CC = ['var(--honey)', 'var(--forest-500)', '#fffcf5', '#eecb6b', '#8fc49d', '#9ad0ec', '#e9aea0'];
const partyBits = Array.from({ length: 40 }, (_, i) => { const a = rnd() * Math.PI * 2, r = 90 + rnd() * 170; return `<i class="mo-pop mo-particle${i % 3 === 0 ? ' mo-round' : ''}" style="background:${CC[i % CC.length]};--bx:${(Math.cos(a) * r).toFixed(0)}px;--by:${(Math.sin(a) * r * 0.6 - 40).toFixed(0)}px;--spin:${Math.round(rnd() * 720 - 360)}deg;--d:${Math.round(rnd() * 250)}ms"></i>`; }).join('');
const sky = `<div class="mo-sky" id="mo-sky" role="img" aria-label="The Hero flying through a dawn sky: his cape ripples, speed lines stream behind him, and clouds and wind drift past from right to left.">
  <span class="mo-sun"></span>${clouds}${winds}${flakes}
  <div class="mo-hero"><div class="mo-hero-swoop">${hero({ ground: false })}</div></div>
  <div class="mo-paidoff" aria-hidden="true"><svg viewBox="0 0 260 112"><defs><pattern id="mo-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#e5b13c"/></pattern></defs><polygon points="${BURST}" fill="#f5dfa3" stroke="#201a13" stroke-width="3" stroke-linejoin="round"/><polygon points="${BURST}" fill="url(#mo-dots)" opacity="0.55"/></svg><span>PAID OFF!</span></div>
  <div class="mo-party-bits" aria-hidden="true">${partyBits}</div>
</div>`;

// ── §5.5 the level ladder, from core lib/gamification.ts (TITLES, xpForLevel) and lib/omerMoments.ts (BUILDER_LEVEL 5, HERO_LEVEL 8).
const TITLES = ['Steward in Training', 'Coin Counter', 'Faithful With Little', 'Diligent Planner', 'Wise Builder', 'Generous Manager', 'Faithful With Much', 'Trusted Steward', 'Good & Faithful Steward'];
const xpFor = L => 50 * L * (L - 1);
const fmt = n => n.toLocaleString('en-US');
const LADDER_NOTES = [
  'Where everyone starts. Omer waves hello on the welcome; there is no level-up yet.',
  'The first level-up: “LEVEL UP!” in a comic burst, a turning sunburst, manna falling into his rim.',
  'Named for Luke 16:10, “faithful in a very little”. The stewardship arc begins.',
  'Every level brings a new title, so the title flips in with a shine; Omer jumps in his own skin.',
  'The Builder’s hard hat and mallet. The same outfit comes with the First Steps badge.',
  'Plain Omer again: the outfit is saved for the moments that earn one.',
  'The other half of Luke 16:10, “faithful also in much”.',
  'The Hero’s cape. From here on Omer flies at every level-up.',
  'The last title, after Matthew 25:21 (“Well done, good and faithful servant”). Past level 9 the title stays and the levels keep counting.'];
const ladderLook = L => (L === 1 ? ['wave', 'Waves hello'] : L >= 8 ? ['hero', 'The Hero, flying'] : L === 5 ? ['builder', 'The Builder'] : ['jump', 'Jumps']);
const ladder = `<ol class="mo-ladder">${TITLES.map((t, i) => {
  const L = i + 1, [look, lookName] = ladderLook(L);
  return `<li class="mo-rung${L === 5 || L === 8 ? ' mo-rung--outfit' : ''}"><span class="mo-lv" aria-hidden="true">${L}</span><div class="mo-rung-main"><b>${t.replace('&', '&amp;')}</b><span class="mo-rung-xp">${L === 1 ? 'Start · 0 XP' : `Reached at ${fmt(xpFor(L))} XP`} · ${fmt(xpFor(L + 1) - xpFor(L))} XP to level ${L + 1}</span><p>${LADDER_NOTES[i]}</p></div><div class="mo-rung-omer"><span class="mo-fig">${move(look)}</span><span class="mo-rung-look">${lookName}</span></div>${L > 1 ? `<button class="btn btn--sm btn--secondary mo-rung-play" type="button" data-mo-level="${L}" aria-label="Play the level ${L} level-up">Play</button>` : '<span class="mo-rung-play" aria-hidden="true"></span>'}</li>`;
}).join('')}</ol>`;

// ── §5.6 badges, from core lib/badges.ts and lib/omerMoments.ts (BADGE_OUTFITS).
const BADGES = [
  ['📥', 'First Steps', 'Bring your first transactions into the app.', 'builder', 'The Builder', 'Proverbs 21:5'],
  ['🔥', 'Week of Diligence', 'Answer the question of the day 7 days in a row.', 'coach', 'The Coach', '—'],
  ['🗓️', 'Month of Faithfulness', 'Answer the question of the day 30 days in a row.', 'coach', 'The Coach', 'Luke 16:10'],
  ['🎯', 'Know Your Flock', 'Score 100% on a quiz.', 'wrangler', 'The Wrangler', 'Proverbs 27:23'],
  ['💝', 'Cheerful Giver', 'Give in three consecutive months.', 'gardener', 'The Gardener', '2 Corinthians 9:7'],
  ['🌾', 'First Fruits', 'Give 10% or more of a month’s income.', 'gardener', 'The Gardener', 'Proverbs 3:9'],
  ['⚔️', 'Debt Slayer', 'Confirm a loan paid off.', 'hero', 'The Hero', 'Proverbs 22:7'] ];
const badges = `<div class="tbl"><table class="mo-badges"><thead><tr><th>Badge</th><th>How it’s earned</th><th>Omer</th><th>Verse</th></tr></thead><tbody>${BADGES.map(([e, n, how, k, who, verse], i) => `<tr><td><span class="mo-medal-chip"><span class="mo-medal-face" aria-hidden="true">${e}<i class="mo-medal-shine" style="--d:${(i * 0.6).toFixed(1)}s"></i></span><b>${n}</b></span></td><td>${how}</td><td><span class="mo-badge-omer"><span class="mo-fig">${move(k)}</span>${who}</span></td><td class="small muted">${verse}</td></tr>`).join('')}</tbody></table></div>`;

// ── Figures the page script drops into the streak and level-up moments.
const templates = ['coach', 'jump', 'builder'].map(k => `<template id="mo-tpl-${k}">${move(k)}</template>`).join('') + `<template id="mo-tpl-hero">${hero()}</template>`;

const PARTS = {
  poses: `<div class="mo-grid">${POSE_CARDS.map(card).join('')}</div>`,
  outfits: `<div class="mo-grid mo-grid--3">${OUTFIT_CARDS.map(c => card([...c, 'app'])).join('')}</div>`,
  sky, ladder, badges, templates };
module.exports = html => html.replace(/<!--mo:([a-z]+)-->/g, (m, k) => { if (!(k in PARTS)) throw new Error('motion.cjs: unknown ' + m); return PARTS[k]; });
