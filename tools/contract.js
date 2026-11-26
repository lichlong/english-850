// 把内容里能缩写的写法统一成缩写（SPEC §4.2.1）
// 用法：node tools/contract.js          只报告会改多少处
//      node tools/contract.js --write  真的写回 data/ 下的内容文件
//
// 只改英文句子（units 的 en、extras 的 std/simple、exercises 的 en）。
// 缩写表在 data/contractions.js，改完跑 node tools/measure.js 确认超纲仍为 0。
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./lib/vocab");

// 先长后短、先否定后肯定："it is not" 要变成 "it isn't"，不是 "it's not"
const RULES = [
  ["does not", "doesn't"], ["do not", "don't"], ["did not", "didn't"],
  ["is not", "isn't"], ["are not", "aren't"],
  ["was not", "wasn't"], ["were not", "weren't"],
  ["has not", "hasn't"], ["have not", "haven't"], ["had not", "hadn't"],
  ["will not", "won't"], ["would not", "wouldn't"],
  ["could not", "couldn't"], ["should not", "shouldn't"],
  ["can not", "can't"], ["cannot", "can't"],
  ["I am", "I'm"], ["it is", "it's"], ["that is", "that's"], ["there is", "there's"],
  ["we are", "we're"], ["they are", "they're"], ["you are", "you're"],
  ["he is", "he's"], ["she is", "she's"], ["let us", "let's"],
];

const FILES = ["data/units.js", "data/extras.js", "data/exercises.js"];
const write = process.argv.includes("--write");

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let grand = 0;
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  let text = fs.readFileSync(p, "utf8");
  const before = text;
  const hits = [];

  for (const [from, to] of RULES) {
    for (const [a, b] of [[from, to], [cap(from), cap(to)]]) {
      const re = new RegExp("\\b" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
      const n = (text.match(re) || []).length;
      if (n) {
        text = text.replace(re, b);
        hits.push(a + " → " + b + " ×" + n);
      }
    }
  }

  grand += hits.length;
  console.log(rel + "：" + (hits.length ? hits.join("，") : "无需改动"));
  if (write && text !== before) fs.writeFileSync(p, text, "utf8");
}

console.log("\n共 " + grand + " 类写法" + (write ? "，已写回文件" : "，未写文件（加 --write 才写）"));
if (write) console.log("下一步：node tools/measure.js 确认超纲 0，node tools/test-draw.js 确认练习池仍合规");
