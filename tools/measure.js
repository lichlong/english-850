// 按 SPEC §4.5 的可测指标，量一遍 data/ 里的内容
// 用法：node tools/measure.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const f of ["data/words.js", "data/units.js"]) {
  const code = fs.readFileSync(path.join(root, f), "utf8");
  vm.runInContext(code, sandbox, { filename: f });
}

const WORDS = sandbox.window.WORDS || {};
const FORMS = sandbox.window.WORD_FORMS || {};
const UNITS = sandbox.window.UNITS || [];

const wordCount = (s) => (String(s).match(/[A-Za-z']+/g) || []).length;
const tokensOf = (s) =>
  (String(s).match(/[A-Za-z']+/g) || []).map((w) => w.toLowerCase());

// 与 reader.js 的 findWord 保持同一套还原规则
function lookup(raw) {
  const w = raw.toLowerCase();
  if (WORDS[w]) return w;
  if (FORMS[w] && WORDS[FORMS[w]]) return FORMS[w];
  const cands = [
    w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
    w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
    w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, ""),
  ];
  for (const c of cands) if (c && WORDS[c]) return c;
  return null;
}

const allMissing = new Map();
const rows = [];

for (const u of UNITS) {
  const shortWords = u.short.reduce((n, s) => n + wordCount(s.en), 0);
  const longWords = u.long.reduce((n, s) => n + wordCount(s.en), 0);
  const passWords = u.passage.paragraphs.reduce((n, p) => n + wordCount(p.en), 0);
  const total = shortWords + longWords + passWords;

  const toks = []
    .concat(...u.short.map((s) => tokensOf(s.en)))
    .concat(...u.long.map((s) => tokensOf(s.en)))
    .concat(...u.passage.paragraphs.map((p) => tokensOf(p.en)));

  const missing = new Map();
  for (const t of toks) {
    if (!lookup(t)) missing.set(t, (missing.get(t) || 0) + 1);
  }
  for (const [w, n] of missing) allMissing.set(w, (allMissing.get(w) || 0) + n);

  rows.push({
    id: u.id,
    name: u.mnemonic,
    short: u.short.length,
    long: u.long.length,
    para: u.passage.paragraphs.length,
    shortWords,
    longWords,
    passWords,
    total,
    uniq: new Set(toks).size,
    missing: missing.size,
    missingList: [...missing.keys()].sort(),
  });
}

console.log("== 词表规模 ==");
console.log("WORDS 条数:", Object.keys(WORDS).length, "| WORD_FORMS:", Object.keys(FORMS).length);

console.log("\n== 单元体检（SPEC §4.1 / §4.5） ==");
console.log("指标：短句 5–8 / 长句 3–5 / 短文 1 篇 150–250 词 / 单元合计 300–450 词 / 超纲词 0");
for (const r of rows) {
  console.log(
    `${r.id} ${r.name}  短${r.short}句(${r.shortWords}词) 长${r.long}句(${r.longWords}词) ` +
    `短文${r.para}段(${r.passWords}词) 合计${r.total}词 去重${r.uniq} 超纲${r.missing}`
  );
}

console.log("\n== 超纲词（不在词表里，点了会显示「这个词还不在词表里」） ==");
const sorted = [...allMissing.entries()].sort((a, b) => b[1] - a[1]);
console.log("共", sorted.length, "个：");
console.log(sorted.map(([w, n]) => `${w}×${n}`).join("  "));
