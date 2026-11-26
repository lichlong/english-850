// 临时草稿校验（不入库）：node tools/_draft-check.js <draft.json>
// 检查：1) 超纲词 2) 会变成"新词"但不在计划内的词 3) 各段词数
const fs = require("fs");
const { loadData, makeLookup, tokensOf, wordCount, wordsIn, unitText } = require("./lib/vocab");

const V = loadData();
const lk = makeLookup(V);
const UNITS = V.UNITS || [];
const PLAN = new Set(
  fs.readFileSync("tools/next-unit.txt", "utf8").split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((w) => w.toLowerCase())
);

// 已覆盖集合（前 8 个单元）
const covered = new Set();
UNITS.forEach((u) => [...wordsIn(unitText(u), lk)].forEach((w) => covered.add(w)));

const draft = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const text = unitText(draft);

const bad = new Map();
const extraNew = new Map();
const OK_KINDS = ["word", "allowed", "deviation", "contraction"];
for (const t of tokensOf(text)) {
  const hit = lk.lookup(t);
  // 与 measure/checks 同口径：dict 与 glossary 都算超纲
  if (!hit || OK_KINDS.indexOf(hit.kind) === -1) bad.set(t, (bad.get(t) || 0) + 1);
  else if (hit.kind === "word" && !covered.has(hit.base) && !PLAN.has(hit.base)) {
    extraNew.set(hit.base, (extraNew.get(hit.base) || 0) + 1);
  }
}

const fresh = [...wordsIn(text, lk)].filter((w) => !covered.has(w));
const missingPlan = [...PLAN].filter((w) => !fresh.includes(w));

console.log("短句", draft.short.length, "条", draft.short.reduce((n, s) => n + wordCount(s.en), 0), "词");
console.log("长句", draft.long.length, "条", draft.long.reduce((n, s) => n + wordCount(s.en), 0), "词");
console.log("短文", draft.passage.paragraphs.length, "段", draft.passage.paragraphs.reduce((n, p) => n + wordCount(p.en), 0), "词");
console.log("合计", wordCount(text), "词");
console.log("首次出现（新词）", fresh.length, "个");
console.log("  计划内已用", [...PLAN].filter((w) => fresh.includes(w)).length, "/", PLAN.size);
console.log("  计划里还没用上：", missingPlan.join(" ") || "（无）");
console.log("  计划外的新词（要从文里删掉或改写法）：", [...extraNew.keys()].join(" ") || "（无）");
console.log("超纲词：", [...bad.entries()].map(([w, n]) => w + "×" + n).join(" ") || "（无）");
