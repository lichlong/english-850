// 按 SPEC 的可测指标，量一遍 data/ 里的内容
// 用法：node tools/measure.js
// 这是唯一的数字来源。改完内容必须跑，不跑等于没做（HANDOFF §6）。
const fs = require("fs");
const path = require("path");
const { ROOT, loadData, wordCount, tokensOf, makeLookup, wordsIn, unitText } = require("./lib/vocab");

// 多带一个 js/exercises.js：练习池的"解锁课时"用的就是网页那套逻辑，不另写一份
const V = loadData(["data/words.js", "data/glossary.js", "data/contractions.js", "data/units.js", "data/extras.js", "data/exercises.js", "js/exercises.js"]);
const { lookup, WORDS, FORMS, ALLOWED, DEVIATION } = makeLookup(V);
const UNITS = V.UNITS || [];
const EXTRAS = V.EXTRAS || {};
const EXERCISES = V.EXERCISES || [];

let allowedHits = 0;
let devHits = 0;

// ===================== 1. 单元体检 =====================
const allMissing = new Map();
const rows = [];

for (const u of UNITS) {
  const shortWords = u.short.reduce((n, s) => n + wordCount(s.en), 0);
  const longWords = u.long.reduce((n, s) => n + wordCount(s.en), 0);
  const passWords = u.passage.paragraphs.reduce((n, p) => n + wordCount(p.en), 0);
  const total = shortWords + longWords + passWords;

  const toks = tokensOf(unitText(u));

  const missing = new Map();
  for (const t of toks) {
    const hit = lookup(t);
    if (!hit) missing.set(t, (missing.get(t) || 0) + 1);
    else if (hit.kind === "allowed") allowedHits++;
    else if (hit.kind === "deviation") devHits++;
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
    words: wordsIn(unitText(u), { lookup }),
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

// ===================== 2. 词覆盖与排程（P0 · SPEC §4.4） =====================
// 口径：一个词的"首次出现单元"= 它第一次被读到的那个单元，那个单元的新词数就按它算。
console.log("\n== 词覆盖与排程（SPEC §4.4：每单元新词 20–25） ==");
{
  const seen = new Set();
  let bad = 0;
  for (const r of rows) {
    const fresh = [...r.words].filter((w) => !seen.has(w));
    fresh.forEach((w) => seen.add(w));
    const flag = fresh.length >= 20 && fresh.length <= 25 ? "✓" : `✗ 超出 20–25`;
    if (flag !== "✓") bad++;
    console.log(`${r.id} ${r.name}  首次出现 ${String(fresh.length).padStart(2)} 词  去重 ${String(r.words.size).padStart(3)} 词  ${flag}`);
  }
  const totalWords = Object.keys(WORDS).length;
  const pct = totalWords ? Math.round((seen.size / totalWords) * 100) : 0;
  console.log(`累计覆盖 ${seen.size} / ${totalWords} = ${pct}%   剩余 ${totalWords - seen.size} 词未出现`);
  console.log(bad ? `有 ${bad} 个单元的新词数不合规（u001–u003 属早期内容，重写时一并修）` : "全部单元新词数合规 ✓");

  // 已覆盖的词按累计出现次数排：用来判断"哪些词该加密、哪些该低频维持"
  const counter = new Map();
  for (const u of UNITS) for (const w of wordsIn(unitText(u), { lookup })) {
    counter.set(w, (counter.get(w) || 0) + 1);
  }
  let low = 0, mid = 0, firm = 0;
  for (const w of seen) {
    const n = counter.get(w) || 0;
    if (n <= 4) low++; else if (n <= 14) mid++; else firm++;
  }
  console.log(`词状态分布：新词(1–4 次) ${low} · 巩固中(5–14 次) ${mid} · 已巩固(≥15 次) ${firm}`);
}

// ===================== 3. 下一单元计划核对（P0 · 先定词再写） =====================
console.log("\n== 下一单元计划核对（tools/next-unit.txt） ==");
{
  const p = path.join(ROOT, "tools", "next-unit.txt");
  if (!fs.existsSync(p)) {
    console.log("未设定计划。生成方式：node tools/coverage.js --plan");
  } else {
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    let unit = "", theme = "";
    const plan = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("#")) {
        const m = line.match(/unit\s*[:：]\s*(\S+)/i);
        if (m) unit = m[1];
        const t = line.match(/theme\s*[:：]\s*(.+)/i);
        if (t) theme = t[1].trim();
        continue;
      }
      plan.push(line.toLowerCase());
    }
    const seenBefore = new Set();
    for (const r of rows) r.words.forEach((w) => seenBefore.add(w));

    const dupes = plan.filter((w, i) => plan.indexOf(w) !== i);
    const outside = plan.filter((w) => !WORDS[w]);
    const reused = plan.filter((w) => seenBefore.has(w));
    console.log(`单元 ${unit || "(未写)"}　主题 ${theme || "(未写)"}　计划新词 ${plan.length} 个`);
    console.log(`　数量 20–25：${plan.length >= 20 && plan.length <= 25 ? "✓" : "✗ 实际 " + plan.length}`);
    console.log(`　都在 850 表内：${outside.length ? "✗ " + outside.join(" ") : "✓"}`);
    console.log(`　没和已覆盖词重复：${reused.length ? "✗ " + reused.join(" ") : "✓"}`);
    console.log(`　计划内无重复：${dupes.length ? "✗ " + dupes.join(" ") : "✓"}`);
    console.log(`　写完后的覆盖率：${seenBefore.size} + ${plan.length - reused.length} = ${seenBefore.size + plan.length - reused.length} / ${Object.keys(WORDS).length}`);
    console.log("　写完内容后，跑本脚本看该单元「首次出现」是否等于计划数。");
  }
}

// ===================== 4. 课外内容体检（SPEC §11.9 第 6 条） =====================
// 只看"简说"；"原文"按文体写，允许超纲
console.log("\n== 课外拓展体检（简说只用 850 内） ==");
{
  const bad = new Map();
  for (const [id, d] of Object.entries(EXTRAS)) {
    let n = 0;
    for (const b of d.read.blocks) {
      for (const tok of tokensOf(b.simple)) {
        n++;
        if (!lookup(tok)) bad.set(id + ":" + tok, (bad.get(id + ":" + tok) || 0) + 1);
      }
    }
    console.log(`${id} 简说${d.read.blocks.length}段 用词${n}`);
  }
  if (!bad.size) console.log("结果：超纲 0 ✓");
  else {
    console.log("结果：超纲 " + bad.size + " →");
    console.log([...bad.keys()].join("  "));
  }
}

// ===================== 5. 课外原文用词（SPEC §11.1.1） =====================
// 原文不限词，但每个词都得能点开看中文（否则显示"还没有注解"）
console.log("\n== 课外原文用词体检（点词必须有中文） ==");
{
  const bad = new Map();
  let total = 0, viaGlossary = 0;
  for (const [id, d] of Object.entries(EXTRAS)) {
    for (const b of d.read.blocks) {
      for (const tok of tokensOf(b.std)) {
        total++;
        const hit = lookup(tok);
        if (hit && hit.kind === "glossary") viaGlossary++;
        if (!hit) bad.set(tok, (bad.get(tok) || 0) + 1);
      }
    }
  }
  console.log(`原文共 ${total} 个词次 · 由 GLOSSARY 兜住 ${viaGlossary} 次 · 仍未注解 ${bad.size} 个词`);
  if (bad.size) console.log("  待补进 data/glossary.js：" + [...bad.keys()].sort().join("  "));
  else console.log("结果：原文每个词都能点开看中文 ✓");
}

// ===================== 6. 练习池体检（SPEC §14） =====================
console.log("\n== 练习池体检（SPEC §14 / §11.3 档位长度） ==");
{
  const LIMIT = {
    low: { min: 0, max: 8, sent: 1 },
    mid: { min: 8, max: 18, sent: 2 },
    high: { min: 20, max: 40, sent: 3 },
  };
  const byLevel = { low: 0, mid: 0, high: 0 };
  const bad = [];
  const badWords = new Map();
  const ids = new Set();

  for (const q of EXERCISES) {
    byLevel[q.level] = (byLevel[q.level] || 0) + 1;
    if (ids.has(q.id)) bad.push(q.id + " id 重复");
    ids.add(q.id);
    const n = wordCount(q.en);
    const sent = (q.en.match(/[.!?]/g) || []).length;
    const L = LIMIT[q.level];
    if (!L) bad.push(q.id + " 无档位");
    else {
      if (n < L.min || n > L.max) bad.push(`${q.id}(${q.level}) ${n} 词，应为 ${L.min}–${L.max}`);
      if (sent > L.sent) bad.push(`${q.id}(${q.level}) ${sent} 句，最多 ${L.sent} 句`);
    }
    for (const tok of tokensOf(q.en)) if (!lookup(tok)) badWords.set(tok, (badWords.get(tok) || 0) + 1);
  }

  const total = EXERCISES.length;
  console.log(`练习句 ${total} 句（目标 150：低阶 ${byLevel.low}/50 · 当阶 ${byLevel.mid}/50 · 进阶 ${byLevel.high}/50）`);
  console.log(`一轮抽 3 句 → 约 ${Math.floor(total / 3)} 次打开轮完一遍`);
  console.log(bad.length ? "档位/编号不合规：" + bad.length + "\n  " + bad.join("\n  ") : "档位与编号合规 ✓");
  if (!badWords.size) console.log("超纲 0 ✓");
  else console.log("超纲 " + badWords.size + " → " + [...badWords.keys()].join(" "));

  // 解锁课时：未学完时只出"已解锁"的题（SPEC §14.7）
  const table = (V.Exercises && V.Exercises.unlockTable()) || [];
  if (table.length) {
    const byUnit = {};
    const never = [];
    for (const t of table) {
      if (t.unit === null) never.push(t.id);
      else (byUnit[t.unit] = byUnit[t.unit] || []).push(t.id);
    }
    const parts = Object.keys(byUnit).sort((a, b) => a - b)
      .map((k) => `u${String(+k + 1).padStart(3, "0")} ${byUnit[k].length} 句`);
    console.log("解锁分布：" + parts.join(" · "));
    console.log(`已解锁 ${table.length - never.length} 句 · 还要等内容覆盖 ${never.length} 句`);
    if (never.length) console.log("  待覆盖：" + never.join(" "));
  }
}
