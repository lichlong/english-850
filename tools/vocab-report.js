// 生成词汇总表（SPEC §4.3.2 L1）：node tools/vocab-report.js
// 输出 docs/vocab-850.md：850 词 × 中文 / 组 / 是否已覆盖 / 出现次数 / 首次出现单元
// 用途：补音标、查缺口、给内容定词时对照。这份表是"算出来的"，不要手改。
const fs = require("fs");
const path = require("path");
const { ROOT, loadData, makeLookup, wordsIn, unitText } = require("./lib/vocab");

const V = loadData();
const lk = makeLookup(V);
const { WORDS, ALLOWED, DEVIATION } = lk;
const UNITS = V.UNITS || [];

// 每个词的出现次数与首次出现单元
const count = new Map();
const first = new Map();
// 口径与 measure.js 一致：按"在几个单元里出现过"计数（= 累计接触天数），不按词次
UNITS.forEach((u) => {
  wordsIn(unitText(u), lk).forEach((w) => {
    count.set(w, (count.get(w) || 0) + 1);
    if (!first.has(w)) first.set(w, u.id);
  });
});

const rows = Object.keys(WORDS).sort().map((w) => {
  const n = count.get(w) || 0;
  const e = WORDS[w] || {};
  return {
    w,
    zh: e.zh || "",
    pos: e.pos || "",
    ipa: e.ipa || "",
    grp: e.g || "",
    n,
    unit: first.get(w) || "",
    state: n === 0 ? "未出现" : n <= 4 ? "新词" : n <= 14 ? "巩固中" : "已巩固"
  };
});

const covered = rows.filter((r) => r.n > 0).length;
const out = [];
out.push("# 词汇总表（850 词）");
out.push("");
out.push("> 由 `node tools/vocab-report.js` 生成，**不要手改**。改词表请改 `tools/basic-850.txt` + `data/words.js`，再重新生成。");
out.push("");
out.push(`- 计数口径：出现次数 = 这个词在几个单元里出现过（等于累计接触天数）
- 词表总数：**${rows.length}**；已出现 **${covered}**，未出现 **${rows.length - covered}**`);
out.push(`- 有音标 ${rows.filter((r) => r.ipa).length} 个 · 有词性 ${rows.filter((r) => r.pos).length} 个`);
out.push(`- 允许项 ${Object.keys(ALLOWED).length} 条 / 偏离词 ${Object.keys(DEVIATION).length} 条（单独计，不进本表）`);
out.push("");
out.push("| 词 | 音标 | 词性 | 中文 | 组 | 出现在几课 | 首次出现 | 状态 |");
out.push("|---|---|---|---|---|---|---|---|");
rows.forEach((r) => {
  out.push(`| ${r.w} | ${r.ipa || "—"} | ${r.pos || "—"} | ${r.zh} | ${r.grp} | ${r.n} | ${r.unit || "—"} | ${r.state} |`);
});
out.push("");

const dir = path.join(ROOT, "docs");
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
const file = path.join(dir, "vocab-850.md");
fs.writeFileSync(file, out.join("\n"), "utf8");

console.log("已写出 " + path.relative(ROOT, file));
console.log("词表 " + rows.length + " · 已出现 " + covered + " · 未出现 " + (rows.length - covered));
