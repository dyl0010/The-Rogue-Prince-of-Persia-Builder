const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('manual_html/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error('index.html script not found');
const cut = script.split('function escapeHtml')[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${cut};this.out={data};`, ctx);
const ids = new Set(ctx.out.data.map((item) => item.id));
const refs = [...html.matchAll(/data-med="([^"]+)"/g)].map((match) => match[1]);
const missing = [...new Set(refs.filter((id) => !ids.has(id)))];
console.log(`build_med_refs=${refs.length}`);
console.log(`missing_refs=${missing.length}`);
if (missing.length) console.log(missing.join(String.fromCharCode(10)));
if (missing.length) process.exit(1);
