// 练习池抽取（SPEC §14）——纯逻辑，不碰页面，方便单独验（tools/test-draw.js）
// 规则：随机抽、近 10 次不重复、按已学词过滤、一轮抽完再洗牌
(function () {
  "use strict";

  // §14.3.2 近 10 次出现过的不重复。按"10 次打开"算：每次约 3 句 → 记最近 30 句。
  // 这样 §14.5.1「连开 5 次不重复」一定成立（5 次 = 15 句 < 30）。
  var WINDOW = 30;
  var ORDER = ["low", "mid", "high"];
  var NAME = { low: "低阶", mid: "当阶", high: "进阶" };

  function pool() { return (window.EXERCISES || []).slice(); }

  function tokensOf(text) {
    return String(text).match(/[A-Za-z']+/g) || [];
  }

  // 词形还原：与 reader.js / tools/lib/vocab.js 同一套规则
  function baseOf(tok) {
    var w = String(tok).toLowerCase();
    if (/'s$/.test(w)) w = w.slice(0, -2);
    else w = w.replace(/'+$/, "");
    var W = window.WORDS || {}, F = window.WORD_FORMS || {}, D = window.WORD_DEVIATION || {};
    if (W[w] || D[w]) return w;
    if (F[w]) {
      var b = F[w];
      if (W[b] || D[b]) return b;
    }
    var cands = [
      w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
      w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
      w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, "")
    ];
    for (var i = 0; i < cands.length; i++) {
      if (cands[i] && (W[cands[i]] || D[cands[i]])) return cands[i];
    }
    return null;
  }

  // 已学词 = 词频表里累计次数 ≥ 1 的词
  function learnedSet() {
    var stats = (window.Store && window.Store.wordStats()) || {};
    var set = {};
    Object.keys(stats).forEach(function (w) {
      if (stats[w] && stats[w].n > 0) set[w] = 1;
    });
    return set;
  }

  function allKnown(text, learned) {
    return tokensOf(text).every(function (t) {
      var b = baseOf(t);
      return !b || learned[b];
    });
  }

  // §11.3 每日题量：按已学词占比配档；学完 850 固定 1+1+1（§14.2）
  function planLevels(ratio, done) {
    if (done) return ["low", "mid", "high"];
    if (ratio < 0.25) return ["low"];
    if (ratio < 0.5) return ["low", "mid"];
    if (ratio < 0.75) return ["mid", "mid"];
    return ["mid", "high"];
  }

  // 抽一轮
  // opts: { levels, seen, learned, strict, rand }
  // 返回: { items, seen, notes }
  function draw(opts) {
    opts = opts || {};
    var levels = opts.levels || ["low", "mid", "high"];
    var seen = (opts.seen || []).slice();
    var learned = opts.learned || {};
    var strict = !!opts.strict;
    var rand = opts.rand || Math.random;
    var items = pool();
    var notes = [];

    // 可用池：同档 + 本轮没抽过 + 若收窄口径则只留全是已学词的
    function cands(level) {
      return items.filter(function (q) {
        if (q.level !== level) return false;
        if (usedIds[q.id]) return false;
        if (strict && !allKnown(q.en, learned)) return false;
        return true;
      });
    }
    function idsOf(level) {
      var m = {};
      items.forEach(function (q) { if (q.level === level) m[q.id] = 1; });
      return m;
    }

    var usedIds = {};
    var out = [];

    levels.forEach(function (level) {
      var list = cands(level);
      if (!list.length) {
        // 该档要么一轮抽完了，要么这个阶段没题 → 先洗牌，再降级
        var ids = idsOf(level);
        var afterReset = seen.filter(function (id) { return !ids[id]; });
        var again = items.filter(function (q) {
          return q.level === level && !usedIds[q.id] && (!strict || allKnown(q.en, learned));
        });
        if (again.length) {
          seen = afterReset; // 该档已轮完一遍，重置窗口重新开始（§14.3.4）
          list = again;
        }
      }

      if (!list.length) {
        // 降级：找档位最近、且还有题的
        var pos = ORDER.indexOf(level);
        var alt = ORDER.slice().sort(function (a, b) {
          var da = Math.abs(ORDER.indexOf(a) - pos), db = Math.abs(ORDER.indexOf(b) - pos);
          return da - db;
        });
        for (var i = 0; i < alt.length && !list.length; i++) {
          if (alt[i] !== level) list = cands(alt[i]);
          if (list.length) notes.push(NAME[level] + "题不够，先用" + NAME[alt[i]] + "顶上");
        }
      }

      if (!list.length) {
        notes.push(NAME[level] + "这一档暂时没有能出的题");
        return;
      }

      // 去掉窗口内的，再从剩下里随机拿一个
      var fresh = list.filter(function (q) { return seen.indexOf(q.id) === -1; });
      var pick = (fresh.length ? fresh : list)[Math.floor(rand() * (fresh.length ? fresh.length : list.length))];
      usedIds[pick.id] = 1;
      out.push(pick);
      seen.push(pick.id);
    });

    // 窗口只留最近 WINDOW 条
    if (seen.length > WINDOW) seen = seen.slice(seen.length - WINDOW);
    return { items: out, seen: seen, notes: notes };
  }

  window.Exercises = {
    WINDOW: WINDOW,
    planLevels: planLevels,
    baseOf: baseOf,
    learnedSet: learnedSet,
    allKnown: allKnown,
    draw: draw
  };
})();
