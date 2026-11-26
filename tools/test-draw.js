// 抽取规则自测（SPEC §14.5）。纯逻辑，不开浏览器。
// 用法：node tools/test-draw.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ROOT, loadData, makeLookup } = require("./lib/vocab");

const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of ["data/words.js", "data/exercises.js", "js/exercises.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const X = sandbox.window.Exercises;
const POOL = sandbox.window.EXERCISES;
const V = loadData();
const { lookup } = makeLookup(V);

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? "　→ " + detail : "")); }
};

// ---- 1. 连开 5 次，句子不重复（学完状态：1+1+1）----
console.log("\n[1] 连开 5 次不重复（§14.5.1）");
{
  let seen = [];
  const all = [];
  for (let i = 0; i < 5; i++) {
    const r = X.draw({ levels: ["low", "mid", "high"], seen });
    seen = r.seen;
    all.push(...r.items.map((q) => q.id));
    ok(`第 ${i + 1} 次抽到 ${r.items.length} 句，档位 ${r.items.map((q) => q.level).join("+")}`,
      r.items.length === 3 && r.items[0].level === "low" && r.items[2].level === "high");
  }
  ok("15 句互不重复", new Set(all).size === all.length, all.join(","));
}

// ---- 2. 一轮抽完再洗牌（模拟小池子：每档只留 2 句）----
console.log("\n[2] 一轮抽完再洗牌（§14.3.4）");
{
  const small = POOL.filter((q) => ["q001", "q002"].indexOf(q.id) !== -1); // 只留 2 句低阶
  const real = sandbox.window.EXERCISES;
  sandbox.window.EXERCISES = small;
  let seen = [];
  let rounds = 0;
  const got = [];
  for (let i = 0; i < 6; i++) {
    const r = X.draw({ levels: ["low"], seen });
    seen = r.seen;
    got.push(r.items[0] && r.items[0].id);
  }
  sandbox.window.EXERCISES = real;
  rounds = new Set(got).size;
  ok("2 句轮完 6 次仍在出题", got.every(Boolean), got.join(","));
  ok("只在这 2 句之间换（没出空）", got.filter(Boolean).length === 6);
  ok("轮完后确实重来了（出现重复）", rounds <= 2, "不同句数 " + rounds);
}

// ---- 3. 未学完时按已学词收窄（§11.4 / §14.3.3）----
console.log("\n[3] 收窄口径：只用已学词（§14.3.3）");
{
  // 只"学"了 20 个最常见的词，其余句子不该出现在题里
  const learned = {};
  ["the","a","is","i","you","it","we","he","she","and","to","in","of","my","me","his","her","not","do","be"]
    .forEach((w) => (learned[w] = 1));
  const r = X.draw({ levels: ["low", "mid", "high"], learned, strict: true });
  const bad = r.items.filter((q) => !X.allKnown(q.en, learned));
  ok(`抽到 ${r.items.length} 句，全部只含已学词`, bad.length === 0, bad.map((q) => q.id).join(","));
  ok("题不够时逐档给提示，不是空白", r.notes.length === 3, JSON.stringify(r.notes));

  const wide = X.draw({ levels: ["low", "mid", "high"], learned, strict: false });
  ok("不收窄时照常出题", wide.items.length === 3, String(wide.items.length));
}

// ---- 4. 档位配比按进度（§11.3）----
console.log("\n[4] 档位配比（§11.3）");
{
  const cases = [
    [0.1, false, ["low"]],
    [0.3, false, ["low", "mid"]],
    [0.6, false, ["mid", "mid"]],
    [0.9, false, ["mid", "high"]],
    [1, true, ["low", "mid", "high"]],
  ];
  for (const [ratio, done, want] of cases) {
    const got = X.planLevels(ratio, done);
    ok(`进度 ${Math.round(ratio * 100)}%${done ? "（学完）" : ""} → ${got.join("+")}`,
      got.join(",") === want.join(","), "期望 " + want.join(","));
  }
}

// ---- 5. 全部练习句都在 850 内 ----
console.log("\n[5] 用词口径");
{
  const bad = [];
  for (const q of POOL) {
    for (const t of q.en.match(/[A-Za-z']+/g) || []) if (!lookup(t)) bad.push(q.id + ":" + t);
  }
  ok("48 句零超纲", bad.length === 0, bad.join(" "));
}

console.log(`\n结果：通过 ${pass} · 失败 ${fail}`);
process.exit(fail ? 1 : 0);
