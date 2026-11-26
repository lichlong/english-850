// 数据读写。加了一层存储可用性检测：存不了就明说，不静默失败。
(function () {
  "use strict";

  var K_STATS = "e850.wordStats";
  var K_EVENTS = "e850.events";
  var K_READ = "e850.read";
  var K_PROG = "e850.progress";
  var K_MARKS = "e850.marks";
  var K_MODE = "e850.mode";
  var K_EXQ = "e850.exq"; // 练习池：最近抽到过的句子 id（滑动窗口，SPEC §14.3.2）
  var K_BANNER = "e850.bannerOff"; // 练习模式提示条关闭的日期（同一天不再弹）
  var K_REHAB = "e850.rehabAt";   // 上次显示复健卡的日期（同一次断更只提示一次）

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

    setWordStats: function (s) { save(K_STATS, s); },

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

    // ---- 模式覆盖：只记"当天"，隔天自动失效（SPEC §11.4）
    //      null = 自动（学完 850 进练习，否则学习）
    //      { d: "2026-11-26", v: "learn" | "practice" } = 今天手动选过
    modeOverride: function () {
      var raw = load(K_MODE, null);
      if (!raw || typeof raw !== "object") return null; // 旧版存的是字符串，升级时直接作废
      return raw.d === todayKey() ? raw.v : null;
    },

    setModeOverride: function (v) {
      save(K_MODE, v === null ? null : { d: todayKey(), v: v });
    },

    // ---- 练习模式提示条：关一次，当天不再出现（SPEC §11.4） ----
    bannerDismissedToday: function () { return load(K_BANNER, null) === todayKey(); },

    dismissBanner: function () { save(K_BANNER, todayKey()); },

    resetBanner: function () {
      if (usable) {
        try { localStorage.removeItem(K_BANNER); } catch (e) {}
      }
      delete mem[K_BANNER];
    },

    // ---- 复健卡：记录显示日期（SPEC §13.2 临时方案） ----
    rehabAt: function () { return load(K_REHAB, null); },

    setRehabAt: function (d) { save(K_REHAB, d); },

    // ---- 练习池窗口：最近抽到过的句子 id ----
    exSeen: function () { return load(K_EXQ, []); },

    setExSeen: function (ids) { save(K_EXQ, ids || []); },

    // ---- 备份：整包读写（SPEC §15.3） ----
    exportAll: function () {
      var out = {};
      var ns = "e850.";
      if (usable) {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(ns) === 0) out[k] = localStorage.getItem(k);
        }
      } else {
        Object.keys(mem).forEach(function (k) { out[k] = JSON.stringify(mem[k]); });
      }
      return out;
    },

    importAll: function (data) {
      if (!data) return false;
      var ns = "e850.";
      // 先清掉旧的，再写入——避免旧单元进度和备份混在一起
      if (usable) {
        var drop = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(ns) === 0) drop.push(k);
        }
        drop.forEach(function (k) { localStorage.removeItem(k); });
        Object.keys(data).forEach(function (k) {
          if (k.indexOf(ns) !== 0) return;
          localStorage.setItem(k, data[k]);
        });
      } else {
        Object.keys(mem).forEach(function (k) { if (k.indexOf(ns) === 0) delete mem[k]; });
        Object.keys(data).forEach(function (k) {
          if (k.indexOf(ns) !== 0) return;
          try { mem[k] = JSON.parse(data[k]); } catch (e) {}
        });
      }
      return true;
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

    // 造一次断更：只留 n 天前那一天的阅读记录
    devSetLastReadDays: function (n) {
      var d = new Date(Date.now() - n * 86400000);
      var log = {};
      log[todayKey(d)] = 400;
      save(K_READ, log);
      if (usable) { try { localStorage.removeItem(K_REHAB); } catch (e) {} }
      delete mem[K_REHAB];
    },

    devMarkAllDone: function (ids) {
      save(K_PROG, { done: ids.slice() });
    },

    devWipe: function () {
      var keys = [K_STATS, K_EVENTS, K_READ, K_PROG, K_MARKS, K_MODE, K_EXQ, K_BANNER, K_REHAB, "e850.cur"];
      keys.forEach(function (k) {
        if (usable) {
          try { localStorage.removeItem(k); } catch (e) {}
        }
        delete mem[k];
      });
    }
  };
})();
