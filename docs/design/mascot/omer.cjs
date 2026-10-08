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
if (typeof module !== 'undefined') module.exports = { omer, OUTFITS, POSES };
