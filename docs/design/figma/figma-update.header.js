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
