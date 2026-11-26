// 开发者面板：只在网址带 ?dev 时出现（验收新功能用，正常用户看不到）
// 用法：index.html?dev=1 或 线上地址?dev=1
(function () {
  "use strict";

  function on() {
    return /[?&]dev\b/.test(window.location.search);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function readDays() {
    var log = window.Store.readLog();
    return Object.keys(log).filter(function (k) { return log[k] >= 180; }).length;
  }

  // 提示条为什么弹 / 为什么不弹，一句话说清（验收用）
  function bannerWhy() {
    if (!window.App) return "?";
    if (window.App.showModeBanner()) return "是";
    if (!window.App.allLearned()) return "否(未学完 850)";
    if (window.Store.modeOverride()) return "否(今天手动选过模式)";
    if (window.Store.bannerDismissedToday()) return "否(今天已关)";
    return "否";
  }

  function reload() {
    window.location.reload();
  }

  function build() {
    var box = el("div", "dev");

    var head = el("div", "dev-head");
    head.appendChild(el("b", null, "开发者面板"));
    var close = el("button", "dev-x", "×");
    close.type = "button";
    close.addEventListener("click", function () { box.remove(); });
    head.appendChild(close);
    box.appendChild(head);

    var state = el("div", "dev-state");
    state.textContent =
      "已读天数 " + readDays() +
      " · 已学词 " + (window.App ? window.App.learnedCount() + "/" + window.App.wordTotal() : "?") +
      " · 已读单元 " + window.Store.doneList().length + "/" + (window.App ? window.App.units.length : "?") +
      " · 模式 " + (window.App && window.App.isPracticeMode() ? "练习" : "学习") +
      " · 覆盖 " + (window.Store.modeOverride() || "自动") +
      " · 提示条 " + (window.Store.bannerDismissedToday() ? "今天已关" : "会显示") +
      " · 该弹=" + bannerWhy();
    box.appendChild(state);

    function group(title, buttons) {
      box.appendChild(el("div", "dev-grp", title));
      var row = el("div", "dev-row");
      buttons.forEach(function (b) {
        var btn = el("button", "dev-btn", b[0]);
        btn.type = "button";
        btn.addEventListener("click", function () {
          // 第三项为 true 表示"这个按钮自己管刷新"（比如需要二次确认的）
          if (b[2]) { b[1](btn); return; }
          b[1]();
          reload();
        });
        row.appendChild(btn);
      });
      box.appendChild(row);
    }

    group("已读天数（<5 天合并一屏，≥5 天拆两屏）", [
      ["0 天", function () { window.Store.devSetReadDays(0); }],
      ["4 天", function () { window.Store.devSetReadDays(4); }],
      ["5 天", function () { window.Store.devSetReadDays(5); }],
      ["30 天", function () { window.Store.devSetReadDays(30); }]
    ]);

    group("词频（850 词全学过才会自动进练习模式）", [
      ["把 850 词全标已学", function () {
        var stats = {};
        Object.keys(window.WORDS || {}).forEach(function (w) {
          stats[w] = { n: 1, last: window.Store.todayKey() };
        });
        window.Store.setWordStats(stats);
      }],
      ["清空词频", function () { window.Store.setWordStats({}); }]
    ]);

    group("单元进度", [
      ["用第 2 个单元验收", function () {
        window.Store.devMarkAllDone([]);
        window.Store.setCur(1);
      }],
      ["标记全部读完", function () {
        window.Store.devMarkAllDone((window.App ? window.App.units : []).map(function (u) { return u.id; }));
      }],
      ["清空进度", function () { window.Store.devMarkAllDone([]); }]
    ]);

    group("练习模式提示条", [
      // "今天首次打开" = 没手动选过模式 + 今天没关提示条
      ["重置为今天首次打开", function () {
        window.Store.resetBanner();
        window.Store.setModeOverride(null);
      }],
      ["模拟今天已关", function () { window.Store.dismissBanner(); }]
    ]);

    group("模式覆盖", [
      ["自动", function () { window.Store.setModeOverride(null); }],
      ["强制练习", function () { window.Store.setModeOverride("practice"); }],
      ["强制学习", function () { window.Store.setModeOverride("learn"); }]
    ]);

    // 危险操作走"再点一次确认"，不用系统弹窗（SPEC 红线 4）
    group("离线缓存", [
      ["清空离线缓存并注销", function () {
        if (window.caches) {
          caches.keys().then(function (ks) {
            ks.forEach(function (k) { caches.delete(k); });
          });
        }
        if (navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then(function (rs) {
            rs.forEach(function (r) { r.unregister(); });
          });
        }
      }]
    ]);

    group("危险", [
      ["清空全部本地数据", function (btn) {
        if (btn.getAttribute("data-armed") === "1") {
          window.Store.devWipe();
          reload();
          return;
        }
        btn.setAttribute("data-armed", "1");
        btn.textContent = "再点一次：确认清空";
        window.setTimeout(function () {
          btn.removeAttribute("data-armed");
          btn.textContent = "清空全部本地数据";
        }, 4000);
      }, true]
    ]);

    document.body.appendChild(box);
  }

  if (on()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", build);
    } else {
      build();
    }
  }
})();
