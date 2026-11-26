// 内容审计：把 SPEC 里"内容要求"变成可判定项，一次跑完
// 用法：node tools/audit.js
// 说明：measure.js 管"数字对不对"（长度/新词/超纲），本脚本管"内容像不像话"
//      ——中英对照有没有缺、句子长短是否在区间、简说是否比原文短、有没有重复、缩写是否统一。
const fs = require("fs");
const path = require("path");
const { loadData, makeLookup, tokensOf, wordCount, unitText } = require("./lib/vocab");

const V = loadData();
const { lookup } = makeLookup(V);
const UNITS = V.UNITS || [];
const EXTRAS = V.EXTRAS || {};
const EX = V.EXERCISES || [];

const fails = [];
const warns = [];
function bad(rule, msg) { fails.push(rule + "｜" + msg); }
function warn(rule, msg) { warns.push(rule + "｜" + msg); }

// A1 中英对照完整性
{
  let n = 0, miss = 0;
  const blank = (s) => !String(s == null ? "" : s).trim();
  UNITS.forEach((u) => {
    u.short.forEach((s, i) => { n++; if (blank(s.en) || blank(s.zh)) { miss++; bad("A1", `${u.id} 短句${i + 1} 缺中文或英文`); } });
    u.long.forEach((s, i) => { n++; if (blank(s.en) || blank(s.zh)) { miss++; bad("A1", `${u.id} 长句${i + 1} 缺中文或英文`); } });
    u.passage.paragraphs.forEach((p, i) => { n++; if (blank(p.en) || blank(p.zh)) { miss++; bad("A1", `${u.id} 短文段${i + 1} 缺中文或英文`); } });
  });
  Object.entries(EXTRAS).forEach(([id, d]) => {
    (d.read.blocks || []).forEach((b, i) => {
      n++;
      if (blank(b.std) || blank(b.zh) || blank(b.simple)) { miss++; bad("A1", `${id} 拓展块${i + 1} 三件（原文/中文/简说）不齐`); }
    });
  });
  EX.forEach((q) => { n++; if (blank(q.en) || blank(q.zh)) { miss++; bad("A1", `${q.id} 练习 缺中文或英文`); } });
  if (!miss) console.log(`A1 中英对照完整：${n} 条全部有中英 ✓`);
  else console.log(`A1 中英对照：${n} 条里 ${miss} 条有缺口 ✗`);
}

// A2 句子长度（SPEC §4.1：短句 5–10 词 / 长句 15–25 词）
{
  let over = 0, under = 0;
  UNITS.forEach((u) => {
    u.short.forEach((s, i) => {
      const n = wordCount(s.en);
      if (n < 5) { under++; warn("A2", `${u.id} 短句${i + 1} 只有 ${n} 词（目标 5–10）`); }
      if (n > 10) { over++; warn("A2", `${u.id} 短句${i + 1} 有 ${n} 词（目标 5–10）`); }
    });
    u.long.forEach((s, i) => {
      const n = wordCount(s.en);
      if (n < 15) { under++; warn("A2", `${u.id} 长句${i + 1} 只有 ${n} 词（目标 15–25）`); }
      if (n > 25) { over++; warn("A2", `${u.id} 长句${i + 1} 有 ${n} 词（目标 15–25）`); }
    });
  });
  console.log(`A2 句子长度：${under ? under + " 处偏短" : "无偏短"} · ${over ? over + " 处偏长" : "无偏长"}（详见告警）`);
}

// A3 短文：段数与标题
{
  let badN = 0;
  UNITS.forEach((u) => {
    const p = u.passage;
    if (!p || !p.paragraphs || p.paragraphs.length < 3) { badN++; bad("A3", `${u.id} 短文少于 3 段`); }
    if (!p || !String(p.title || "").trim()) { badN++; bad("A3", `${u.id} 短文没有标题`); }
  });
  if (!badN) console.log(`A3 短文结构：${UNITS.length} 篇都有标题且 ≥3 段 ✓`);
}

// A4 缩写统一（SPEC §4.2.1）：不该出现 do not / is not 这类展开式
{
  const RULES = [["do not"], ["does not"], ["did not"], ["is not"], ["are not"], ["was not"], ["were not"], ["will not"], ["have not"], ["has not"], ["can not"], ["cannot"], ["it is"], ["that is"], ["there is"], ["I am"]];
  const hits = [];
  const scan = (where, text) => {
    const lower = " " + String(text).toLowerCase() + " ";
    RULES.forEach(([p]) => { if (lower.indexOf(" " + p + " ") !== -1) hits.push(where + " → " + p); });
  };
  UNITS.forEach((u) => {
    u.short.forEach((s, i) => scan(`${u.id}短${i + 1}`, s.en));
    u.long.forEach((s, i) => scan(`${u.id}长${i + 1}`, s.en));
    u.passage.paragraphs.forEach((p, i) => scan(`${u.id}文${i + 1}`, p.en));
  });
  Object.entries(EXTRAS).forEach(([id, d]) => (d.read.blocks || []).forEach((b, i) => { scan(`${id}原文${i + 1}`, b.std); scan(`${id}简说${i + 1}`, b.simple); }));
  EX.forEach((q) => scan(q.id, q.en));
  if (!hits.length) console.log("A4 缩写统一：没有展开式写法 ✓");
  else hits.forEach((h) => warn("A4", h));
}

// A5 重复句（同一条英文出现两次以上）
{
  const seen = new Map();
  const add = (where, text) => {
    const k = String(text).toLowerCase().replace(/\s+/g, " ").trim();
    if (!k) return;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(where);
  };
  UNITS.forEach((u) => {
    u.short.forEach((s, i) => add(`${u.id}短${i + 1}`, s.en));
    u.long.forEach((s, i) => add(`${u.id}长${i + 1}`, s.en));
  });
  EX.forEach((q) => add(q.id, q.en));
  const dup = [...seen.entries()].filter(([, v]) => v.length > 1);
  if (!dup.length) console.log("A5 重复句：无 ✓");
  else dup.forEach(([k, v]) => bad("A5", v.join(" = ") + " 重复：" + k.slice(0, 60)));
}

// A6 简说必须比原文短（信息压缩才有意义）
{
  let badN = 0;
  Object.entries(EXTRAS).forEach(([id, d]) => {
    (d.read.blocks || []).forEach((b, i) => {
      const a = wordCount(b.std), s = wordCount(b.simple);
      if (s >= a) { badN++; warn("A6", `${id} 块${i + 1} 简说 ${s} 词 ≥ 原文 ${a} 词`); }
    });
  });
  if (!badN) console.log("A6 简说压缩：每块都比原文短 ✓");
}

// A7 音标格式
{
  const all = Object.keys(V.WORDS);
  const missIpa = all.filter((w) => !V.WORDS[w].ipa);
  const badFmt = all.filter((w) => V.WORDS[w].ipa && !/^\/.+\/$/.test(V.WORDS[w].ipa));
  console.log(`A7 音标：${all.length - missIpa.length}/${all.length} 有音标 · 格式不对 ${badFmt.length} 个`);
  if (missIpa.length) bad("A7", "缺音标：" + missIpa.slice(0, 12).join(" "));
}

// A8 单元结构够不够撑起每天版面（短 ≥3 / 长 ≥2）
{
  let badN = 0;
  UNITS.forEach((u) => {
    if (u.short.length < 3) { badN++; bad("A8", `${u.id} 短句只有 ${u.short.length} 条（版面要 2 固定 + 1 动态）`); }
    if (u.long.length < 2) { badN++; bad("A8", `${u.id} 长句只有 ${u.long.length} 条（版面要 1 固定 + 1 动态）`); }
  });
  if (!badN) console.log("A8 单元结构：都能撑起当天版面 ✓");
}

// A9 练习池档位配比
{
  const by = { low: 0, mid: 0, high: 0 };
  EX.forEach((q) => (by[q.level] = (by[q.level] || 0) + 1));
  const gap = Math.max(by.low, by.mid, by.high) - Math.min(by.low, by.mid, by.high);
  console.log(`A9 练习池：${EX.length} 句（低 ${by.low} / 当 ${by.mid} / 进 ${by.high}），三档差 ${gap}`);
  if (gap > 8) warn("A9", "三档数量差超过 8，抽题手感会偏");
}

console.log("");
console.log("— 结果：" + (fails.length ? fails.length + " 项不通过" : "不通过 0 项") + " · 告警 " + warns.length + " 项");
if (fails.length) { console.log("\n不通过："); fails.forEach((f) => console.log("  ✗ " + f)); }
if (warns.length) { console.log("\n告警（不拦，但该知道）："); warns.slice(0, 40).forEach((w) => console.log("  ! " + w)); if (warns.length > 40) console.log("  …共 " + warns.length + " 条"); }
if (fails.length) process.exit(1);
