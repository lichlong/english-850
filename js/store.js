// 数据读写。加了一层存储可用性检测：存不了就明说，不静默失败。
(function () {
  "use strict";

  var K_STATS = "e850.wordStats";
  var K_EVENTS = "e850.events";
  var K_READ = "e850.read";
  var K_PROG = "e850.progress";
  var K_MARKS = "e850.marks";
  var K_MODE = "e850.mode";

  var mem = {};
  var usable = (function () {
    try {
      var k = "e850.__probe";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function load(key, fallback) {
    if (!usable) {
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
    }
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    if (!usable) {
      mem[key] = value;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // 满了或被禁用了，退回内存
      mem[key] = value;
    }
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function todayKey(d) {
    var t = d || new Date();
    return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  }

  // 有效次数 = 累计次数 × 0.99 ^ 距最后接触的天数
  function effCount(n, lastKey) {
    if (!n) return 0;
    if (!lastKey) return n;
    var gap = Math.floor((new Date(todayKey()) - new Date(lastKey)) / 86400000);
    if (gap < 0) gap = 0;
    return n * Math.pow(0.99, gap);
  }

  window.Store = {
    storageOK: usable,
    todayKey: todayKey,
    effCount: effCount,

    wordStats: function () { return load(K_STATS, {}); },

    touchWord: function (word) {
      var all = load(K_STATS, {});
      var cur = all[word] || { n: 0, last: todayKey() };
      cur.n = cur.n + 1;
      cur.last = todayKey();
      all[word] = cur;
      save(K_STATS, all);
      return cur;
    },

    events: function () { return load(K_EVENTS, []); },

    log: function (action, target, meta) {
      var list = load(K_EVENTS, []);
      list.push({ t: Date.now(), a: action, target: target || null, meta: meta || null });
      save(K_EVENTS, list);
    },

    marks: function () { return load(K_MARKS, {}); },

    getMark: function (id, kind) {
      var m = load(K_MARKS, {});
      return !!(m[id] && m[id][kind]);
    },

    toggleMark: function (id, kind, meta) {
      var m = load(K_MARKS, {});
      if (!m[id]) m[id] = {};
      m[id][kind] = !m[id][kind];
      save(K_MARKS, m);
      window.Store.log(m[id][kind] ? kind : "un" + kind, id, meta);
      return m[id][kind];
    },

    countMarks: function (kind) {
      var m = load(K_MARKS, {});
      return Object.keys(m).filter(function (k) { return m[k][kind]; }).length;
    },

    getCur: function () { return load("e850.cur", 0); },

    setCur: function (i) { save("e850.cur", i); },

    readLog: function () { return load(K_READ, {}); },

    addSeconds: function (sec) {
      var log = load(K_READ, {});
      var d = todayKey();
      log[d] = (log[d] || 0) + sec;
      save(K_READ, log);
      return log[d];
    },

    hasDone: function (id) {
      return load(K_PROG, { done: [] }).done.indexOf(id) !== -1;
    },

    markDone: function (id) {
      var p = load(K_PROG, { done: [] });
      if (p.done.indexOf(id) === -1) p.done.push(id);
      save(K_PROG, p);
      return p;
    },

    doneList: function () {
      return load(K_PROG, { done: [] }).done || [];
    },

    // ---- 模式：null=自动（读完自动进练习模式） / "learn" / "practice" ----
    modeOverride: function () {
      return load(K_MODE, null);
    },

    setModeOverride: function (v) {
      if (v === null) save(K_MODE, null);
      else save(K_MODE, v);
    },

    // ---- 开发者工具：用来跳到任意学习阶段（?dev=1 才会调用） ----
    devSetReadDays: function (n) {
      var log = {};
      var base = new Date();
      for (var i = 0; i < n; i++) {
        var d = new Date(base.getTime() - i * 86400000);
        log[todayKey(d)] = 240;
      }
      save(K_READ, log);
    },

    devMarkAllDone: function (ids) {
      save(K_PROG, { done: ids.slice() });
    },

    devWipe: function () {
      var keys = [K_STATS, K_EVENTS, K_READ, K_PROG, K_MARKS, K_MODE, "e850.cur"];
      keys.forEach(function (k) {
        if (usable) {
          try { localStorage.removeItem(k); } catch (e) {}
        }
        delete mem[k];
      });
    }
  };
})();
