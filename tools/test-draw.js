// 抽取规则自测（SPEC §14.5 / §14.7）。纯逻辑，不开浏览器。
// 用法：node tools/test-draw.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ROOT, loadData, makeLookup } = require("./lib/vocab");

const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of ["data/words.js", "data/units.js", "data/exercises.js", "js/exercises.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const W = sandbox.window;
const X = W.Exercises;
const POOL = W.EXERCISES;
const REAL_POOL = POOL.slice();
const V = loadData();
const { lookup } = makeLookup(V);

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? "　→ " + detail : "")); }
};

// ---- 0. 解锁分布（信息，不是断言）----
console.log("\n[0] 每句练习的解锁课时");
{
  const table = X.unlockTable();
  const byUnit = {};
  const never = [];
  for (const t of table) {
    if (t.unit === null) never.push(t.id);
    else (byUnit[t.unit] = byUnit[t.unit] || []).push(t.id);
  }
  Object.keys(byUnit).sort((a, b) => a - b).forEach((k) => {
    console.log(`  u${String(+k + 1).padStart(3, "0")} 解锁 ${byUnit[k].length} 句：${byUnit[k].join(" ")}`);
  });
  console.log(`  已解锁 ${table.length - never.length} 句 · 等内容覆盖 ${never.length} 句`);
  ok("解锁表算得出来（至少 1 句有课时）", table.some((t) => t.unit !== null));
}

// ---- 1. 连开 5 次不重复（学完态：1+1+1）----
console.log("\n[1] 学完后连开 5 次不重复（§14.5.1）");
{
  let seen = [];
  const all = [];
  for (let i = 0; i < 5; i++) {
    const r = X.draw({ levels: ["low", "mid", "high"], seen, allLearned: true, unitIndex: 0 });
    seen = r.seen;
    all.push(...r.items.map((q) => q.id));
    ok(`第 ${i + 1} 次抽到 3 句（${r.items.map((q) => q.level).join("+")}）`, r.items.length === 3);
  }
  ok("15 句互不重复", new Set(all).size === all.length, all.join(","));
}

// ---- 2. 一轮抽完再洗牌（§14.3.4）----
console.log("\n[2] 一轮抽完再洗牌");
{
  W.EXERCISES = REAL_POOL.filter((q) => ["q001", "q002"].indexOf(q.id) !== -1); // 只留 2 句低阶
  let seen = [];
  const got = [];
  for (let i = 0; i < 6; i++) {
    const r = X.draw({ levels: ["low"], seen, allLearned: true, unitIndex: 0 });
    seen = r.seen;
    got.push(r.items[0] && r.items[0].id);
  }
  W.EXERCISES = REAL_POOL;
  ok("2 句轮完 6 次仍在出题", got.every(Boolean), got.join(","));
  ok("只在 2 句之间换", new Set(got).size <= 2, [...new Set(got)].join(","));
}

// ---- 3. 未学完：只出已解锁课时的题（§14.7）----
console.log("\n[3] 未学完按课时卡（§14.7）");
{
  for (const unitIndex of [0, 1, 3, 7]) {
    const r = X.draw({ levels: ["low", "mid", "high"], allLearned: false, unitIndex });
    const bad = r.items.filter((q) => {
      const u = X.unlockIndex(q);
      return u === null || u > unitIndex;
    });
    ok(`第 ${unitIndex + 1} 课抽 ${r.items.length} 句，全部不超过本课`, bad.length === 0,
      bad.map((q) => q.id + "@" + X.unlockIndex(q)).join(","));
  }
}

// ---- 4. 学完：不再看课时 ----
console.log("\n[4] 学完后不受课时限制（§14.7）");
{
  let beyond = 0;
  let seen = [];
  for (let i = 0; i < 12; i++) {
    const r = X.draw({ levels: ["low", "mid", "high"], seen, allLearned: true, unitIndex: 0, rand: () => 0 });
    seen = r.seen;
    beyond += r.items.filter((q) => X.unlockIndex(q) !== 0).length;
  }
  ok(`当前在第 1 课，仍能抽到后面的题（${beyond} / 36 句）`, beyond > 0);
}

// ---- 5. 前 5 天预览兜底 ----
console.log("\n[5] 前 5 天预览兜底（§11.2）");
{
  // 把 q001 拿掉，第 1 课就没有解锁的题了
  W.EXERCISES = REAL_POOL.filter((q) => q.id !== "q001");
  const r = X.draw({ levels: ["low"], allLearned: false, unitIndex: 0, preview: true });
  const noPrev = X.draw({ levels: ["low"], allLearned: false, unitIndex: 0, preview: false });
  W.EXERCISES = REAL_POOL;
  ok("池子空时仍给 1 句预览", r.items.length === 1, JSON.stringify(r.items.map((q) => q.id)));
  ok("并说明可能有未学词", r.notes.some((n) => n.indexOf("预览") !== -1), JSON.stringify(r.notes));
  ok("不给预览时宁可空着并提示", noPrev.items.length === 0 && noPrev.notes.length > 0, JSON.stringify(noPrev.notes));
}

// ---- 6. 档位配比按进度（§11.3）----
console.log("\n[6] 档位配比（§11.3）");
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

// ---- 7. 用词口径 ----
console.log("\n[7] 用词口径");
{
  const bad = [];
  for (const q of POOL) {
    for (const t of q.en.match(/[A-Za-z']+/g) || []) if (!lookup(t)) bad.push(q.id + ":" + t);
  }
  ok(`${POOL.length} 句零超纲`, bad.length === 0, bad.join(" "));
}

console.log(`\n结果：通过 ${pass} · 失败 ${fail}`);
process.exit(fail ? 1 : 0);
