// tools/checks.js —— 校验内核（SPEC §4.5 / §11.3 / §14）
// 同一份代码，两处用：
//   浏览器：<script src="checks.js">，挂在 window.Checks 上，给 admin.html 用
//   Node  ：require("./checks.js")，给 test-checks.js 用
//
// 这里的判定口径必须与 tools/measure.js 一致。词形还原是逐字照抄 tools/lib/vocab.js 的，
// 两边是否漂移由 tools/test-checks.js 逐词比对（改这里就要跑那个脚本）。
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Checks = api;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  // ---------- 口径常量（改这里等于改合同，SPEC 里同步改） ----------
  var UNIT_RULE = {
    short: { min: 5, max: 8 },        // 短句条数
    long: { min: 3, max: 5 },         // 长句条数
    passage: { min: 150, max: 250 },  // 短文词数（目标 150–180，老内容偏长，先不判死）
    total: { min: 230, max: 350 }     // 单元合计词数（v10 下调：短文压缩后合计随之下降）
  };
  var FRESH_RULE = { min: 20, max: 25 };  // 每单元新词数
  var LEVEL_RULE = {
    low: { min: 0, max: 8, sent: 1 },
    mid: { min: 8, max: 18, sent: 2 },
    high: { min: 20, max: 40, sent: 3 }
  };
  var LEVEL_GOAL = { low: 100, mid: 100, high: 100 }; // 练习池目标 300（v10）

  // ---------- 词 ----------
  function wordCount(s) {
    return (String(s).match(/[A-Za-z']+/g) || []).length;
  }

  function tokensOf(s) {
    return (String(s).match(/[A-Za-z']+/g) || []).map(function (w) { return w.toLowerCase(); });
  }

  // 与 tools/lib/vocab.js 的 makeLookup 逐行一致（顺序也不能换）
  function makeLookup(V) {
    var WORDS = V.WORDS || {};
    var FORMS = V.WORD_FORMS || {};
    var ALLOWED = V.WORD_ALLOWED || {};
    var DEVIATION = V.WORD_DEVIATION || {};
    var GLOSSARY = V.GLOSSARY || {};
    var CONTR = V.CONTRACTIONS || {};

    function lookup(raw) {
      var w = String(raw).toLowerCase();
      if (CONTR[w]) return { base: w, kind: "contraction" };
      if (/'s$/.test(w)) w = w.slice(0, -2);
      else w = w.replace(/'+$/, "");
      if (WORDS[w]) return { base: w, kind: "word" };
      if (ALLOWED[w]) return { base: w, kind: "allowed" };
      if (DEVIATION[w]) return { base: w, kind: "deviation" };
      if (CONTR[w]) return { base: w, kind: "contraction" };
      if (GLOSSARY[w]) return { base: w, kind: "glossary" };
      if (FORMS[w]) {
        var b = FORMS[w];
        if (WORDS[b]) return { base: b, kind: "word" };
        if (DEVIATION[b]) return { base: b, kind: "deviation" };
        if (CONTR[b]) return { base: b, kind: "contraction" };
        if (GLOSSARY[b]) return { base: b, kind: "glossary" };
      }
      var cands = [
        w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
        w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
        w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, "")
      ];
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        if (!c) continue;
        if (WORDS[c]) return { base: c, kind: "word" };
        if (ALLOWED[c]) return { base: c, kind: "allowed" };
        if (DEVIATION[c]) return { base: c, kind: "deviation" };
        if (CONTR[c]) return { base: c, kind: "contraction" };
        if (GLOSSARY[c]) return { base: c, kind: "glossary" };
      }
      return null;
    }

    return { lookup: lookup, WORDS: WORDS, FORMS: FORMS, ALLOWED: ALLOWED, DEVIATION: DEVIATION, GLOSSARY: GLOSSARY, CONTR: CONTR };
  }

  function wordsIn(text, lk) {
    var out = {};
    var list = [];
    tokensOf(text).forEach(function (t) {
      var hit = lk.lookup(t);
      if (hit && hit.kind === "word" && !out[hit.base]) {
        out[hit.base] = 1;
        list.push(hit.base);
      }
    });
    return list;
  }

  function unitText(u) {
    return []
      .concat(u.short.map(function (s) { return s.en; }))
      .concat(u.long.map(function (s) { return s.en; }))
      .concat(u.passage.paragraphs.map(function (p) { return p.en; }))
      .join(" ");
  }

  function inRange(n, r) { return n >= r.min && n <= r.max; }

  // ---------- 单元 ----------
  // 返回 rows（每个单元一行）+ 总览数字。
  // 新词口径：按单元顺序首次出现才算新词（与 measure.js §4.4 一致）。
  function checkUnits(units, lk) {
    var seen = {};
    var appear = {};
    var rows = [];
    var badFresh = [];

    (units || []).forEach(function (u) {
      var shortWords = u.short.reduce(function (n, s) { return n + wordCount(s.en); }, 0);
      var longWords = u.long.reduce(function (n, s) { return n + wordCount(s.en); }, 0);
      var passWords = u.passage.paragraphs.reduce(function (n, p) { return n + wordCount(p.en); }, 0);
      var total = shortWords + longWords + passWords;
      var text = unitText(u);
      var toks = tokensOf(text);

      var missMap = {};
      var allowed = 0, deviation = 0;
      toks.forEach(function (t) {
        var hit = lk.lookup(t);
        if (!hit) missMap[t] = (missMap[t] || 0) + 1;
        else if (hit.kind === "allowed") allowed++;
        else if (hit.kind === "deviation") deviation++;
      });

      var ws = wordsIn(text, lk);
      ws.forEach(function (w) { appear[w] = (appear[w] || 0) + 1; });
      var fresh = ws.filter(function (w) { return !seen[w]; });
      fresh.forEach(function (w) { seen[w] = 1; });

      var missing = Object.keys(missMap).map(function (w) {
        return { w: w, n: missMap[w] };
      }).sort(function (a, b) { return b.n - a.n || (a.w < b.w ? -1 : 1); });

      var problems = [];
      if (!inRange(u.short.length, UNIT_RULE.short)) {
        problems.push({ type: "short", text: "短句 " + u.short.length + " 条，应为 " + UNIT_RULE.short.min + "–" + UNIT_RULE.short.max });
      }
      if (!inRange(u.long.length, UNIT_RULE.long)) {
        problems.push({ type: "long", text: "长句 " + u.long.length + " 条，应为 " + UNIT_RULE.long.min + "–" + UNIT_RULE.long.max });
      }
      if (!inRange(passWords, UNIT_RULE.passage)) {
        problems.push({ type: "passage", text: "短文 " + passWords + " 词，应为 " + UNIT_RULE.passage.min + "–" + UNIT_RULE.passage.max });
      }
      if (!inRange(total, UNIT_RULE.total)) {
        problems.push({ type: "total", text: "合计 " + total + " 词，应为 " + UNIT_RULE.total.min + "–" + UNIT_RULE.total.max });
      }
      if (missing.length) {
        problems.push({ type: "missing", text: "超纲 " + missing.length + " 个词" });
      }
      if (!inRange(fresh.length, FRESH_RULE)) {
        problems.push({ type: "fresh", text: "新词 " + fresh.length + " 个，应为 " + FRESH_RULE.min + "–" + FRESH_RULE.max });
        badFresh.push(u.id);
      }

      rows.push({
        id: u.id,
        name: u.mnemonic || "",
        title: (u.passage && u.passage.title) || "",
        short: u.short.length,
        long: u.long.length,
        para: u.passage.paragraphs.length,
        shortWords: shortWords,
        longWords: longWords,
        passWords: passWords,
        total: total,
        uniq: ws.length,
        fresh: fresh,
        missing: missing,
        allowed: allowed,
        deviation: deviation,
        problems: problems
      });
    });

    var covered = Object.keys(seen);
    var wordTotal = Object.keys(lk.WORDS).length;
    var state = { fresh: 0, mid: 0, firm: 0 };
    covered.forEach(function (w) {
      var n = appear[w] || 0;
      if (n <= 4) state.fresh++;
      else if (n <= 14) state.mid++;
      else state.firm++;
    });

    return {
      rows: rows,
      covered: covered,
      coveredCount: covered.length,
      wordTotal: wordTotal,
      gapCount: Math.max(0, wordTotal - covered.length),
      pct: wordTotal ? Math.round((covered.length / wordTotal) * 100) : 0,
      state: state,
      badFresh: badFresh
    };
  }

  // ---------- 练习池 ----------
  function checkExercises(list, lk) {
    var ids = {};
    var byLevel = { low: 0, mid: 0, high: 0 };
    var badWordsMap = {};
    var rows = [];

    (list || []).forEach(function (q) {
      byLevel[q.level] = (byLevel[q.level] || 0) + 1;
      var n = wordCount(q.en);
      var sent = (q.en.match(/[.!?]/g) || []).length;
      var L = LEVEL_RULE[q.level];
      var missing = [];
      var problems = [];

      if (ids[q.id]) problems.push({ type: "id", text: "编号重复" });
      ids[q.id] = 1;

      if (!L) problems.push({ type: "level", text: "没有档位（应为 low / mid / high）" });
      else {
        if (n < L.min || n > L.max) problems.push({ type: "level", text: n + " 词，应为 " + L.min + "–" + L.max });
        if (sent > L.sent) problems.push({ type: "level", text: sent + " 句，最多 " + L.sent + " 句" });
      }

      tokensOf(q.en).forEach(function (t) {
        if (!lk.lookup(t)) {
          badWordsMap[t] = (badWordsMap[t] || 0) + 1;
          if (missing.indexOf(t) === -1) missing.push(t);
        }
      });
      if (missing.length) problems.push({ type: "missing", text: "超纲：" + missing.join(" ") });

      rows.push({
        id: q.id,
        level: q.level,
        tags: q.tags || [],
        zh: q.zh || "",
        en: q.en || "",
        words: n,
        sentences: sent,
        missing: missing,
        problems: problems
      });
    });

    return {
      rows: rows,
      total: rows.length,
      byLevel: byLevel,
      goal: LEVEL_GOAL,
      badWords: Object.keys(badWordsMap),
      badRows: rows.filter(function (r) { return r.problems.length; }).map(function (r) { return r.id; })
    };
  }

  // ---------- 拓展 ----------
  function checkExtras(extras, lk) {
    var rows = [];
    var simpleBad = {};   // 简说超纲（简说必须 850 内）
    var stdMissing = {};  // 原文没注解（不限词，但点了要能看中文）
    var totalStd = 0, viaGlossary = 0;

    Object.keys(extras || {}).forEach(function (id) {
      var d = extras[id];
      var blocks = (d.read && d.read.blocks) || [];
      var simpleWords = 0;
      var unitBad = [];
      var unitStd = 0;
      var unitGloss = 0;
      var unitMissing = [];

      blocks.forEach(function (b) {
        tokensOf(b.simple).forEach(function (t) {
          simpleWords++;
          if (!lk.lookup(t)) {
            simpleBad[t] = (simpleBad[t] || 0) + 1;
            if (unitBad.indexOf(t) === -1) unitBad.push(t);
          }
        });
        tokensOf(b.std).forEach(function (t) {
          totalStd++;
          unitStd++;
          var hit = lk.lookup(t);
          if (hit && hit.kind === "glossary") { viaGlossary++; unitGloss++; }
          if (!hit) {
            stdMissing[t] = (stdMissing[t] || 0) + 1;
            if (unitMissing.indexOf(t) === -1) unitMissing.push(t);
          }
        });
      });

      rows.push({
        id: id,
        title: (d.read && d.read.title) || "",
        blocks: blocks.length,
        simpleWords: simpleWords,
        simpleBad: unitBad,
        stdWords: unitStd,
        stdGloss: unitGloss,
        stdMissing: unitMissing
      });
    });

    return {
      rows: rows,
      simpleBad: Object.keys(simpleBad),
      stdMissing: Object.keys(stdMissing),
      stdTotal: totalStd,
      viaGlossary: viaGlossary
    };
  }

  // ---------- 一句话规则表（总览页直接用） ----------
  var LEN_TYPES = ["short", "long", "passage", "total"];

  function pickProblems(list, types) {
    return (list || []).filter(function (p) { return types.indexOf(p.type) !== -1; });
  }

  function rules(U, E, X) {
    var list = [];

    var lenBad = U.rows.filter(function (r) { return pickProblems(r.problems, LEN_TYPES).length; });
    list.push({
      key: "长度",
      name: "单元长度（短 5–8 / 长 3–5 / 短文 150–250 / 合计 300–450）",
      pass: lenBad.length === 0,
      detail: lenBad.map(function (r) {
        return r.id + "：" + pickProblems(r.problems, LEN_TYPES).map(function (p) { return p.text; }).join("；");
      }),
      go: "unit"
    });

    var missBad = U.rows.filter(function (r) { return pickProblems(r.problems, ["missing"]).length; });
    list.push({
      key: "超纲",
      name: "单元超纲词（必须 0）",
      pass: missBad.length === 0,
      detail: missBad.map(function (r) {
        return r.id + " " + r.missing.map(function (m) { return m.w + "×" + m.n; }).join(" ");
      }),
      go: "unit"
    });

    var freshBad = U.rows.filter(function (r) { return pickProblems(r.problems, ["fresh"]).length; });
    list.push({
      key: "新词",
      name: "每单元新词 " + FRESH_RULE.min + "–" + FRESH_RULE.max,
      pass: freshBad.length === 0,
      detail: freshBad.map(function (r) { return r.id + " " + r.fresh.length + " 个"; }),
      go: "unit"
    });

    list.push({
      key: "覆盖",
      name: "词覆盖进度（目标 850）",
      pass: U.gapCount === 0,
      todo: U.gapCount > 0,
      detail: [U.coveredCount + " / " + U.wordTotal + " = " + U.pct + "%，还差 " + U.gapCount + " 词"],
      go: "overview"
    });

    var lvlBad = E.rows.filter(function (r) { return pickProblems(r.problems, ["level", "id"]).length; });
    list.push({
      key: "档位",
      name: "练习句档位与长度（低 ≤8 / 当 8–18 / 进阶 20–40）",
      pass: lvlBad.length === 0,
      detail: lvlBad.map(function (r) {
        return r.id + "：" + pickProblems(r.problems, ["level", "id"]).map(function (p) { return p.text; }).join("；");
      }),
      go: "ex"
    });

    list.push({
      key: "练习超纲",
      name: "练习句只用 850 内",
      pass: E.badWords.length === 0,
      detail: E.badWords,
      go: "ex"
    });

    list.push({
      key: "简说",
      name: "拓展简说只用 850 内",
      pass: X.simpleBad.length === 0,
      detail: X.simpleBad,
      go: "extra"
    });

    list.push({
      key: "点词",
      name: "原文每个词都能点开看中文",
      pass: X.stdMissing.length === 0,
      detail: X.stdMissing,
      go: "extra"
    });

    return list;
  }

  return {
    UNIT_RULE: UNIT_RULE,
    FRESH_RULE: FRESH_RULE,
    LEVEL_RULE: LEVEL_RULE,
    LEVEL_GOAL: LEVEL_GOAL,
    wordCount: wordCount,
    tokensOf: tokensOf,
    makeLookup: makeLookup,
    wordsIn: wordsIn,
    unitText: unitText,
    checkUnits: checkUnits,
    checkExercises: checkExercises,
    checkExtras: checkExtras,
    rules: rules
  };
});
