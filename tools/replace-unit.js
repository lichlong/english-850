// 用新稿替换 data/units.js 里的某个单元（保留文件格式，只换这一段）
// 用法：node tools/replace-unit.js <unitId> <draft.json>
// 说明：按大括号配对定位单元对象，替换后重新算 words 数组（词序不能变）
const fs = require("fs");
const path = require("path");
const { ROOT, loadData, makeLookup, wordsIn, unitText } = require("./lib/vocab");

const id = process.argv[2];
const draftFile = process.argv[3];
const draft = JSON.parse(fs.readFileSync(draftFile, "utf8"));
if (draft.id !== id) { console.error("draft.id 与参数不一致：" + draft.id); process.exit(1); }

const lk = makeLookup(loadData());
draft.words = [...wordsIn(unitText(draft), lk)];

const file = path.join(ROOT, "data", "units.js");
let s = fs.readFileSync(file, "utf8");

const at = s.indexOf('"id": "' + id + '"');
if (at < 0) { console.error("units.js 里找不到 " + id); process.exit(1); }

// 往回找到对象起始的 {
let start = s.lastIndexOf("{", at);
// 往前匹配到这一个对象的结束 }
let i = start, depth = 0, inStr = false, esc = false;
for (; i < s.length; i++) {
  const c = s[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === "\\") esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') { inStr = true; continue; }
  if (c === "{") depth++;
  else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
}

const block = JSON.stringify(draft, null, 2).split("\n").map((l, k) => (k ? "  " + l : l)).join("\n");
s = s.slice(0, start) + block + s.slice(i);
fs.writeFileSync(file, s, "utf8");
console.log("已替换 " + id + "，words " + draft.words.length + " 个");
