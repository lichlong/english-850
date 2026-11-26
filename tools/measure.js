// 按 SPEC §4.5 的可测指标，量一遍 data/ 里的内容
// 用法：node tools/measure.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const f of ["data/words.js", "data/units.js", "data/extras.js"]) {
  const code = fs.readFileSync(path.join(root, f), "utf8");
  vm.runInContext(code, sandbox, { filename: f });
}

const WORDS = sandbox.window.WORDS || {};
const FORMS = sandbox.window.WORD_FORMS || {};
const ALLOWED = sandbox.window.WORD_ALLOWED || {};
const DEVIATION = sandbox.window.WORD_DEVIATION || {};
const UNITS = sandbox.window.UNITS || [];
const EXTRAS = sandbox.window.EXTRAS || {};

const wordCount = (s) => (String(s).match(/[A-Za-z']+/g) || []).length;
const tokensOf = (s) =>
  (String(s).match(/[A-Za-z']+/g) || []).map((w) => w.toLowerCase());

// 与 reader.js 的 findWord 保持同一套还原规则
function lookup(raw) {
  let w = raw.toLowerCase();
  if (/'s$/.test(w)) w = w.slice(0, -2); // 所有格 father's → father
  else w = w.replace(/'+$/, "");
  if (WORDS[w]) return w;
  if (ALLOWED[w]) return w; // 原文允许项（代词 / 数字 / 日历 / -ly 派生），不计超纲
  if (DEVIATION[w]) return w; // 偏离词（用户确认放行），单独计数
  if (FORMS[w]) {
    const b = FORMS[w];
    if (WORDS[b] || DEVIATION[b]) return b;
  }
  const cands = [
    w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
    w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
    w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, ""),
  ];
  for (const c of cands) if (c && (WORDS[c] || ALLOWED[c] || DEVIATION[c])) return c;
  return null;
}

let allowedHits = 0;
let devHits = 0;

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
    const hit = lookup(t);
    if (!hit) missing.set(t, (missing.get(t) || 0) + 1);
    else if (ALLOWED[hit]) allowedHits++;
    else if (DEVIATION[hit]) devHits++;
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

console.log("\n== 词表规模 ==");
console.log(
  "WORDS 条数:", Object.keys(WORDS).length,
  "| WORD_FORMS:", Object.keys(FORMS).length,
  "| WORD_ALLOWED:", Object.keys(ALLOWED).length,
  "| WORD_DEVIATION:", Object.keys(DEVIATION).length,
  "（代词/数字/日历/派生，不计超纲）"
);
console.log("允许项出现 " + allowedHits + " 次 · 偏离词出现 " + devHits + " 次（均不计超纲）");

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

// ===== 课外内容体检（SPEC §11.9 第 6 条）=====
// 只看"简说"和练习答案；"原文"按文体写，允许超纲
console.log("\n== 课外内容体检（简说 / 练习答案只用 850 内） ==");
{
  const rows2 = [];
  const bad = new Map();
  for (const [id, d] of Object.entries(EXTRAS)) {
    const texts = [].concat(
      d.read.blocks.map((b) => b.simple),
      d.quiz.map((q) => q.en)
    );
    let n = 0;
    for (const t of texts) {
      for (const tok of tokensOf(t)) {
        n++;
        if (!lookup(tok)) bad.set(id + ":" + tok, (bad.get(id + ":" + tok) || 0) + 1);
      }
    }
    rows2.push(`${id} 简说${d.read.blocks.length}段 练习${d.quiz.length}题 用词${n}`);
  }
  rows2.forEach((r) => console.log(r));
  if (!bad.size) console.log("结果：超纲 0 ✓");
  else {
    console.log("结果：超纲 " + bad.size + " →");
    console.log([...bad.keys()].join("  "));
  }
}
