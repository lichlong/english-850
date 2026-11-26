// 练习池抽取（SPEC §14）——纯逻辑，不碰页面，方便单独验（tools/test-draw.js）
//
// 两条口径：
//   未学完 850 → 只出「已解锁课时」的题（题里每个词都在读过的那几课里出现过）
//   学完 850   → 全池随机，不再区分课时
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

  // 已学词 = 词频表里累计次数 ≥ 1 的词（只给拓展标题的「含未学词」标签用）
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

  // ---- 课时解锁：每个词第一次出现在第几课 ----
  var unitMap = null;
  function buildUnitMap() {
    var map = {};
    var units = window.UNITS || [];
    var W = window.WORDS || {};
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var text = []
        .concat(u.short.map(function (s) { return s.en; }),
                u.long.map(function (s) { return s.en; }),
                u.passage.paragraphs.map(function (p) { return p.en; }))
        .join(" ");
      var toks = tokensOf(text);
      for (var j = 0; j < toks.length; j++) {
        var b = baseOf(toks[j]);
        if (b && W[b] && map[b] === undefined) map[b] = i;
      }
    }
    return map;
  }

  // 一句练习的解锁课时 = 它所有词里最晚出现的那个词所在课时
  // 返回 null 表示还有词没被任何课时覆盖（内容补齐前不会出现在未学完的池子里）
  function unlockIndex(q) {
    if (q._unlock !== undefined) return q._unlock;
    if (!unitMap) unitMap = buildUnitMap();
    var idx = -1;
    var toks = tokensOf(q.en);
    for (var i = 0; i < toks.length; i++) {
      var b = baseOf(toks[i]);
      if (!b) continue;
      var u = unitMap[b];
      if (u === undefined) {
        q._unlock = null;
        return null;
      }
      if (u > idx) idx = u;
    }
    q._unlock = idx;
    return idx;
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
  // opts: { levels, seen, allLearned, unitIndex, preview, rand }
  //   allLearned  学完 850 → 全池，不看课时
  //   unitIndex   当前课时下标（未学完时用来卡"已解锁"）
  //   preview     前 5 天轻量预览：池子空时兜底一道低阶（可能含未学词）
  // 返回: { items, seen, notes }
  function draw(opts) {
    opts = opts || {};
    var levels = opts.levels || ["low", "mid", "high"];
    var seen = (opts.seen || []).slice();
    var rand = opts.rand || Math.random;
    var notes = [];

    var all = pool();
    var base = all;
    if (!opts.allLearned && typeof opts.unitIndex === "number") {
      base = all.filter(function (q) {
        var u = unlockIndex(q);
        return u !== null && u <= opts.unitIndex;
      });
      if (!base.length && opts.preview) {
        base = all.filter(function (q) { return q.level === "low"; });
        notes.push("课外练习为预览，句子里可能有还没学到的词");
      }
    }

    var usedIds = {};

    function cands(level) {
      return base.filter(function (q) {
        return q.level === level && !usedIds[q.id];
      });
    }
    function idsOf(level) {
      var m = {};
      base.forEach(function (q) { if (q.level === level) m[q.id] = 1; });
      return m;
    }

    var out = [];

    levels.forEach(function (level) {
      var list = cands(level);
      if (!list.length) {
        // 该档要么一轮抽完了，要么这个阶段没题 → 先洗牌，再降级
        var ids = idsOf(level);
        var again = base.filter(function (q) {
          return q.level === level && !usedIds[q.id];
        });
        if (again.length) {
          seen = seen.filter(function (id) { return !ids[id]; }); // 该档已轮完一遍，重置窗口（§14.3.4）
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
      var src = fresh.length ? fresh : list;
      var pick = src[Math.floor(rand() * src.length)];
      usedIds[pick.id] = 1;
      out.push(pick);
      seen.push(pick.id);
    });

    if (seen.length > WINDOW) seen = seen.slice(seen.length - WINDOW);
    return { items: out, seen: seen, notes: notes };
  }

  // 正文动态句（SPEC §14.9）：按"句子里最薄弱的词"挑一句
  // opts: { slot: "short" | "long", unitIndex, stats, rand }
  // 返回 null 表示没有合适的句子（内容没覆盖到），调用方就不插这一句
  function pickForSlot(opts) {
    opts = opts || {};
    var stats = opts.stats || {};
    var unitIndex = typeof opts.unitIndex === "number" ? opts.unitIndex : 0;
    var rand = opts.rand || Math.random;
    var levels = opts.slot === "long" ? ["high", "mid"] : ["low", "mid"];
    var W = window.WORDS || {};

    var cands = pool().filter(function (q) {
      if (levels.indexOf(q.level) === -1) return false;
      var u = unlockIndex(q);
      return u !== null && u <= unitIndex;
    });
    if (!cands.length) return null;

    function effOf(st) {
      if (!st) return 0;
      if (window.Store && window.Store.effCount) return window.Store.effCount(st.n, st.last);
      return st.n || 0;
    }

    // 每句取"句中最低有效次数"，越低说明越该练
    var scored = cands.map(function (q) {
      var toks = tokensOf(q.en);
      var worst = Infinity;
      for (var i = 0; i < toks.length; i++) {
        var b = baseOf(toks[i]);
        if (!b || !W[b]) continue;
        var eff = effOf(stats[b]);
        if (eff < worst) worst = eff;
      }
      return { q: q, worst: worst === Infinity ? 999 : worst };
    });
    scored.sort(function (x, y) { return x.worst - y.worst; });

    // 只在这一档里随机，避免每次都同一句
    var floorScore = scored[0].worst;
    var head = scored.filter(function (x) { return x.worst <= floorScore + 0.5; });
    return head[Math.floor(rand() * head.length)].q;
  }

  // 诊断：每句解锁在第几课（null = 还没被内容覆盖）
  function unlockTable() {
    return pool().map(function (q) {
      return { id: q.id, level: q.level, unit: unlockIndex(q) };
    });
  }

  window.Exercises = {
    WINDOW: WINDOW,
    planLevels: planLevels,
    baseOf: baseOf,
    learnedSet: learnedSet,
    allKnown: allKnown,
    unlockIndex: unlockIndex,
    pickForSlot: pickForSlot,
    unlockTable: unlockTable,
    draw: draw
  };
})();
