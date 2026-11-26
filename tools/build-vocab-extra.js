// 补全 850 词的音标 / 词性 / 完整释义（SPEC §4.3.2 L1：一步到位，别分期补）
// 用法：node tools/build-vocab-extra.js   → 写 tools/vocab-extra.json
// 之后 node tools/gen-words.js 把它合进 data/words.js
//
// 两个数据源，各管一段，都不进仓库：
//   .cache/ipa-en-us.txt  ← open-dict-data/ipa-dict（MIT），格式 `word\t/ipa/`，管音标
//   .cache/ecdict.csv     ← skywind3000/ECDICT（MIT），管词性与完整释义
// 只有音标源也能跑；有词典源就顺带补词性。
const fs = require("fs");
const path = require("path");
const ecdict = require("./lib/ecdict");

const ROOT = path.join(__dirname, "..");
const IPA = path.join(ROOT, ".cache", "ipa-en-us.txt");
const CSV = path.join(ROOT, ".cache", "ecdict.csv");
const OUT = path.join(ROOT, "tools", "vocab-extra.json");

const words = fs.readFileSync(path.join(ROOT, "tools", "basic-850.txt"), "utf8")
  .split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"))
  .map((l) => l.split("|")[0].trim().toLowerCase());
if (words.length !== 850) { console.error("词表不是 850 条，实际 " + words.length); process.exit(1); }
const want = new Set(words);

// ---------- 1. 音标 ----------
const ipa = new Map();
if (fs.existsSync(IPA)) {
  for (const line of fs.readFileSync(IPA, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("\t");
    if (i < 0) continue;
    const w = line.slice(0, i).trim().toLowerCase();
    if (!want.has(w) || ipa.has(w)) continue;
    const v = line.slice(i + 1).trim().split(",")[0].trim(); // 多个读音取第一个
    if (v) ipa.set(w, v);
  }
}

// ---------- 2. 词性 + 完整释义（有 ECDICT 才做） ----------
const meta = new Map();
if (fs.existsSync(CSV)) {
  const entries = ecdict.loadEntries(CSV, want);
  for (const [w, e] of entries) {
    meta.set(w, { pos: ecdict.pickPos(e), full: ecdict.shortZh(e, 40) });
  }
}

const out = {};
const missIpa = [];
const missPos = [];
words.forEach((w) => {
  const m = meta.get(w) || {};
  const item = { ipa: ipa.get(w) || "", pos: m.pos || "", full: m.full || "" };
  if (!item.ipa) missIpa.push(w);
  if (!item.pos) missPos.push(w);
  if (item.ipa || item.pos || item.full) out[w] = item;
});

fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n", "utf8");

const ipaN = Object.values(out).filter((x) => x.ipa).length;
const posN = Object.values(out).filter((x) => x.pos).length;
console.log("已写出 " + path.relative(ROOT, OUT));
console.log("共 " + Object.keys(out).length + " / 850 条 · 有音标 " + ipaN + " · 有词性 " + posN);
if (!fs.existsSync(CSV)) console.log("（没找到 .cache/ecdict.csv：词性与完整释义留空，只补了音标）");
if (missIpa.length) console.log("缺音标（" + missIpa.length + "）：" + missIpa.join(" "));
