// 主流程：分页、单元切换、「我的」页、列表与全屏日历
(function () {
  "use strict";

  var PROVERBS = [
    { en: "Little by little, one travels far.", zh: "积跬步，至千里" },
    { en: "Slow and steady wins the race.", zh: "稳扎稳打者胜" },
    { en: "A little every day adds up to a lot.", zh: "每天一点点，久了就是一大截" },
    { en: "Well begun is half done.", zh: "好的开始是成功的一半" }
  ];

  var units = window.UNITS || [];
  var current = 0;
  var index = {};

  // 课外练习解锁门槛：读满 5 天（SPEC §11.2）。只调这一个数。
  var EXTRAS_START_DAYS = 5;
  // 与 progress.js 的 TARGET 保持一致：一天读满 3 分钟才算"读过一天"
  var DAY_TARGET_SEC = 180;

  function readDays() {
    var log = window.Store.readLog();
    return Object.keys(log).filter(function (k) {
      return log[k] >= DAY_TARGET_SEC;
    }).length;
  }

  function extrasUnlocked() {
    return readDays() >= EXTRAS_START_DAYS;
  }

  // 「学完」的判定：词表里每个词都至少接触过 1 次（按 §4.4 的词频累计）
  function wordTotal() {
    return Object.keys(window.WORDS || {}).length;
  }

  function learnedCount() {
    var stats = window.Store.wordStats();
    var n = 0;
    Object.keys(stats).forEach(function (w) {
      if (stats[w] && stats[w].n > 0 && (window.WORDS || {})[w]) n++;
    });
    return n;
  }

  function allLearned() {
    return wordTotal() > 0 && learnedCount() >= wordTotal();
  }

  function isPracticeMode() {
    var override = window.Store.modeOverride();
    if (override === "practice") return true;
    if (override === "learn") return false;
    // 自动：850 词全部学过才进练习模式（不是"读完单元"）
    return allLearned();
  }

  function buildIndex() {
    units.forEach(function (u) {
      u.short.forEach(function (s, i) {
        index[u.id + "-s" + (i + 1)] = { kind: "short", en: s.en, zh: s.zh };
      });
      u.long.forEach(function (s, i) {
        index[u.id + "-l" + (i + 1)] = { kind: "long", en: s.en, zh: s.zh };
      });
      index[u.id + "-p"] = { kind: "story", en: u.passage.title, zh: "短文 · " + u.mnemonic };
    });
  }

  function countWords(unit) {
    var s = "";
    unit.short.forEach(function (x) { s += x.en + " "; });
    unit.long.forEach(function (x) { s += x.en + " "; });
    unit.passage.paragraphs.forEach(function (p) { s += p.en + " "; });
    var m = s.match(/[A-Za-z']+/g);
    return m ? m.length : 0;
  }

  function quoteEl(i) {
    var q = PROVERBS[i % PROVERBS.length];
    var d = document.createElement("div");
    d.className = "quote";
    d.textContent = "\u201c" + q.en + "\u201d";
    var sub = document.createElement("span");
    sub.textContent = q.zh;
    d.appendChild(sub);
    return d;
  }

  function buildPage1(unit) {
    var page = document.createElement("section");
    page.className = "page";

    unit.short.forEach(function (s, i) {
      page.appendChild(window.Reader.sentenceItem(
        "short", i + 1, s, unit.id + "-s" + (i + 1), { unit: unit.id, kind: "short" }
      ));
    });

    unit.long.forEach(function (s, i) {
      page.appendChild(window.Reader.sentenceItem(
        "long", unit.short.length + i + 1, s, unit.id + "-l" + (i + 1),
        { unit: unit.id, kind: "long" }
      ));
    });

    page.appendChild(quoteEl(0));
    return page;
  }

  function buildPage2(unit, storyNum) {
    var page = document.createElement("section");
    page.className = "page";
    page.appendChild(window.Reader.storyItem(unit, storyNum));
    page.appendChild(quoteEl(1));

    var next = document.createElement("button");
    next.className = "next";
    next.type = "button";
    next.textContent = "再学一篇";
    next.addEventListener("click", advance);
    page.appendChild(next);

    return page;
  }

  // 课外两块各占一屏：第 3 屏 拓展，第 4 屏 练习
  function buildExtrasPages(unit, practice) {
    var out = [];

    var readPage = document.createElement("section");
    readPage.className = "page page-ext";
    var wrap1 = document.createElement("div");
    wrap1.className = "ex-wrap";
    window.Extras.renderRead(wrap1, unit.id, practice);
    readPage.appendChild(wrap1);
    out.push(readPage);

    var quizPage = document.createElement("section");
    quizPage.className = "page page-ext";
    var wrap2 = document.createElement("div");
    wrap2.className = "ex-wrap";
    window.Extras.renderQuiz(wrap2, unit.id, practice);
    quizPage.appendChild(wrap2);

    var next = document.createElement("button");
    next.className = "next";
    next.type = "button";
    next.textContent = practice ? "换一篇" : "再学一篇";
    next.addEventListener("click", advance);
    quizPage.appendChild(next);
    out.push(quizPage);

    return out;
  }

  function renderDots(count) {
    var dots = document.getElementById("dots");
    dots.innerHTML = "";
    for (var i = 0; i < count; i++) {
      dots.appendChild(document.createElement("i"));
    }
    if (dots.firstChild) dots.firstChild.className = "on";
  }

  function syncDots() {
    var pages = document.getElementById("pages");
    var w = pages.clientWidth || 1;
    var idx = Math.round(pages.scrollLeft / w);
    var dots = document.getElementById("dots").children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].className = i === idx ? "on" : "";
    }
  }

  function goPage(i) {
    var pages = document.getElementById("pages");
    pages.scrollTo({ left: i * pages.clientWidth, behavior: "smooth" });
  }

  function render() {
    var unit = units[current];
    if (!unit) return;

    var practice = isPracticeMode();
    var total = unit.short.length + unit.long.length;
    var pages = document.getElementById("pages");
    pages.innerHTML = "";

    if (practice) {
      // 练习模式：两屏，只有「课外拓展」和「课外练习」
      var pp = buildExtrasPages(unit, true);
      pp.forEach(function (p) { pages.appendChild(p); });
      renderDots(pp.length);
      pages.scrollLeft = 0;
      document.getElementById("idx").textContent = "练习";
      document.getElementById("eta").textContent = "";
      return;
    }

    pages.appendChild(buildPage1(unit));
    pages.appendChild(buildPage2(unit, total + 1));

    var count = 2;
    if (extrasUnlocked() && window.EXTRAS && window.EXTRAS[unit.id]) {
      var ep = buildExtrasPages(unit, false);
      ep.forEach(function (p) { pages.appendChild(p); });
      count = 2 + ep.length;
    }

    pages.scrollLeft = 0;
    renderDots(count);

    var min = Math.max(3, Math.round(countWords(unit) / 90));
    document.getElementById("idx").textContent = (current + 1) + " / " + units.length;
    document.getElementById("eta").textContent = "约 " + min + " 分钟学完";
  }

  function advance() {
    var unit = units[current];
    if (unit) {
      window.Store.markDone(unit.id);
      // 读过一个单元 = 这些词各接触了一次，计入词频（切模式不会清空）
      (unit.words || []).forEach(function (w) {
        if (/^[a-z]+$/.test(w)) window.Store.touchWord(w);
      });
    }
    current = (current + 1) % units.length;
    window.Store.setCur(current);
    render();
  }

  function listItem(kind, id) {
    var wrap = document.createElement("div");
    wrap.className = "li";

    var color = "var(--short)";
    var en = id;
    var zh = "";

    if (kind === "word") {
      var w = id.slice(2);
      var info = (window.WORDS || {})[w] || (window.WORD_ALLOWED || {})[w] || (window.WORD_DEVIATION || {})[w];
      color = "var(--story)";
      en = w;
      zh = info ? ((info.ipa ? info.ipa + "\u3000" : "") + info.zh) : "";
    } else if (index[id]) {
      var it = index[id];
      color = it.kind === "short" ? "var(--short)" : (it.kind === "long" ? "var(--long)" : "var(--story)");
      en = it.en;
      zh = it.zh;
    }

    var dot = document.createElement("span");
    dot.className = "li-dot";
    dot.style.background = color;

    var body = document.createElement("span");
    body.className = "li-body";
    var a = document.createElement("span");
    a.className = "li-en";
    a.textContent = en;
    var b = document.createElement("span");
    b.className = "li-zh";
    b.textContent = zh;
    body.appendChild(a);
    body.appendChild(b);

    wrap.appendChild(dot);
    wrap.appendChild(body);
    return wrap;
  }

  function openList(kind) {
    var marks = window.Store.marks();
    var keys = Object.keys(marks).filter(function (k) {
      if (kind === "word") return k.indexOf("w:") === 0 && marks[k].save;
      return k.indexOf("w:") !== 0 && marks[k][kind];
    });

    var titles = { save: "收藏的内容", like: "点过赞的内容", word: "收藏的词" };
    document.getElementById("sub-title").textContent = titles[kind] || "列表";

    var body = document.getElementById("sub-body");
    body.innerHTML = "";

    if (!keys.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = kind === "word"
        ? "还没有收藏的词。读到不认识的词，点一下就能收藏。"
        : "还没有记录。";
      body.appendChild(empty);
    } else {
      keys.reverse().forEach(function (k) {
        body.appendChild(listItem(kind, k));
      });
    }

    document.getElementById("sub").classList.add("on");
  }

  function openCal() {
    document.getElementById("sub-title").textContent = "阅读记录";
    var body = document.getElementById("sub-body");
    body.innerHTML = "";
    var box = document.createElement("div");
    box.className = "cal-months";
    body.appendChild(box);
    window.Progress.renderCalendar(box, window.Store.readLog());
    document.getElementById("sub").classList.add("on");
  }

  // 「我的」里的模式开关：显示当前状态
  function syncModeRow() {
    var row = document.getElementById("row-mode");
    var label = document.getElementById("mode-state");
    if (!row) return;
    var on = isPracticeMode();
    row.classList.toggle("on", on);
    if (label) label.textContent = on ? "开" : "关";
  }

  function boot() {
    if (!window.Store.storageOK) {
      var warn = document.getElementById("warn");
      if (warn) warn.hidden = false;
    }

    buildIndex();

    var saved = window.Store.getCur();
    if (typeof saved === "number" && saved >= 0 && saved < units.length) {
      current = saved;
    }

    var pages = document.getElementById("pages");
    pages.addEventListener("scroll", function () {
      window.clearTimeout(pages._t);
      pages._t = window.setTimeout(syncDots, 80);
    });

    document.getElementById("dots").addEventListener("click", function (e) {
      var i = Array.prototype.indexOf.call(this.children, e.target);
      if (i >= 0) goPage(i);
    });

    document.getElementById("btn-me").addEventListener("click", function () {
      window.Progress.render();
      document.getElementById("sheet").classList.add("on");
    });

    document.getElementById("btn-close").addEventListener("click", function () {
      document.getElementById("sheet").classList.remove("on");
      document.getElementById("sub").classList.remove("on");
    });

    document.getElementById("sub-close").addEventListener("click", function () {
      document.getElementById("sub").classList.remove("on");
    });

    document.getElementById("cal-wrap").addEventListener("click", openCal);

    var rowMode = document.getElementById("row-mode");
    if (rowMode) {
      rowMode.addEventListener("click", function () {
        var on = isPracticeMode();
        window.Store.setModeOverride(on ? "learn" : "practice");
        syncModeRow();
        render();
        if (window.Toast) {
          window.Toast(on ? "已切换到学习模式" : "已切换到练习模式");
        }
      });
    }
    syncModeRow();

    var rows = document.querySelectorAll(".row-link");
    Array.prototype.forEach.call(rows, function (r) {
      var kind = r.getAttribute("data-list");
      if (!kind) return; // 模式开关那行没有 data-list，交给上面的处理
      r.addEventListener("click", function () {
        openList(kind);
      });
    });

    render();
    window.Progress.start();
    window.Store.log("open", units[current] ? units[current].id : null);
  }

  window.App = {
    refresh: function () {
      syncModeRow();
      render();
    },
    isPracticeMode: isPracticeMode,
    allLearned: allLearned,
    learnedCount: learnedCount,
    wordTotal: wordTotal,
    units: units
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
