const fs = require('fs');
const vm = require('vm');

const htmlPath = 'manual_html/build_graph_vis.html';
const dataPath = 'manual_html/assets/graph_data.js';

const html = fs.readFileSync(htmlPath, 'utf8');
const dataSource = fs.readFileSync(dataPath, 'utf8');

const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!scriptMatches.length) throw new Error('No inline script found in graph page.');
const inlineScript = scriptMatches.at(-1)[1];

new vm.Script(inlineScript, { filename: 'build_graph_vis.inline.js' });

const dataContext = { window: {} };
vm.createContext(dataContext);
vm.runInContext(dataSource, dataContext, { filename: dataPath });
const data = dataContext.window.TRPOP_GRAPH_DATA;
if (!data) throw new Error('window.TRPOP_GRAPH_DATA was not defined.');

const graphMetaStart = inlineScript.indexOf('const graphMeta=');
const graphMetaEnd = inlineScript.indexOf('function capsFor', graphMetaStart);
if (graphMetaStart < 0 || graphMetaEnd < 0) throw new Error('Could not extract graphMeta block.');
const graphMetaSource = inlineScript
  .slice(graphMetaStart + 'const graphMeta='.length, graphMetaEnd)
  .trim()
  .replace(/;$/, '');
const graphMeta = vm.runInNewContext(`(${graphMetaSource})`);

const canonicalWeaponZh = {
  double_daggers: '双匕',
  panjeh_poladin: '波拉丁之爪',
  censer: '香炉',
  caestus: '拳套',
  corrupted_sword: '腐化之剑',
  chained_dagger: '链式匕首',
  berserkers_axes: '狂战士之斧',
  hammer_knife: '锤与刃',
  dented_pot: '凹陷的锅',
  poisoned_claws: '毒爪',
  kaalis_scythes: '卡利的镰刀',
  baatars_horns: '巴塔尔之角',
  royal_sword: '皇家宝剑',
  corrupted_axe: '腐化之斧',
  javelin: '标枪',
  iron_mace: '铁锤杖',
  monk_staff: '僧杖',
  broadsword: '阔剑',
  corrupted_spear: '旋风矛',
  tabar: '匈人巨斧',
  imperial_axe: '帝国之斧',
  slayer: '屠杀者',
  plague_bearer: '瘟疫之刃',
  blazing_cuffs: '烈焰腕甲',
  shamal_crescent: '沙马勒新月',
};
const nameMismatches = data.weapons
  .filter((weapon) => canonicalWeaponZh[weapon.id] && weapon.zh !== canonicalWeaponZh[weapon.id])
  .map((weapon) => `${weapon.id}: ${weapon.zh} !== ${canonicalWeaponZh[weapon.id]}`);

const stateIds = ['poison', 'freeze', 'fire', 'resin', 'stun', 'crit', 'energy', 'special', 'shield', 'vayu', 'heal', 'gold', 'damage', 'corrupted'];
const nodeIds = new Set([
  ...data.weapons.map((node) => `weapon:${node.id}`),
  ...data.tools.map((node) => `tool:${node.id}`),
  ...data.affixes.map((node) => `affix:${node.id}`),
  ...data.data.map((node) => `medallion:${node.id}`),
  ...stateIds.map((id) => `state:${id}`),
]);

const missingRefs = [];
for (const [id, meta] of Object.entries(graphMeta)) {
  if (!nodeIds.has(id)) missingRefs.push(`graphMeta key: ${id}`);
  for (const ref of meta.synergy || []) {
    if (!nodeIds.has(ref)) missingRefs.push(`${id} -> ${ref}`);
  }
}

const artificialRoutesAbsent = inlineScript.includes('const archetypes=[];') && inlineScript.includes('const tagArch={};');
const expectedNodes = data.weapons.length + data.tools.length + data.affixes.length + data.data.length + stateIds.length;
const externalRefs = (html.match(/https?:\/\//g) || []).length;

console.log(`node_check=pass`);
console.log(`weapons=${data.weapons.length}`);
console.log(`tools=${data.tools.length}`);
console.log(`affixes=${data.affixes.length}`);
console.log(`medallions=${data.data.length}`);
console.log(`graphMeta_entries=${Object.keys(graphMeta).length}`);
console.log(`expected_nodes_without_archetypes=${expectedNodes}`);
console.log(`archetypes_empty=${artificialRoutesAbsent ? 1 : 0}`);
console.log(`weapon_name_mismatches=${nameMismatches.length}`);
if (nameMismatches.length) console.log(nameMismatches.join(String.fromCharCode(10)));
console.log(`missing_refs=${missingRefs.length}`);
if (missingRefs.length) console.log(missingRefs.join(String.fromCharCode(10)));
console.log(`external_refs=${externalRefs}`);

if (!artificialRoutesAbsent) throw new Error('Artificial archetype/route nodes are not disabled.');
if (nameMismatches.length) throw new Error('graph_data weapon Chinese names diverge from canonical SC_Chars names.');
if (missingRefs.length) throw new Error('graphMeta contains references to missing nodes.');
if (externalRefs !== 0) throw new Error('Graph page contains external runtime URL references.');
