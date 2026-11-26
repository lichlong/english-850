// tools/lib/vocab.js —— 词表读表 + 词形还原（tools/ 下脚本共用，不参与网页运行）
// 还原规则必须与 js/reader.js 的 findWord 一致，否则"网页能点的词"和"脚本算的词"会对不上。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");

const DATA_FILES = ["data/words.js", "data/units.js", "data/extras.js", "data/exercises.js", "data/glossary.js"];

// 在沙箱里执行 data/*.js，取回 window 上的表
function loadData(files) {
  const list = files || DATA_FILES;
  const sandbox = { window: {}, console };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  for (const f of list) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: f });
  }
  return sandbox.window;
}

const wordCount = (s) => (String(s).match(/[A-Za-z']+/g) || []).length;
const tokensOf = (s) => (String(s).match(/[A-Za-z']+/g) || []).map((w) => w.toLowerCase());

// 造一个还原器：token → { base, kind: "word" | "allowed" | "deviation" } 或 null
function makeLookup(V) {
  const WORDS = V.WORDS || {};
  const FORMS = V.WORD_FORMS || {};
  const ALLOWED = V.WORD_ALLOWED || {};
  const DEVIATION = V.WORD_DEVIATION || {};
  const GLOSSARY = V.GLOSSARY || {};

  function lookup(raw) {
    let w = String(raw).toLowerCase();
    if (/'s$/.test(w)) w = w.slice(0, -2); // 所有格 father's → father
    else w = w.replace(/'+$/, "");
    if (WORDS[w]) return { base: w, kind: "word" };
    if (ALLOWED[w]) return { base: w, kind: "allowed" };
    if (DEVIATION[w]) return { base: w, kind: "deviation" };
    if (GLOSSARY[w]) return { base: w, kind: "glossary" };
    if (FORMS[w]) {
      const b = FORMS[w];
      if (WORDS[b]) return { base: b, kind: "word" };
      if (DEVIATION[b]) return { base: b, kind: "deviation" };
      if (GLOSSARY[b]) return { base: b, kind: "glossary" };
    }
    const cands = [
      w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
      w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
      w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, ""),
    ];
    for (const c of cands) {
      if (!c) continue;
      if (WORDS[c]) return { base: c, kind: "word" };
      if (ALLOWED[c]) return { base: c, kind: "allowed" };
      if (DEVIATION[c]) return { base: c, kind: "deviation" };
      if (GLOSSARY[c]) return { base: c, kind: "glossary" };
    }
    return null;
  }

  return { lookup, WORDS, FORMS, ALLOWED, DEVIATION, GLOSSARY };
}

// 一段文本里出现的 850 表内词（已还原、去重）
function wordsIn(text, lk) {
  const out = new Set();
  for (const t of tokensOf(text)) {
    const hit = lk.lookup(t);
    if (hit && hit.kind === "word") out.add(hit.base);
  }
  return out;
}

// 单元的全部英文（短句 + 长句 + 短文）
function unitText(u) {
  return []
    .concat(u.short.map((s) => s.en), u.long.map((s) => s.en), u.passage.paragraphs.map((p) => p.en))
    .join(" ");
}

module.exports = { ROOT, loadData, wordCount, tokensOf, makeLookup, wordsIn, unitText };
