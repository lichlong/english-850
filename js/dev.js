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
      " · 已读单元 " + window.Store.doneList().length + "/" + (window.App ? window.App.units.length : "?") +
      " · 模式 " + (window.App && window.App.isPracticeMode() ? "练习" : "学习") +
      " · 覆盖 " + (window.Store.modeOverride() || "自动");
    box.appendChild(state);

    function group(title, buttons) {
      box.appendChild(el("div", "dev-grp", title));
      var row = el("div", "dev-row");
      buttons.forEach(function (b) {
        var btn = el("button", "dev-btn", b[0]);
        btn.type = "button";
        btn.addEventListener("click", function () { b[1](); reload(); });
        row.appendChild(btn);
      });
      box.appendChild(row);
    }

    group("已读天数（≥5 天才解锁课外练习）", [
      ["0 天", function () { window.Store.devSetReadDays(0); }],
      ["4 天", function () { window.Store.devSetReadDays(4); }],
      ["5 天", function () { window.Store.devSetReadDays(5); }],
      ["30 天", function () { window.Store.devSetReadDays(30); }]
    ]);

    group("单元进度（全部读完 = 自动进练习模式）", [
      ["用第 2 个单元验收", function () {
        window.Store.devMarkAllDone([]);
        window.Store.setCur(1);
      }],
      ["标记全部读完", function () {
        window.Store.devMarkAllDone((window.App ? window.App.units : []).map(function (u) { return u.id; }));
      }],
      ["清空进度", function () { window.Store.devMarkAllDone([]); }]
    ]);

    group("模式覆盖", [
      ["自动", function () { window.Store.setModeOverride(null); }],
      ["强制练习", function () { window.Store.setModeOverride("practice"); }],
      ["强制学习", function () { window.Store.setModeOverride("learn"); }]
    ]);

    group("危险", [
      ["清空全部本地数据", function () {
        if (window.confirm("清空本机所有阅读记录、收藏、进度？")) window.Store.devWipe();
      }]
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
