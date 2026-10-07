// Rebuilds figma-update.js (one use_figma script) from its header, the Omer generator and its body.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const omer = read('../mascot/omer.cjs').split('\n').filter(l => !l.startsWith('if (typeof module')).join('\n');
const out = read('figma-update.header.js') + '\n' + omer + '\n' + read('figma-update.body.js');
fs.writeFileSync(path.join(__dirname, 'figma-update.js'), out);
console.log('figma-update.js', out.length, 'chars (use_figma limit 50,000)');
