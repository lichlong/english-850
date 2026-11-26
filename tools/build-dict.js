// 生成延伸注解 data/dict.js（SPEC §4.3.2 L2）
// 用法：node tools/build-dict.js
// 前置：.cache/ecdict.csv（ECDICT，MIT，66 MB，不进仓库）
//
// 干什么：把「课外原文」里出现、但 850 / 允许项 / 偏离词 / 手写 glossary 都没有的词挑出来，
//        从 ECDICT 取一行中文，写成 window.DICT。
// 为什么：原文不限词，每个词都要点得开；手写跟不上 200 段原文的量。
// 口径：DICT 里的词算 "dict"，单元正文与简说用了它**一律算超纲**（checks.js / measure.js 已按此判）。
const fs = require("fs");
const path = require("path");
const ecdict = require("./lib/ecdict");
const { loadData, makeLookup, tokensOf } = require("./lib/vocab");

const ROOT = path.join(__dirname, "..");
const CSV = path.join(ROOT, ".cache", "ecdict.csv");

if (!fs.existsSync(CSV)) {
  console.error("找不到 " + CSV);
  console.error("先下载：curl -L -o .cache/ecdict.csv https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv");
  process.exit(1);
}

const V = loadData();
const { lookup } = makeLookup(V);

// 1. 收集原文里查不到的词
const need = new Set();
for (const d of Object.values(V.EXTRAS || {})) {
  for (const b of (d.read && d.read.blocks) || []) {
    for (const t of tokensOf(b.std)) {
      const hit = lookup(t);
      if (!hit) need.add(t);
    }
  }
}

if (!need.size) {
  console.log("原文里没有缺口，dict.js 不需要更新");
  process.exit(0);
}

// 2. 查词典
const entries = ecdict.loadEntries(CSV, need);
const out = {};
const miss = [];
for (const w of need) {
  const e = entries.get(w);
  const zh = e ? ecdict.shortZh(e, 18) : "";
  if (zh) out[w] = { zh };
  else miss.push(w);
}

// 3. 写文件（排序，方便 diff）
const keys = Object.keys(out).sort();
const lines = [];
lines.push("// 延伸注解（SPEC §4.3.2 L2）");
lines.push("// 收「课外原文」里出现、但 850 / 允许项 / 偏离词 / 手写 glossary 都没有的词。");
lines.push("// 由 node tools/build-dict.js 从 ECDICT（MIT）生成，**不要手改**；CSV 不进仓库。");
lines.push("// kind 口径：这里查出来的词算 \"dict\"，单元正文与简说用它一律算超纲。");
lines.push("window.DICT = {");
keys.forEach((w) => {
  lines.push("  " + JSON.stringify(w) + ": { zh: " + JSON.stringify(out[w].zh) + " },");
});
lines.push("};");
fs.writeFileSync(path.join(ROOT, "data", "dict.js"), lines.join("\n") + "\n", "utf8");

console.log("原文缺口 " + need.size + " 个词 → 写进 data/dict.js " + keys.length + " 个");
if (miss.length) console.log("词典里也没有（" + miss.length + "，要手工补 glossary）：" + miss.join(" "));
