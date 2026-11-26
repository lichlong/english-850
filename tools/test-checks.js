// tools/test-checks.js —— 守住"两套实现不漂移"
// 用法：node tools/test-checks.js
//
// 背景：词形还原在仓库里有两份——Node 侧 tools/lib/vocab.js（measure.js 用，权威），
// 浏览器侧 tools/checks.js（admin.html 用）。两份必须给出完全一样的判定，
// 否则"工作台说没事、measure 说有超纲"，工作台就白做了。
// 所以这里逐个 token 比对，再核对几个关键总数。
const { loadData, wordCount, tokensOf, makeLookup, wordsIn, unitText } = require("./lib/vocab");
const Checks = require("./checks.js");

const V = loadData(["data/words.js", "data/units.js", "data/extras.js", "data/exercises.js", "data/glossary.js", "data/contractions.js"]);
const lk = makeLookup(V);
const clk = Checks.makeLookup(V);

let pass = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name + (extra ? "  " + extra : "")); }
  else { fails.push(name + (extra ? "  " + extra : "")); console.log("  ✗ " + name + (extra ? "  " + extra : "")); }
}
function eq(name, a, b) { ok(name, a === b, "(" + a + " vs " + b + ")"); }

// ---------- 1. 逐个 token 比对还原结果 ----------
console.log("\n[1] 词形还原：checks.js 与 lib/vocab.js 是否一致");
{
  const texts = [];
  for (const u of V.UNITS || []) texts.push(unitText(u));
  for (const d of Object.values(V.EXTRAS || {})) {
    for (const b of (d.read && d.read.blocks) || []) { texts.push(b.std); texts.push(b.simple); }
  }
  for (const q of V.EXERCISES || []) texts.push(q.en);

  const uniq = new Set();
  texts.forEach((t) => tokensOf(t).forEach((w) => uniq.add(w)));

  const diff = [];
  for (const t of uniq) {
    const a = lk.lookup(t);
    const b = clk.lookup(t);
    const ka = a ? a.kind + ":" + a.base : "null";
    const kb = b ? b.kind + ":" + b.base : "null";
    if (ka !== kb) diff.push(t + " → node " + ka + " / browser " + kb);
  }
  ok("比对 " + uniq.size + " 个不同 token", diff.length === 0, diff.length ? diff.slice(0, 8).join(" | ") : "");
}

// ---------- 2. 单元：数字与 node 侧独立算一遍 ----------
console.log("\n[2] 单元体检");
const U = Checks.checkUnits(V.UNITS || [], clk);
{
  const seen = new Set();
  let bad = 0;
  for (const u of V.UNITS || []) {
    const r = U.rows.find((x) => x.id === u.id);
    const total = wordCount(unitText(u));
    const ws = [...wordsIn(unitText(u), lk)];
    const fresh = ws.filter((w) => !seen.has(w));
    fresh.forEach((w) => seen.add(w));
    if (r.total !== total) bad++;
    if (r.uniq !== ws.length) bad++;
    if (r.fresh.length !== fresh.length) bad++;
    if (r.missing.length !== new Set(tokensOf(unitText(u)).filter((t) => !lk.lookup(t))).size) bad++;
  }
  ok("13 个单元的词数/去重/新词/超纲 与 node 侧一致", bad === 0, bad ? bad + " 处不一致" : "");
  eq("累计覆盖", U.coveredCount, seen.size);
  eq("覆盖 = 367（当前实测，内容变了要一起改）", U.coveredCount, 367);
  eq("词表总数", U.wordTotal, 850);
  ok("超纲 0", U.rows.every((r) => r.missing.length === 0));
  eq("新词不合规的单元数", U.badFresh.length, 4);
}

// ---------- 3. 练习池 ----------
console.log("\n[3] 练习池");
const E = Checks.checkExercises(V.EXERCISES || [], clk);
{
  const LIMIT = { low: { min: 0, max: 8, sent: 1 }, mid: { min: 8, max: 18, sent: 2 }, high: { min: 20, max: 40, sent: 3 } };
  let bad = 0;
  for (const q of V.EXERCISES || []) {
    const r = E.rows.find((x) => x.id === q.id);
    const L = LIMIT[q.level];
    const n = wordCount(q.en);
    const s = (q.en.match(/[.!?]/g) || []).length;
    const shouldFail = !L || n < L.min || n > L.max || s > L.sent;
    if (!!r.problems.find((p) => p.type === "level") !== shouldFail) bad++;
    if (r.words !== n) bad++;
  }
  ok("96 句的词数/句数判定与 node 侧一致", bad === 0, bad ? bad + " 处不一致" : "");
  eq("练习句总数", E.total, 96);
  eq("低阶 / 当阶 / 进阶", [E.byLevel.low, E.byLevel.mid, E.byLevel.high].join("/"), "32/32/32");
  ok("练习超纲 0", E.badWords.length === 0, E.badWords.join(" "));
}

// ---------- 4. 拓展 ----------
console.log("\n[4] 拓展");
const X = Checks.checkExtras(V.EXTRAS || {}, clk);
{
  let total = 0, gloss = 0;
  const miss = new Set();
  for (const d of Object.values(V.EXTRAS || {})) {
    for (const b of (d.read && d.read.blocks) || []) {
      for (const t of tokensOf(b.std)) {
        total++;
        const hit = lk.lookup(t);
        if (hit && hit.kind === "glossary") gloss++;
        if (!hit) miss.add(t);
      }
    }
  }
  eq("原文词次", X.stdTotal, total);
  eq("glossary 兜住的次数", X.viaGlossary, gloss);
  ok("原文未注解 0", X.stdMissing.length === 0, X.stdMissing.join(" "));
  ok("简说超纲 0", X.simpleBad.length === 0, X.simpleBad.join(" "));
  console.log("  原文 " + X.stdTotal + " 词次 · glossary " + X.viaGlossary + " 次（与 measure.js 同口径）");
}

// ---------- 5. 规则表 ----------
console.log("\n[5] 规则表");
{
  const R = Checks.rules(U, E, X);
  eq("规则条数", R.length, 8);
  const byKey = {};
  R.forEach((r) => (byKey[r.key] = r));
  ok("长度规则：应为不通过（u001–u003 合计不足 230 词）", byKey["长度"].pass === false, byKey["长度"].detail.join(" | "));
  ok("超纲规则：通过", byKey["超纲"].pass === true);
  ok("新词规则：不通过（4 个单元）", byKey["新词"].pass === false, byKey["新词"].detail.join(" | "));
  ok("档位规则：通过", byKey["档位"].pass === true);
  ok("每条规则都有跳转目标", R.every((r) => r.go));
}

console.log("\n结果：通过 " + pass + " · 失败 " + fails.length);
if (fails.length) { console.log("失败项：\n  " + fails.join("\n  ")); process.exit(1); }
