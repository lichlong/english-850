// 词表生成器：tools/basic-850.txt + tools/freq-rank.txt → data/words.js
// 用法：node tools/gen-words.js
// 原则（SPEC §11.6）：表内不能漏，表外不能加。要改词表改 txt，不要手改 words.js。

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// ---------- 1. 读 850 原表 ----------
const rows = read("tools/basic-850.txt")
  .split(/\r?\n/)
  .filter((l) => l.trim() && !l.trim().startsWith("#"))
  .map((l) => {
    const [w, zh, c] = l.split("|").map((s) => s.trim());
    return { w: w.toLowerCase(), zh, c };
  });

if (rows.length !== 850) {
  console.error("词表条数不是 850，实际 " + rows.length + "，先修 txt");
  process.exit(1);
}

// ---------- 2. 读现有 words.js（保住音标与完整释义） ----------
function loadWordsFile(rel) {
  try {
    const code = read(rel);
    const sandbox = { window: {} };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: rel });
    return { words: sandbox.window.WORDS || {}, forms: sandbox.window.WORD_FORMS || {} };
  } catch (e) {
    return { words: {}, forms: {} };
  }
}
const old = loadWordsFile("data/words.js");

// ---------- 3. 常用度名次 ----------
let freq = new Map();
try {
  const lines = read(".freq.tmp.txt").split(/\r?\n/).filter(Boolean);
  lines.forEach((w, i) => freq.set(w.trim().toLowerCase(), i + 1));
  fs.writeFileSync(
    path.join(root, "tools/freq-rank.txt"),
    rows
      .map((r) => r.w + " " + (freq.get(r.w) || 20001))
      .join("\n") + "\n"
  );
} catch (e) {
  // 没有原始词频表时，用已算好的名次
  try {
    read("tools/freq-rank.txt")
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((l) => {
        const [w, n] = l.split(/\s+/);
        freq.set(w, Number(n));
      });
  } catch (e2) {
    console.error("缺少 tools/freq-rank.txt，无法分组");
    process.exit(1);
  }
}

// ---------- 4. 分组：按常用度排序后切 30 段 ----------
const sorted = rows
  .map((r) => ({ ...r, rank: freq.get(r.w) || 20000 }))
  .sort((a, b) => a.rank - b.rank || a.w.localeCompare(b.w));

const GROUP_COUNT = 30;
const base = Math.floor(850 / GROUP_COUNT); // 28
const extra = 850 - base * GROUP_COUNT; // 10 组多 1 个
let idx = 0;
const groups = [];
for (let i = 0; i < GROUP_COUNT; i++) {
  const size = base + (i < extra ? 1 : 0);
  groups.push(sorted.slice(idx, idx + size));
  idx += size;
}

// ---------- 4b. 偏离词（用户确认放行的表外词，单独立表） ----------
const baseWords = new Set(rows.map((r) => r.w));
let deviation = new Map();
try {
  const raw = read("tools/basic-850-deviation.txt");
  const enabled = /STATUS:\s*ENABLED/i.test(raw);
  if (enabled) {
    raw.split(/\r?\n/).forEach((l) => {
      if (!l.trim() || l.trim().startsWith("#")) return;
      const [w, zh, why] = l.split("|").map((s) => (s || "").trim());
      if (w && zh && !baseWords.has(w.toLowerCase())) {
        deviation.set(w.toLowerCase(), { zh, why: why || "与原版偏离，已放行" });
      }
    });
  }
} catch (e) {
  deviation = new Map();
}

// ---------- 5. 变形表 ----------
const IRREGULAR = {
  be: "am is are was were been being",
  do: "does did done doing",
  have: "has had having",
  go: "went gone going goes",
  get: "got gotten getting",
  give: "gave given giving",
  take: "took taken taking",
  see: "saw seen seeing",
  say: "said saying",
  make: "made making",
  come: "came coming",
  keep: "kept keeping",
  let: "letting",
  put: "putting",
  send: "sent sending",
  seem: "seemed seeming",
  may: "might",
  will: "would",
  can: "could",
  man: "men",
  woman: "women",
  foot: "feet",
  tooth: "teeth",
  knife: "knives",
  leaf: "leaves",
  shelf: "shelves",
  self: "selves",
  good: "better best",
  bad: "worse worst",
  far: "farther further farthest furthest",
  run: "ran running runs",
  swim: "swam swum swimming",
  drink: "drank drunk drinking",
  fly: "flew flown flies",
  fall: "fell fallen",
  fight: "fought",
  cut: "cutting",
  begin: "began begun beginning",
  breathe: "breathing",
  die: "dying",
  // 同一词的另一种拼法，不算新词
  plough: "plow",
  grey: "gray",
  // 原表括注的变形：little (less, least) / much (more, most) / a (an)
  // 这几个"变形本身不是表内词"，走下面的 VARIANTS
};

// 变体 → 表内原词（键不在 850 里，值在）
const VARIANTS = { an: "a", more: "much", most: "much", less: "little", least: "little" };

const baseSet = new Set(rows.map((r) => r.w));
const forms = new Map(Object.entries(old.forms).filter(([k]) => k !== ""));

for (const [w, list] of Object.entries(IRREGULAR)) {
  if (!baseSet.has(w) && !deviation.has(w)) continue;
  for (const f of list.split(/\s+/)) if (f) forms.set(f, w);
}

// 变体（键不在 850、值在 850）
for (const [k, v] of Object.entries(VARIANTS)) {
  if (baseSet.has(k)) continue;
  if (baseSet.has(v)) forms.set(k, v);
}

const VOWEL = /[aeiou]/;
function regularForms(w) {
  const out = [];
  const last = w.slice(-1);
  // 复数 / 第三人称
  if (/(s|x|z|ch|sh|o)$/.test(w)) out.push(w + "es");
  else if (/[^aeiou]y$/.test(w)) out.push(w.slice(0, -1) + "ies");
  else out.push(w + "s");
  // -ing / -ed
  let stem = w;
  if (last === "e" && !/ee$/.test(w)) stem = w.slice(0, -1);
  else if (
    w.length > 2 &&
    !VOWEL.test(w.slice(-1)) &&
    VOWEL.test(w.slice(-2, -1)) &&
    !VOWEL.test(w.slice(-3, -2)) &&
    !/[wxy]$/.test(w)
  ) {
    stem = w + last; // 双写：stop → stopping / stopped
  }
  out.push(stem + "ing", stem + "ed");
  return out;
}

for (const w of baseSet) {
  for (const f of regularForms(w)) {
    if (f === w) continue;
    if (baseSet.has(f)) continue; // 变形本身是原形词，不抢
    if (!forms.has(f)) forms.set(f, w);
  }
}

// 偏离词的变形也要能归到原形（ate → eat、told → tell）
for (const w of deviation.keys()) {
  for (const f of regularForms(w)) {
    if (f === w || baseSet.has(f) || deviation.has(f) || forms.has(f)) continue;
    forms.set(f, w);
  }
}

// ---------- 5b. 允许项（不在 850 表内，但 Ogden 语法规则明文允许） ----------
// 依据《Basic English: A General Introduction with Rules and Grammar》：
//   · 人称和代名词使用和一般英语相同
//   · 数字、货币、月份、日子、年份、钟点、国际语同一般英语形式
// 注意：mine 在 850 表内是"矿"，与物主代词 mine 撞车，暂不放行（见报告）
const ALLOWED_GROUPS = {
  "代词": {
    it: "它", its: "它的", we: "我们", us: "我们（宾格）", our: "我们的", ours: "我们的（名词性）",
    they: "他们", them: "他们（宾格）", their: "他们的", theirs: "他们的（名词性）",
    she: "她", her: "她；她的", hers: "她的（名词性）",
    my: "我的", me: "我（宾格）", your: "你的，你们的", yours: "你的（名词性）",
    him: "他（宾格）", his: "他的",
    myself: "我自己", yourself: "你自己", himself: "他自己", herself: "她自己",
    itself: "它自己", ourselves: "我们自己", yourselves: "你们自己", themselves: "他们自己",
  },
  "数字": {
    one: "一", two: "二", three: "三", four: "四", five: "五", six: "六", seven: "七",
    eight: "八", nine: "九", ten: "十", eleven: "十一", twelve: "十二", thirteen: "十三",
    fourteen: "十四", fifteen: "十五", sixteen: "十六", seventeen: "十七", eighteen: "十八",
    nineteen: "十九", twenty: "二十", thirty: "三十", forty: "四十", fifty: "五十",
    sixty: "六十", seventy: "七十", eighty: "八十", ninety: "九十",
    hundred: "百", thousand: "千",
  },
  "星期": {
    monday: "星期一", tuesday: "星期二", wednesday: "星期三", thursday: "星期四",
    friday: "星期五", saturday: "星期六", sunday: "星期日",
  },
};
// may 已是 850 表内词（可以），月份 May 撞车，故日历月份单独处理
const MONTHS = {
  january: "一月", february: "二月", march: "三月", april: "四月", june: "六月",
  july: "七月", august: "八月", september: "九月", october: "十月",
  november: "十一月", december: "十二月",
};

const allowed = new Map();
for (const [why, list] of Object.entries(ALLOWED_GROUPS)) {
  for (const [w, zh] of Object.entries(list)) if (zh) allowed.set(w, { zh, why });
}
for (const [w, zh] of Object.entries(MONTHS)) if (!baseSet.has(w)) allowed.set(w, { zh, why: "日历" });

// 允许的派生：-ly 副词、-er/-est 比较级（仅性质类词）
for (const r of rows) {
  if (r.c !== "qg" && r.c !== "qo") continue;
  const w = r.w;
  const cands = [];
  if (/[^aeiou]y$/.test(w)) cands.push([w.slice(0, -1) + "ily", w + " → " + "副词"], [w.slice(0, -1) + "ier", w + " 的比较级"], [w.slice(0, -1) + "iest", w + " 的最高级"]);
  else {
    cands.push([w + "ly", w + " 的副词"], [w + "er", w + " 的比较级"], [w + "est", w + " 的最高级"]);
  }
  for (const [f, why] of cands) {
    if (baseSet.has(f) || forms.has(f) || allowed.has(f)) continue;
    allowed.set(f, { zh: (old.words[w] || {}).zh || "", why });
  }
}

// ---------- 6. 输出 ----------
const KEY_W = 13;
const fmtEntry = (w) => {
  const o = old.words[w] || {};
  const src = rows.find((r) => r.w === w);
  const zh = o.zh || src.zh;
  const parts = ["g: " + o.g0 + "", 'zh: "' + zh + '"'];
  if (o.ipa) parts.push('ipa: "' + o.ipa + '"');
  if (o.full) parts.push('full: "' + o.full + '"');
  return "  " + (w + ":").padEnd(KEY_W) + " { " + parts.join(", ") + " },";
};

const out = [];
out.push("// 词表（自动生成，勿手改）");
out.push("// 生成方式：node tools/gen-words.js");
out.push("// 源头：tools/basic-850.txt（Ogden Basic English 850 词，严格口径见 SPEC §11.6）");
out.push("// 字段：g=组号 1-30（按常用度，只服务排程算法）；zh=释义；ipa=音标；full=完整释义");
out.push("");
out.push("window.WORDS = {");
groups.forEach((g, i) => {
  out.push("");
  out.push("  // 第 " + (i + 1) + " 组（" + g.length + " 词）");
  for (const r of g) {
    old.words[r.w] = { ...(old.words[r.w] || {}), g0: i + 1 };
    out.push(fmtEntry(r.w));
  }
});
out.push("};");
out.push("");
out.push("// 变形 → 原形（is/was/stopped… 都归到表内的原形，不算超纲）");
out.push("window.WORD_FORMS = {");
const formKeys = [...forms.keys()].sort();
for (const k of formKeys) {
  out.push("  " + (k + ":").padEnd(KEY_W) + ' "' + forms.get(k) + '",');
}
out.push("};");
out.push("");
out.push("// 允许项：不在 850 表内、但 Ogden 原文明文允许的（SPEC §11.6 第二句的口径）");
out.push("// 依据：原文「人称和代名词同一般英语」「数字、月份、日子、年份、钟点、国际语同一般英语形式」");
out.push("// 以及允许 -ly / -er / -est 派生。不计入超纲，也不占 850 名额。");
out.push("window.WORD_ALLOWED = {");
for (const k of [...allowed.keys()].sort()) {
  const a = allowed.get(k);
  out.push("  " + (k + ":").padEnd(KEY_W) + ' { zh: "' + a.zh + '", why: "' + a.why + '" },');
}
out.push("};");
out.push("");
out.push("// 偏离词：不在 850 原表内，经确认放行。属本项目与原版 Basic English 的细微区别。");
out.push("// 不占 850 名额、不计入词表，统计上与允许项分开。见 tools/basic-850-deviation.txt");
out.push("window.WORD_DEVIATION = {");
for (const k of [...deviation.keys()].sort()) {
  const d = deviation.get(k);
  out.push("  " + (k + ":").padEnd(KEY_W) + ' { zh: "' + d.zh + '", why: "' + d.why + '" },');
}
out.push("};");
out.push("");

fs.writeFileSync(path.join(root, "data/words.js"), out.join("\n"), "utf8");

// ---------- 7. 报告 ----------
const dropped = Object.keys(old.words).filter((w) => !baseSet.has(w));
console.log("已生成 data/words.js");
console.log("词表条数：", baseSet.size, "| 分组：", groups.map((g) => g.length).join(","));
console.log("变形表条数：", forms.size);
console.log("允许项条数：", allowed.size);
console.log("被移出的表外词（" + dropped.length + "）：", dropped.sort().join(" "));
console.log("前 3 组：");
groups.slice(0, 3).forEach((g, i) => console.log("  第" + (i + 1) + "组", g.map((r) => r.w).join(" ")));
