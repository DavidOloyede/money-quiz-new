const H = { cream:'#fffcf5', white:'#ffffff',
  linen:{'50':'#faf7f1','100':'#f4efe5','200':'#e8e0cf','300':'#d3c7b0','400':'#a2937b','500':'#71634f','600':'#55483a','700':'#40352a','800':'#2b241b','900':'#201a13'},
  forest:{'50':'#f0f6f0','200':'#badcc3','500':'#2f8749','600':'#21703c','700':'#1c5a32','800':'#174827'},
  honey:{'50':'#fdf8ec','100':'#faefd1','200':'#f5dfa3','400':'#e5b13c','500':'#ce9118','700':'#8a560e','800':'#714711'},
  sky:{'50':'#f2f9fc','200':'#c8e3f3','700':'#286b8b','800':'#275a73'},
  coral:{'50':'#fbf3f1','500':'#d56048','700':'#a7422f','800':'#8a3727'} };
const hx = n => (n === 'cream' || n === 'white') ? H[n] : H[n.split('/')[0]][n.split('/')[1]];
const rgb = h => ({ r: parseInt(h.slice(1,3),16)/255, g: parseInt(h.slice(3,5),16)/255, b: parseInt(h.slice(5,7),16)/255 });
const FN = { nB:{family:'Nunito',style:'Black'}, nXB:{family:'Nunito',style:'ExtraBold'}, iR:{family:'Inter',style:'Regular'}, iM:{family:'Inter',style:'Medium'}, iSB:{family:'Inter',style:'Semi Bold'} };
await Promise.all(Object.values(FN).map(f => figma.loadFontAsync(f)));
const colls = await figma.variables.getLocalVariableCollectionsAsync();
const cn = Object.fromEntries(colls.map(c => [c.id, c.name]));
const PV = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (cn[v.variableCollectionId] === 'Primitives') PV[v.name] = v;
const P = n => { const p = { type: 'SOLID', color: rgb(hx(n)) }; return PV[n] ? figma.variables.setBoundVariableForPaint(p, 'color', PV[n]) : p; };
const TS = Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s => [s.name, s]));
async function tx(parent, s, o = {}) {
  const t = figma.createText();
  if (o.style) await t.setTextStyleIdAsync(TS[o.style].id);
  else { t.fontName = o.font || FN.iR; t.fontSize = o.size || 14; if (o.lh) t.lineHeight = { unit: 'PIXELS', value: o.lh }; }
  t.characters = s; t.fills = [P(o.color || 'linen/900')];
  if (o.align) t.textAlignHorizontal = o.align;
  parent.appendChild(t);
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = 'HEIGHT'; }
  else if (o.fill) { t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; }
  return t;
}
function AL(parent, dir, o = {}) {
  const f = figma.createAutoLayout(dir === 'H' ? 'HORIZONTAL' : 'VERTICAL');
  f.name = o.name || (dir === 'H' ? 'Row' : 'Stack');
  f.fills = o.bg ? [P(o.bg)] : [];
  f.itemSpacing = o.gap ?? 0;
  const p = o.p == null ? [0,0,0,0] : typeof o.p === 'number' ? [o.p,o.p,o.p,o.p] : o.p.length === 2 ? [o.p[0],o.p[1],o.p[0],o.p[1]] : o.p;
  f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
  if (o.r != null) f.cornerRadius = o.r;
  if (o.stroke) { f.strokes = [P(o.stroke)]; f.strokeWeight = 1; f.strokeAlign = 'INSIDE'; }
  if (o.align) f.counterAxisAlignItems = o.align;
  if (o.justify) f.primaryAxisAlignItems = o.justify;
  if (o.wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = o.gap ?? 0; }
  if (parent) parent.appendChild(f);
  if (o.w || o.h) f.resize(o.w || Math.max(1, f.width), o.h || Math.max(1, f.height));
  f.layoutSizingHorizontal = o.w ? 'FIXED' : o.fillW ? 'FILL' : 'HUG';
  f.layoutSizingVertical = o.h ? 'FIXED' : o.fillH ? 'FILL' : 'HUG';
  return f;
}
const card = (parent, o = {}) => AL(parent, o.dir || 'V', Object.assign({ bg: 'cream', r: 16, stroke: 'linen/200', p: 24, gap: 12, name: 'Card' }, o));
async function kv(parent, title, rows, kw = 120) {
  const c = card(parent, { fillW: true, fillH: true, p: [20, 24], gap: 0, name: `Spec/${title}` });
  await tx(c, title, { style: 'Coach/Card Title' });
  for (const [k, v] of rows) { const r = AL(c, 'H', { fillW: true, gap: 16, p: [9, 0], align: 'CENTER' }); r.strokes = [P('linen/100')]; r.strokeTopWeight = 1; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; const kk = AL(r, 'H', { w: kw }); await tx(kk, k, { font: FN.iSB, size: 13, color: 'linen/800', fill: true }); await tx(r, v, { font: FN.iR, size: 13, lh: 19, color: 'linen/700', fill: true }); }
  return c;
}
async function block(parent, code, title, desc) {
  const b = AL(parent, 'V', { name: `${code} ${title}`, gap: 24, fillW: true });
  const hd = AL(b, 'V', { gap: 8, fillW: true, name: 'Block header' });
  const row = AL(hd, 'H', { gap: 12, align: 'CENTER' });
  await tx(row, code, { font: FN.iSB, size: 14, color: 'honey/700' });
  await tx(row, title, { style: 'Coach/Section Title' });
  if (desc) await tx(hd, desc, { font: FN.iR, size: 15, lh: 24, color: 'linen/600', w: 860 });
  return b;
}

// Omer v2: the manna bowl with two stubby legs and a wardrobe. 200 x 200 construction grid.
// Plain functions so the same source can be pasted into a use_figma script.
const PAL = { ink: '#201a13', body: '#e5b13c', shade: '#ce9118', rim: '#fffcf5', inside: '#f5dfa3', cheek: '#e9aea0', flake: '#eecb6b', flakeLine: '#ad720d',
  cream: '#fffcf5', h200: '#f5dfa3', h300: '#eecb6b', h400: '#e5b13c', h500: '#ce9118', h600: '#ad720d', h700: '#8a560e', h800: '#714711',
  f300: '#8fc49d', f400: '#57a56e', f500: '#2f8749', f600: '#21703c', f700: '#1c5a32', f800: '#174827',
  s100: '#e5f2f8', s200: '#c8e3f3', s300: '#9ad0ec', s600: '#3487ad', s700: '#286b8b', s800: '#275a73',
  c300: '#e9aea0', c400: '#dd806c', c500: '#d56048', c600: '#c75039', c700: '#a7422f',
  l300: '#d3c7b0', l400: '#a2937b', l500: '#71634f', l600: '#55483a', l700: '#40352a', l800: '#2b241b' };
const INK = PAL.ink;
const star4 = (cx, cy, r) => `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
const qp = a => `M${a[0]} ${a[1]}Q${a[2]} ${a[3]} ${a[4]} ${a[5]}` + (a[6] ? `l${a[6]} 0.6` : '');
const limb = (a, fill) => { const d = qp(a); return `<path d="${d}" stroke="${INK}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="${fill || PAL.body}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; };
const at = (a, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * a[2] + t * t * a[4], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * a[3] + t * t * a[5]].map(v => +v.toFixed(1));
const cuff = (a, color) => { const [x1, y1] = at(a, 0.66), [x2, y2] = at(a, 0.86); const d = `M${x1} ${y1}L${x2} ${y2}`; return `<path d="${d}" stroke="${INK}" stroke-width="16"/><path d="${d}" stroke="${color}" stroke-width="10"/>`; };
const ln = (d, c, w, extra = '') => `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none" ${extra}/>`;
const shape = (d, fill, w = 4, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" ${extra}/>`;

// Limbs: [x0, y0, cx, cy, x1, y1, footNub]. Arms end round (no hands); legs end in a tiny outward foot.
const ARMS = {
  idle: { L: [26, 104, 10, 112, 14, 128], R: [174, 104, 190, 112, 186, 128] },
  wave: { L: [26, 104, 10, 112, 14, 128], R: [174, 100, 192, 88, 188, 64] },
  cheer: { L: [26, 100, 8, 86, 14, 62], R: [174, 100, 192, 86, 186, 62] },
  thinking: { L: [26, 104, 10, 112, 14, 128], R: [170, 110, 172, 140, 146, 144], front: ['R'] },
  oops: { L: [28, 98, 12, 78, 34, 62], R: [174, 104, 190, 112, 186, 128] },
  proud: { L: [26, 102, 4, 112, 22, 126], R: [174, 102, 196, 112, 178, 126] },
  giving: { L: [30, 110, 40, 146, 82, 150], R: [170, 110, 160, 146, 118, 150], front: ['L', 'R'] },
  lift: { L: [26, 100, 8, 80, 40, 48], R: [174, 100, 192, 80, 160, 48] },
  hold: { L: [26, 104, 10, 112, 14, 128], R: [172, 108, 188, 136, 158, 142], front: ['R'] },
  magnify: { L: [26, 104, 10, 112, 14, 128], R: [172, 110, 182, 144, 160, 150], front: ['R'] },
  fly: { L: [26, 104, 8, 116, 4, 132], R: [174, 98, 194, 86, 198, 66] },
  raise: { L: [26, 104, 10, 112, 14, 128], R: [174, 100, 190, 86, 184, 66] } };
const LEGS = {
  stand: { L: [88, 150, 87, 168, 85, 183, -6], R: [112, 150, 113, 168, 115, 183, 6] },
  wide: { L: [86, 150, 80, 168, 74, 181, -6], R: [114, 150, 120, 168, 126, 181, 6] },
  dangle: { L: [88, 150, 86, 164, 84, 176, -2], R: [112, 150, 114, 164, 116, 176, 2] },
  cross: { L: [88, 150, 92, 168, 106, 183, 6], R: [112, 150, 112, 168, 98, 183, -6] },
  pigeon: { L: [86, 150, 94, 168, 88, 183, 6], R: [114, 150, 106, 168, 112, 183, -6] },
  tap: { L: [88, 150, 87, 168, 85, 183, -6], R: [112, 150, 118, 166, 124, 176, 6] },
  fly: { L: [86, 150, 68, 158, 48, 158, -2], R: [106, 154, 88, 168, 66, 170, -2] } };

function eyes(kind, dx, far) {
  const xs = [[76 + dx + (far ? 4 : 0), far || 1], [124 + dx, 1]];
  if (kind === 'happy') return xs.map(([x, s]) => ln(`M${x - 10 * s} 116Q${x} 102 ${x + 10 * s} 116`, INK, 5)).join('');
  if (kind === 'sleepy') return xs.map(([x, s]) => ln(`M${x - 10 * s} 112Q${x} 121 ${x + 10 * s} 112`, INK, 5)).join('');
  const one = (x, s, rx, ry) => `<ellipse cx="${x}" cy="112" rx="${rx * s}" ry="${ry}" fill="${INK}"/><path d="${star4(x - 3.5 * s + (kind === 'up' ? 2 : 0), kind === 'up' ? 104 : 106, ry > 16 ? 6 : 4.5)}" fill="#fff"/><circle cx="${x + 4 * s}" cy="${112 + ry * 0.43}" r="${ry > 16 ? 2.6 : 2}" fill="#fff"/>`;
  if (kind === 'magnified') return one(xs[0][0], xs[0][1], 11, 14) + one(xs[1][0], 1, 15, 19);
  return xs.map(([x, s]) => one(x, s, 11, 14)).join('');
}
function mouth(kind, dx) {
  const x = 100 + dx;
  if (kind === 'open') return `<path d="M${x - 12} 126Q${x} 146 ${x + 12} 126Z" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="${x}" cy="133" rx="5" ry="2.8" fill="${PAL.c400}"/>`;
  if (kind === 'o') return `<ellipse cx="${x + 4}" cy="133" rx="4.5" ry="5.5" fill="${INK}"/>`;
  if (kind === 'small') return `<ellipse cx="${x}" cy="133" rx="3.5" ry="3" fill="${INK}"/>`;
  if (kind === 'wobbly') return ln(`M${x - 11} 132Q${x - 5.5} 127 ${x} 132Q${x + 5.5} 137 ${x + 11} 132`, INK, 4);
  if (kind === 'grin') return ln(`M${x - 14} 126Q${x} 143 ${x + 14} 126`, INK, 4.5);
  if (kind === 'smirk') return ln(`M${x - 9} 131Q${x + 2} 137 ${x + 11} 127`, INK, 4.5);
  return ln(`M${x - 10} 128Q${x} 138 ${x + 10} 128`, INK, 4.5);
}
function bodySvg(view) {
  const bowl = 'M20 78C20 128 56 160 100 160C144 160 180 128 180 78Z';
  let s = `<path d="${bowl}" fill="${PAL.body}"/>`;
  s += view === 'back' ? `<path d="M20 78C20 128 56 160 100 160C66 152 40 124 36 80Z" fill="${PAL.shade}"/>` : `<path d="M180 78C180 128 144 160 100 160C134 152 160 124 164 80Z" fill="${PAL.shade}"/>`;
  if (view !== 'back') s += ln('M36 94C38 108 44 118 52 126', '#fff', 5, 'stroke-opacity="0.55"');
  s += `<path d="${bowl}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<ellipse cx="100" cy="78" rx="80" ry="16" fill="${PAL.rim}" stroke="${INK}" stroke-width="4"/><ellipse cx="100" cy="79" rx="66" ry="10" fill="${PAL.inside}" stroke="${INK}" stroke-width="3"/>`;
  return s;
}
const heap = () => `<g stroke="${PAL.flakeLine}" stroke-width="1.6"><ellipse cx="88" cy="76" rx="7" ry="5" fill="${PAL.flake}"/><ellipse cx="112" cy="76" rx="6.5" ry="4.6" fill="${PAL.flake}"/><ellipse cx="100" cy="72" rx="7.5" ry="5.4" fill="${PAL.body}"/></g>`;
function faceSvg(o, view) {
  if (view === 'back') return '';
  if (view === 'side') return `<ellipse cx="160" cy="112" rx="7" ry="14" fill="${INK}"/><path d="${star4(158, 106, 3.5)}" fill="#fff"/><ellipse cx="165" cy="131" rx="6" ry="5" fill="${PAL.cheek}"/>` + ln('M150 129Q157 135 164 129', INK, 4);
  const dx = view === '34' ? 16 : 0, far = view === '34' ? 0.72 : 0;
  let s = `<ellipse cx="${58 + dx + (far ? 8 : 0)}" cy="130" rx="${10 * (far || 1)}" ry="6" fill="${PAL.cheek}"/><ellipse cx="${142 + dx}" cy="130" rx="10" ry="6" fill="${PAL.cheek}"/>`;
  if (o.mask) s += o.mask;
  return s + eyes(o.eyes || 'open', dx, far) + mouth(o.mouth || 'smile', dx);
}

// ── The wardrobe. Each outfit fills named layers around the base drawing.
const OUTFITS = {
  hero: { arms: 'fly', legs: 'fly', eyes: 'open', mouth: 'grin', wrist: PAL.h300, transform: 'translate(40 26) scale(0.74) rotate(8 100 120)',
    back: shape('M156 74C116 60 60 60 26 72C10 54 -16 44 -40 52C-28 64 -32 80 -26 92C-38 104 -34 120 -24 130C-12 120 6 118 18 124C16 106 24 92 42 86Z', PAL.f600) + ln('M-22 60C-12 74 -10 92 -12 112M0 58C8 72 10 90 6 112', PAL.f800, 3),
    onBody: [24, 176].map(x => `<circle cx="${x}" cy="82" r="6" fill="${PAL.h300}" stroke="${INK}" stroke-width="3"/>`).join(''),
    extra: ln('M6 140H26M12 156H36M6 172H24', INK, 3, 'stroke-opacity="0.45"') },
  detective: { arms: 'magnify', legs: 'stand', eyes: 'magnified', mouth: 'smirk', heap: false,
    hat: `<g transform="rotate(-6 100 60)">` + shape('M60 68C58 40 76 24 100 24C124 24 142 40 140 68Z', PAL.l400) + ln('M80 27C76 40 74 54 74 68M120 27C124 40 126 54 126 68M62 48C80 44 120 44 138 48', PAL.l600, 2.5) + shape('M68 66C84 80 116 80 132 66C116 71 84 71 68 66Z', PAL.l500, 3.5) + shape('M100 22C94 14 82 14 84 22C86 28 96 26 100 22C104 26 114 28 116 22C118 14 106 14 100 22Z', PAL.l400, 2.5) + `</g>`,
    props: `<circle cx="124" cy="112" r="22" fill="${PAL.s100}" fill-opacity="0.35"/><circle cx="124" cy="112" r="22" fill="none" stroke="${PAL.l800}" stroke-width="5"/>` + ln('M139 128L156 146', INK, 13) + ln('M139 128L156 146', PAL.h700, 7) },
  coach: { arms: 'lift', legs: 'wide', eyes: 'happy', mouth: 'grin', wrist: PAL.f500,
    back: ln('M22 48H178', INK, 8) + ln('M22 48H178', PAL.l500, 3.5),
    props: [18, 182].map(x => `<circle cx="${x}" cy="48" r="15" fill="${INK}"/><circle cx="${x - 5}" cy="42" r="3.5" fill="#fff" fill-opacity="0.35"/>`).join(''),
    onBody: ln('M22 86A78 15 0 0 0 178 86', INK, 16) + ln('M22 86A78 15 0 0 0 178 86', PAL.f500, 10) + ln('M22 86A78 15 0 0 0 178 86', PAL.cream, 2.5) + ln('M176 90Q188 92 194 104M176 90Q190 88 198 96', INK, 8) + ln('M176 90Q188 92 194 104M176 90Q190 88 198 96', PAL.f500, 4) },
  chef: { arms: 'raise', legs: 'stand', eyes: 'happy', mouth: 'open', heap: false,
    hat: shape('M64 56C46 54 46 26 66 26C66 8 92 4 100 18C108 4 134 8 134 26C154 26 154 54 136 56Z', PAL.cream) + ln('M84 54C82 44 84 36 88 30M100 54V32M116 54C118 44 116 36 112 30', PAL.l300, 2.5) + `<rect x="64" y="52" width="72" height="18" rx="5" fill="${PAL.cream}" stroke="${INK}" stroke-width="4"/>`,
    props: ln('M184 70L192 30', INK, 10) + ln('M184 70L192 30', PAL.h700, 5) + `<ellipse cx="193" cy="22" rx="6.5" ry="10" fill="${PAL.h600}" stroke="${INK}" stroke-width="3.5"/>`,
    extra: `<path d="${star4(30, 44, 9)}" fill="${PAL.h300}" stroke="${INK}" stroke-width="2"/>` },
  wrangler: { arms: 'raise', legs: 'wide', eyes: 'open', mouth: 'grin', heap: false,
    onBody: shape('M66 140C88 150 112 150 134 140L100 164Z', PAL.f500, 3) + [[88, 147], [100, 151], [112, 147], [100, 158]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${PAL.cream}"/>`).join(''),
    hat: `<g transform="rotate(-8 100 64)">` + shape('M66 66C64 42 70 28 84 28C92 28 96 34 100 34C104 34 108 28 116 28C130 28 136 42 134 66Z', PAL.h700) + shape('M66 60C88 66 112 66 134 60V52C112 58 88 58 66 52Z', PAL.f600, 2.5) + shape('M28 64C28 56 38 54 44 60C70 74 130 74 156 60C162 54 172 56 172 64C162 82 38 82 28 64Z', PAL.h700) + ln('M48 70C76 80 124 80 152 70', PAL.h800, 2.5) + `</g>`,
    props: ln('M184 66C190 52 184 44 176 40', INK, 7) + ln('M184 66C190 52 184 44 176 40', PAL.l400, 3.5) + `<ellipse cx="156" cy="30" rx="30" ry="9" fill="none" stroke="${INK}" stroke-width="7"/><ellipse cx="156" cy="30" rx="30" ry="9" fill="none" stroke="${PAL.l400}" stroke-width="3.5"/>` },
  builder: { arms: 'raise', legs: 'stand', eyes: 'open', mouth: 'grin', heap: false,
    hat: shape('M62 68C62 38 80 26 100 26C120 26 138 38 138 68Z', PAL.c500) + shape('M93 27C95 26 105 26 107 27V67H93Z', PAL.c600, 2.5) + shape('M50 66H150C154 66 154 75 148 75H52C46 75 46 66 50 66Z', PAL.c600),
    props: ln('M182 76L187 40', INK, 10) + ln('M182 76L187 40', PAL.h700, 5) + `<rect x="174" y="24" width="26" height="15" rx="4" fill="${PAL.l500}" stroke="${INK}" stroke-width="3.5"/><path d="M179 28V35" stroke="${PAL.l400}" stroke-width="2.5" stroke-linecap="round"/>` },
  gardener: { arms: 'giving', legs: 'stand', eyes: 'happy', mouth: 'smile', heap: false,
    hat: shape('M26 70C26 56 62 52 100 52C138 52 174 56 174 70C174 80 138 84 100 84C62 84 26 80 26 70Z', PAL.h200) + ln('M42 72C78 80 122 80 158 72', PAL.h500, 2) + shape('M66 66C66 40 80 30 100 30C120 30 134 40 134 66C120 70 80 70 66 66Z', PAL.h200) + shape('M66 60C88 65 112 65 134 60V52C112 57 88 57 66 52Z', PAL.f500, 2.5) + [[0, -6], [6, -2], [4, 5], [-4, 5], [-6, -2]].map(([x, y]) => `<circle cx="${124 + x}" cy="${54 + y}" r="4" fill="${PAL.c300}" stroke="${INK}" stroke-width="1.5"/>`).join('') + `<circle cx="124" cy="54" r="2.6" fill="${PAL.h400}"/>`,
    props: ln('M100 138V112', PAL.f600, 4) + shape('M100 124C88 110 76 114 80 124C88 130 96 128 100 124Z', PAL.f400, 2.5) + shape('M100 118C110 104 124 106 122 116C114 122 106 122 100 118Z', PAL.f400, 2.5) + `<rect x="74" y="136" width="52" height="10" rx="3" fill="${PAL.c500}" stroke="${INK}" stroke-width="3"/>` + shape('M79 146H121L115 172H85Z', PAL.c600, 3.5) },
  graduate: { arms: 'raise', legs: 'stand', eyes: 'happy', mouth: 'open', heap: false,
    hat: shape('M70 60C70 74 84 78 100 78C116 78 130 74 130 60Z', PAL.l800) + shape('M100 32L164 50L100 68L36 50Z', PAL.l700) + `<circle cx="100" cy="50" r="3.5" fill="${PAL.h400}"/>` + ln('M100 50C122 52 146 52 154 56L156 78', PAL.h400, 3) + shape('M151 76H161L163 90H149Z', PAL.h400, 2),
    props: `<g transform="rotate(-62 186 54)"><rect x="160" y="47" width="52" height="15" rx="7.5" fill="${PAL.cream}" stroke="${INK}" stroke-width="3"/><rect x="182" y="47" width="7" height="15" fill="${PAL.f600}"/></g>`,
    extra: [[26, 40, 9], [176, 100, 7]].map(([x, y, r]) => `<path d="${star4(x, y, r)}" fill="${PAL.h300}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`).join('') },
  dreamer: { arms: 'idle', legs: 'pigeon', eyes: 'sleepy', mouth: 'small', heap: false,
    hat: shape('M64 70C62 44 80 28 104 28C136 28 164 42 180 62C168 54 152 56 140 62C139 65 138 68 138 70Z', PAL.s700) + [[88, 48, 4], [114, 40, 3.5], [134, 54, 3]].map(([x, y, r]) => `<path d="${star4(x, y, r)}" fill="${PAL.h300}"/>`).join('') + shape('M62 72C62 62 138 62 138 72C138 80 62 80 62 72Z', PAL.cream, 3.5) + `<circle cx="182" cy="64" r="9" fill="${PAL.cream}" stroke="${INK}" stroke-width="3"/>`,
    extra: ln('M24 38H38L24 52H38M46 18H56L46 28H56', INK, 3.2) } };

const POSES = {
  idle: { arms: 'idle', legs: 'stand' },
  wave: { arms: 'wave', legs: 'tap', mouth: 'open', extra: ln('M198 52Q206 62 200 74M180 46Q174 54 176 62', INK, 3) },
  cheer: { arms: 'cheer', legs: 'wide', eyes: 'happy', mouth: 'open', extra: [[28, 34, 10], [174, 30, 8], [100, 18, 6]].map(([x, y, r]) => `<path d="${star4(x, y, r)}" fill="${PAL.h300}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`).join('') },
  jump: { arms: 'cheer', legs: 'dangle', eyes: 'happy', mouth: 'open', jump: true },
  thinking: { arms: 'thinking', legs: 'cross', eyes: 'up', mouth: 'o', extra: `<circle cx="150" cy="50" r="4" fill="${PAL.cream}" stroke="${INK}" stroke-width="2.5"/><circle cx="164" cy="34" r="6" fill="${PAL.cream}" stroke="${INK}" stroke-width="2.5"/><circle cx="184" cy="16" r="9" fill="${PAL.cream}" stroke="${INK}" stroke-width="2.5"/>` },
  oops: { arms: 'oops', legs: 'pigeon', mouth: 'wobbly', extra: `<path d="M48 42Q57 55 52 62Q48 66 44 62Q39 55 48 42Z" fill="${PAL.s300}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` },
  proud: { arms: 'proud', legs: 'wide', eyes: 'happy', mouth: 'grin', onBody: shape('M124 150L118 168 125 164 129 170 131 152Z', PAL.f500, 2.5) + shape('M132 150L134 168 139 162 145 166 139 149Z', PAL.f500, 2.5) + `<circle cx="130" cy="146" r="10" fill="${PAL.h300}" stroke="${INK}" stroke-width="3"/><path d="${star4(130, 146, 5.5)}" fill="${PAL.h500}"/>` },
  giving: { arms: 'giving', legs: 'stand', props: `<circle cx="100" cy="150" r="20" fill="${PAL.h200}" fill-opacity="0.7"/><ellipse cx="100" cy="150" rx="12" ry="9" fill="${PAL.flake}" stroke="${PAL.flakeLine}" stroke-width="2"/>` } };

function omer(opts) {
  const o = Object.assign({}, opts.outfit ? OUTFITS[opts.outfit] : POSES[opts.pose || 'idle'] || {}, opts);
  const view = o.view || 'front';
  const arms = ARMS[o.arms || 'idle'], legs = LEGS[o.legs || 'stand'];
  const front = arms.front || [];
  let s = `<ellipse cx="100" cy="191" rx="${o.jump ? 30 : 46}" ry="5" fill="${INK}" fill-opacity="${o.jump ? 0.08 : 0.12}"/>`;
  if (o.jump) s += ln('M84 176v10M100 179v10M116 176v10', INK, 3, 'stroke-opacity="0.45"');
  const tf = o.transform || (o.jump ? 'translate(0 -16)' : '');
  s += `<g${tf ? ` transform="${tf}"` : ''}>`;
  s += o.back || '';
  if (view === 'side') s += limb([100, 150, 99, 168, 97, 183, 6], PAL.shade) + limb([108, 150, 109, 168, 110, 183, 7]);
  else if (view === '34') s += limb([94, 150, 93, 168, 90, 183, -5], PAL.shade) + limb([120, 150, 121, 168, 124, 183, 7]);
  else if (o.legacy) s += `<path d="M78 156H122L118 171Q117 176 112 176H88Q83 176 82 171Z" fill="${PAL.shade}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  else s += limb(legs.L) + limb(legs.R);
  if (view !== 'side') for (const k of ['L', 'R']) if (!front.includes(k)) s += limb(arms[k]) + (o.wrist ? cuff(arms[k], o.wrist) : '');
  s += bodySvg(view);
  if (o.heap !== false) s += heap();
  s += faceSvg(o, view);
  s += o.onBody || '';
  s += o.hat || '';
  s += o.props || '';
  if (view === 'side') s += limb([98, 100, 95, 120, 107, 133]);
  else for (const k of front) s += limb(arms[k]) + (o.wrist ? cuff(arms[k], o.wrist) : '');
  s += '</g>' + (o.extra || '');
  const size = o.size || 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200" fill="none">${s}</svg>`;
}

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
  ['detective', 'The Detective', 'Contextual', 'Thinking and loading, quiz questions, “show the receipts”, spotting a new recurring charge.', 'Linen-400 deerstalker with linen-600 checks, and a magnifying glass that enlarges one eye. Stands up straight, with a knowing smirk.'],
  ['coach', 'The Coach', 'Earned', 'The daily habit: the question-of-the-day streak, streak goal days, Week of Diligence and Month of Faithfulness.', 'Forest-500 sweatband with a cream stripe tied at the side, forest wristbands, and a barbell with a black ball on each end.'],
  ['chef', 'The Chef', 'Contextual', 'Food questions and insights: groceries vs dining out, a week of cooking at home, the Dining budget.', 'A puffy cream toque on a band and a wooden spoon raised like a toast.'],
  ['wrangler', 'The Wrangler', 'Contextual', 'Rounding up recurring charges and subscriptions; the Know Your Flock badge for a perfect quiz.', 'Honey-700 hat with a forest-600 band, a forest-500 bandana with cream dots, and a lasso swinging overhead.'],
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

// ── Level card (8:316, on the §2 page): the app's formula, 50·L·(L−1), puts level 3
// at 120 of the 300 XP to level 4 (it said 40 / 120). The bar fills 40%, not a third.
const lc = await figma.getNodeByIdAsync('8:316');
const levelCard = { text: [], bar: [] };
if (lc && 'findAll' in lc) {
  for (const t of lc.findAll(n => n.type === 'TEXT' && /XP to level/.test(n.characters))) {
    await Promise.all(t.getStyledTextSegments(['fontName']).map(sg => figma.loadFontAsync(sg.fontName)));
    t.characters = t.characters.replace(/[\d,]+\s*\/\s*[\d,]+(\s*XP)/, '120 / 300$1');
    levelCard.text.push({ id: t.id, now: t.characters });
  }
  for (const n of lc.findAll(n => (n.type === 'RECTANGLE' || n.type === 'FRAME') && n.parent && 'width' in n.parent)) {
    const ratio = n.width / n.parent.width;
    if (Math.abs(ratio - 1 / 3) < 0.03 && n.parent.width > 60 && n.height <= 16) {
      n.resize(Math.round(n.parent.width * 0.4), n.height);
      levelCard.bar.push({ id: n.id, name: n.name, width: n.width });
    }
  }
  await lc.screenshot({ scale: 1 });
}

const n33 = gs.children[idx], n34 = gs.children[idx + 1];
await n33.screenshot({ scale: 0.35 });
await n34.screenshot({ scale: 0.4 });
return { renumbered, order: gs.children.map(n => n.name), height: Math.round(gs.height), levelCard };
