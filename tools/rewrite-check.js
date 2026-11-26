// 重写校验：node tools/rewrite-check.js <unitId> <draft.json>
// 用途：u001–u008 重写时，保证"这一课能用的词"不越界——
//   可用集合 = 截至当前课（含）已出现过的 850 词 = 前面各课 + 本课新词
//   用集合外的词，会让那个词"提前出现"，后面所有课的新词数与 850 覆盖全部连锁变化
// 检查三件事：
//   1) 越界词（会打乱词序）
//   2) 本课原有新词有没有丢（丢了 → 那个词变成"未出现"，覆盖倒退）
//   3) 篇幅（短句 5–10 / 长句 15–25 / 短文 150–180 / 合计 240–300）
const fs = require("fs");
const { loadData, makeLookup, wordsIn, unitText, tokensOf, wordCount } = require("./lib/vocab");

const id = process.argv[2];
const draftFile = process.argv[3];
const V = loadData();
const lk = makeLookup(V);
const lookup = lk.lookup;

// 参考基准取"仓库里已提交的版本"（git HEAD），否则替换过一次后基准就被污染了
const vm = require("vm");
const { execSync } = require("child_process");
function headUnits() {
  try {
    const code = execSync("git show HEAD:data/units.js", { cwd: require("./lib/vocab").ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    const sandbox = { window: {} };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: "HEAD:data/units.js" });
    return sandbox.window.UNITS || [];
  } catch (e) {
    return V.UNITS || [];
  }
}
const UNITS = headUnits();
const idx = UNITS.findIndex((u) => u.id === id);
if (idx < 0) { console.error("没有这个单元：" + id); process.exit(1); }

// 截至本课可用的词（含本课）
const upto = new Set();
for (let i = 0; i <= idx; i++) wordsIn(unitText(UNITS[i]), lk).forEach((w) => upto.add(w));

// 本课原有的新词（首次出现在本课的词）
const before = new Set();
for (let i = 0; i < idx; i++) wordsIn(unitText(UNITS[i]), lk).forEach((w) => before.add(w));
const fresh = [...wordsIn(unitText(UNITS[idx]), lk)].filter((w) => !before.has(w));

const d = JSON.parse(fs.readFileSync(draftFile, "utf8"));
const text = unitText(d);
const tokens = tokensOf(text);

const OK = ["word", "allowed", "deviation", "contraction", "glossary"];
const over = new Set();
tokens.forEach((t) => {
  const hit = lookup(t);
  if (!hit) { over.add(t); return; }
  if (hit.kind === "word" && !upto.has(hit.base)) over.add(t); // 这个词还没到出现的时候
  else if (OK.indexOf(hit.kind) < 0) over.add(t);
});

const inDraft = new Set(wordsIn(text, lk));
const lost = fresh.filter((w) => !inDraft.has(w));

const pWords = d.passage.paragraphs.reduce((n, p) => n + wordCount(p.en), 0);
const total = wordCount(text);
const shorts = d.short.map((s) => wordCount(s.en));
const longs = d.long.map((s) => wordCount(s.en));

console.log("== " + id + " 重写校验 ==");
console.log("本课原有新词 " + fresh.length + " 个 · 截至本课可用词 " + upto.size + " 个");
console.log("草稿：短 " + shorts.length + " 句（" + shorts.join("/") + " 词）· 长 " + longs.length + " 句（" + longs.join("/") + " 词）· 短文 " + pWords + " 词 · 合计 " + total + " 词");
if (over.size) console.error("✗ 越界词（会打乱词序）：" + [...over].join(" "));
if (lost.length) console.error("✗ 丢掉的本课新词（会退回未覆盖）：" + lost.join(" "));
const probs = [];
if (shorts.length < 5) probs.push("短句少于 5 条");
if (longs.length < 3) probs.push("长句少于 3 条");
shorts.forEach((n, i) => { if (n < 5 || n > 10) probs.push("短句" + (i + 1) + " " + n + " 词"); });
longs.forEach((n, i) => { if (n < 15 || n > 25) probs.push("长句" + (i + 1) + " " + n + " 词"); });
if (pWords < 150 || pWords > 180) probs.push("短文 " + pWords + " 词（目标 150–180）");
if (total < 240 || total > 300) probs.push("合计 " + total + " 词（目标 240–300）");
if (probs.length) console.error("✗ 篇幅：" + probs.join(" · "));
if (!over.size && !lost.length && !probs.length) console.log("✓ 全部通过，可以落盘");
else process.exitCode = 1;
