// tools/lib/ecdict.js —— 读 ECDICT 的 CSV（只在 build-* 脚本里用，不参与网页运行）
// ECDICT 授权：MIT（skywind3000/ECDICT），CSV 不进仓库（66 MB），只把裁剪结果写进 data/
// 字段位置：0 word, 1 phonetic, 2 definition, 3 translation, 4 pos, ... 10 exchange
const fs = require("fs");

// CSV 逐字符解析：ECDICT 里有带引号的多行释义，不能用 split("\n")
function readRows(file, onRow) {
  const text = fs.readFileSync(file, "utf8");
  let field = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") {
      row.push(field);
      if (row.length > 1 && onRow(row) === false) return;
      row = [];
      field = "";
      continue;
    }
    if (c === "\r") continue;
    field += c;
  }
  if (field || row.length) { row.push(field); onRow(row); }
}

// 只取需要的词，省内存
function loadEntries(file, wanted) {
  const out = new Map();
  readRows(file, (r) => {
    const w = String(r[0] || "").toLowerCase().trim();
    if (!w || !wanted.has(w)) return true;
    out.set(w, {
      word: w,
      phonetic: r[1] || "",
      definition: r[2] || "",
      translation: r[3] || "",
      pos: r[4] || "",
      exchange: r[10] || ""
    });
    return out.size < wanted.size;
  });
  return out;
}

// "ə'baʊt" → "/əˈbaʊt/"；已经是 /…/ 或 […] 的原样返回
function toIpa(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (/^[/\[]/.test(s)) return s;
  s = s.replace(/'/g, "ˈ").replace(/,/g, "ˌ").replace(/:/g, "ː");
  return "/" + s + "/";
}

// 从 translation 里取词性缩写：n. / v. / adj. / adv. / prep. / conj. / pron. / num. / int.
function pickPos(entry) {
  const t = String((entry && entry.translation) || "");
  const m = t.match(/(^|[\s；;])(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|art|aux)\./i);
  if (!m) return "";
  const k = m[2].toLowerCase();
  const map = { n: "n.", v: "v.", vt: "v.", vi: "v.", adj: "adj.", adv: "adv.", prep: "prep.", conj: "conj.", pron: "pron.", num: "num.", int: "int.", art: "art.", aux: "aux." };
  return map[k] || k + ".";
}

// 一行中文：取第一个义项，去掉词性前缀与括号注解，压到 24 字内
function shortZh(entry, max) {
  let t = String((entry && entry.translation) || "").replace(/\r?\n/g, "；");
  t = t.replace(/^[\s；（(]*/, "");
  const parts = t.split(/[；;]/).map((x) => x.trim()).filter(Boolean);
  let first = parts[0] || "";
  first = first.replace(/^[a-zA-Z]+\.\s*/, "");          // 去掉 "n. "
  first = first.replace(/[（(][^）)]*[）)]/g, "");        // 去掉括号注解
  first = first.trim();
  const lim = max || 24;
  if (first.length > lim) first = first.slice(0, lim);
  return first || "";
}

module.exports = { readRows, loadEntries, toIpa, pickPos, shortZh };
