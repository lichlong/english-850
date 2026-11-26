// 词覆盖与缺口（SPEC §4.4 / §11.8）
// 用法：
//   node tools/coverage.js          看覆盖率、剩余哪些词、下一批该挑哪 22 个
//   node tools/coverage.js --plan   把建议的 22 个词写成 tools/next-unit.txt（先定词，再写内容）
//
// 排程口径：新词按「词频从高到低」挑，但一旦某个词已经出现过，就不再算新词。
// 这是"先定词 → 再写 → measure.js 核对"的第一步。
const fs = require("fs");
const path = require("path");
const { ROOT, loadData, makeLookup, wordsIn, unitText } = require("./lib/vocab");

const V = loadData();
const { WORDS, lookup } = makeLookup(V);
const UNITS = V.UNITS || [];
const ALL = Object.keys(WORDS);
const TOTAL = ALL.length;

// 词频序号：数字越小越常用。表里没有的排到最后。
const rank = new Map();
for (const line of fs.readFileSync(path.join(ROOT, "tools", "freq-rank.txt"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const [w, n] = t.split(/\s+/);
  rank.set(w, Number(n));
}
const rankOf = (w) => (rank.has(w) ? rank.get(w) : 99999);

// 已覆盖：按单元顺序累加（与 measure.js 同一口径）
const covered = new Set();
const appear = new Map();
for (const u of UNITS) {
  const ws = wordsIn(unitText(u), { lookup });
  ws.forEach((w) => appear.set(w, (appear.get(w) || 0) + 1));
  ws.forEach((w) => covered.add(w));
}

const gap = ALL.filter((w) => !covered.has(w)).sort((a, b) => rankOf(a) - rankOf(b));
const state = { fresh: 0, mid: 0, firm: 0 };
for (const w of covered) {
  const n = appear.get(w) || 0;
  if (n <= 4) state.fresh++;
  else if (n <= 14) state.mid++;
  else state.firm++;
}

console.log("\n== 覆盖率 ==");
console.log(`已覆盖 ${covered.size} / ${TOTAL} = ${Math.round((covered.size / TOTAL) * 100)}%　剩余 ${gap.length} 词`);
console.log(`词状态：新词(1–4 次) ${state.fresh} · 巩固中(5–14 次) ${state.mid} · 已巩固(≥15 次) ${state.firm}`);
console.log(`按每单元 22 个新词算，覆盖完还差 ${Math.ceil(gap.length / 22)} 个单元`);

console.log("\n== 剩余词按词频排（前 30，越靠前越该先学） ==");
console.log(gap.slice(0, 30).map((w) => `${w}(${rankOf(w)})`).join("  "));

const BATCH = 22;
const batch = gap.slice(0, BATCH);
console.log(`\n== 建议下一单元新词（${BATCH} 个，词频最高的未学词） ==`);
console.log(batch.join(" "));
console.log("\n下一步：把这批词写进 tools/next-unit.txt（或直接加 --plan 生成），");
console.log("先按这批词写内容，写完跑 node tools/measure.js 核对「首次出现」是否等于 " + batch.length + "。");

// ---- --plan：把建议写成计划文件 ----
if (process.argv.includes("--plan")) {
  const nextId = "u" + String(UNITS.length + 1).padStart(3, "0");
  const out = [
    "# 下一单元计划（先定词，再写；写完跑 node tools/measure.js 核对）",
    "# 用法：node tools/coverage.js --plan 重新生成，或手工改下面的词",
    `# unit: ${nextId}`,
    "# theme: （从 SPEC §11.7 常青白名单里选一个）",
    "# 每行一个词，20–25 个",
    "",
    ...batch,
    "",
  ].join("\n");
  const p = path.join(ROOT, "tools", "next-unit.txt");
  fs.writeFileSync(p, out, "utf8");
  console.log(`\n已写入 tools/next-unit.txt（${nextId}，${batch.length} 词），现在可以去写内容了。`);
}
