// 使用记录 + 日历热力图（按月组织，可滚动看历史月份）
(function () {
  "use strict";

  var TARGET = 180; // 满 3 分钟算一天
  var TICK = 10;
  var MAX_MONTHS = 24;
  var lastTick = 0;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function demoLog() {
    var out = {};
    var now = new Date();
    for (var i = 0; i < 75; i++) {
      var d = new Date(now.getTime() - i * 86400000);
      var seed = (d.getDate() * 7 + d.getMonth() * 13) % 10;
      if (seed > 3) out[window.Store.todayKey(d)] = (3 + seed * 4) * 60;
    }
    return out;
  }

  // 仅在地址带 ?demo=1 时合并演示数据，不写入存储，不污染真实记录
  function withDemo(log) {
    var base = log || {};
    if (!/[?&]demo=1/.test(window.location.search)) return base;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    var fake = demoLog();
    Object.keys(fake).forEach(function (k) {
      if (!out[k]) out[k] = fake[k];
    });
    return out;
  }

  function monthsRange(log) {
    var now = new Date();
    var startY = now.getFullYear();
    var startM = now.getMonth();

    Object.keys(log).forEach(function (k) {
      var p = k.split("-");
      var y = parseInt(p[0], 10);
      var m = parseInt(p[1], 10) - 1;
      if (y < startY || (y === startY && m < startM)) {
        startY = y;
        startM = m;
      }
    });

    var list = [];
    var y = now.getFullYear();
    var m = now.getMonth();
    while ((y > startY || (y === startY && m >= startM)) && list.length < MAX_MONTHS) {
      list.push({ y: y, m: m });
      m--;
      if (m < 0) { m = 11; y--; }
    }
    return list;
  }

  function monthBlock(y, m, log) {
    var box = document.createElement("div");
    box.className = "mon-block";

    var title = document.createElement("div");
    title.className = "mon";
    title.textContent = y + "年" + (m + 1) + "月";
    box.appendChild(title);

    var head = document.createElement("div");
    head.className = "cal-head";
    ["一", "二", "三", "四", "五", "六", "日"].forEach(function (t) {
      var s = document.createElement("span");
      s.textContent = t;
      head.appendChild(s);
    });
    box.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "cal";

    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var days = new Date(y, m + 1, 0).getDate();

    for (var i = 0; i < offset; i++) {
      var blank = document.createElement("div");
      blank.className = "cell blank";
      grid.appendChild(blank);
    }

    for (var d = 1; d <= days; d++) {
      var cell = document.createElement("div");
      cell.className = "cell";

      var cd = document.createElement("span");
      cd.className = "cd";
      cd.textContent = d;

      var cb = document.createElement("i");
      cb.className = "cb";

      var k = y + "-" + pad(m + 1) + "-" + pad(d);
      var sec = log[k] || 0;
      var min = Math.round(sec / 60);

      if (sec >= TARGET) {
        cb.className = "cb on";
        var badge = document.createElement("b");
        badge.textContent = min + "m";
        cb.appendChild(badge);
      } else if (sec > 0) {
        cb.className = "cb half";
      }

      cell.appendChild(cd);
      cell.appendChild(cb);
      grid.appendChild(cell);
    }

    box.appendChild(grid);
    return box;
  }

  function renderCalendar(container, log) {
    if (!container) return;
    var data = withDemo(log);
    container.innerHTML = "";
    monthsRange(data).forEach(function (mm) {
      container.appendChild(monthBlock(mm.y, mm.m, data));
    });
  }

  function render() {
    var log = withDemo(window.Store.readLog());
    var days = 0;
    var total = 0;

    Object.keys(log).forEach(function (k) {
      total += log[k];
      if (log[k] >= TARGET) days++;
    });

    var dEl = document.getElementById("stat-days");
    var mEl = document.getElementById("stat-min");
    if (dEl) dEl.textContent = days;
    if (mEl) mEl.textContent = Math.round(total / 60);

    var marks = window.Store.marks();
    var nSave = 0, nLike = 0, nWord = 0;
    Object.keys(marks).forEach(function (k) {
      if (k.indexOf("w:") === 0) {
        if (marks[k].save) nWord++;
      } else {
        if (marks[k].save) nSave++;
        if (marks[k].like) nLike++;
      }
    });

    var s = document.getElementById("n-save");
    var l = document.getElementById("n-like");
    var w = document.getElementById("n-word");
    if (s) s.textContent = nSave;
    if (l) l.textContent = nLike;
    if (w) w.textContent = nWord;

    renderCalendar(document.getElementById("heat"), log);
  }

  function tick() {
    if (document.visibilityState !== "visible") {
      lastTick = Date.now();
      return;
    }
    var now = Date.now();
    var delta = Math.round((now - lastTick) / 1000);
    lastTick = now;
    if (delta <= 0) return;
    if (delta > TICK * 3) delta = TICK;
    window.Store.addSeconds(delta);
  }

  function start() {
    lastTick = Date.now();
    setInterval(tick, TICK * 1000);
    document.addEventListener("visibilitychange", function () {
      lastTick = Date.now();
    });
    render();
  }

  window.Progress = { start: start, render: render, renderCalendar: renderCalendar };
})();
