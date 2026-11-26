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

  // 练习模式提示条的出现条件（SPEC §11.4）：
  //   1. 真的学完 850（不是手动切进来的）
  //   2. 模式是"自动"判定出来的，手动覆盖过就不弹
  //   3. 今天没关过
  function showModeBanner() {
    if (!allLearned()) return false;
    if (window.Store.modeOverride() !== null) return false;
    if (window.Store.bannerDismissedToday()) return false;
    return true;
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

  // ---- 复健卡（SPEC §13.2 临时落地方案） ----
  // 触发：距上次阅读 ≥7 天。只提示一次（同一次断更），提示完就照常往下走。
  // 说明：单元内容是固定的，所以这里只做"先复习哪些词"的提示，
  //       §13.2 里的"不排新词""退回新词队列"需要动态排词引擎，等那一版再做。
  var REHAB_GAP_DAYS = 7;

  function lastReadDate() {
    var log = window.Store.readLog();
    var keys = Object.keys(log).filter(function (k) { return log[k] > 0; });
    if (!keys.length) return null;
    keys.sort();
    return keys[keys.length - 1];
  }

  function gapDays(fromKey, toKey) {
    return Math.round((new Date(toKey) - new Date(fromKey)) / 86400000);
  }

  function rehabState() {
    var last = lastReadDate();
    if (!last) return null;
    var gap = gapDays(last, window.Store.todayKey());
    if (gap < REHAB_GAP_DAYS) return null;
    var shownAt = window.Store.rehabAt();
    if (shownAt && shownAt >= last) return null; // 这次断更已经提示过了

    var stats = window.Store.wordStats();
    var FW = window.FUNCTION_WORDS || {};
    var W = window.WORDS || {};
    var list = Object.keys(stats).filter(function (w) {
      // 功能词不入选：它们每句都出现，复习没有意义（SPEC §13.4）
      return stats[w] && stats[w].n > 0 && W[w] && !FW[w];
    }).map(function (w) {
      return {
        w: w,
        eff: window.Store.effCount(stats[w].n, stats[w].last),
        g: (W[w] && W[w].g) || 1
      };
    });
    // 先按有效次数升序；次数相同的，词频越靠后（g 越大）越优先，即"相对低频"的先练
    list.sort(function (a, b) {
      if (a.eff !== b.eff) return a.eff - b.eff;
      return b.g - a.g;
    });
    if (!list.length) return null;
    return {
      gap: gap,
      words: list.slice(0, 25).map(function (x) { return x.w; })
    };
  }

  function rehabCard(info) {
    var card = document.createElement("div");
    card.className = "rehab";

    var h = document.createElement("div");
    h.className = "rehab-h";
    h.textContent = "复健 · 距上次 " + info.gap + " 天";
    card.appendChild(h);

    var p = document.createElement("p");
    p.className = "rehab-p";
    p.textContent = info.gap > 60
      ? "这次断得久，今天只做这一步：把下面这些词过一遍，过完再往下学。读完多少算多少。"
      : "先把下面这 " + info.words.length + " 个词过一遍，过完了再往下学新的。";
    card.appendChild(p);

    var box = document.createElement("div");
    box.className = "rehab-words";
    info.words.forEach(function (w) {
      var chip = document.createElement("span");
      chip.className = "w rehab-w";
      chip.setAttribute("data-w", w);
      chip.textContent = w;
      box.appendChild(chip);
    });
    card.appendChild(box);

    var tip = document.createElement("div");
    tip.className = "rehab-tip";
    tip.textContent = "点词查看释义";
    card.appendChild(tip);

    window.Store.setRehabAt(window.Store.todayKey());
    return card;
  }

  // 把复健卡插到某个容器最前面（两个模式共用）
  function attachRehab(container) {
    var info = rehabState();
    if (info) container.insertBefore(rehabCard(info), container.firstChild);
  }

  // 第一屏拼装口径（SPEC §14.9）：2 短固定 + 1 短动态 + 1 长固定 + 1 长动态
  // 动态句按"最薄弱的词"挑；池子没有合适的句子就不插，不留空位
  var SHORT_FIXED = 2;
  var LONG_FIXED = 1;

  function buildPage1(unit) {
    var page = document.createElement("section");
    page.className = "page";

    attachRehab(page);

    var stats = window.Store.wordStats();
    var dynShort = window.Exercises.pickForSlot({ slot: "short", unitIndex: current, stats: stats });
    var dynLong = window.Exercises.pickForSlot({ slot: "long", unitIndex: current, stats: stats });

    var n = 0;
    function add(kind, s, id) {
      n++;
      page.appendChild(window.Reader.sentenceItem(kind, n, s, id, { unit: unit.id, kind: kind }));
    }

    unit.short.slice(0, SHORT_FIXED).forEach(function (s, i) {
      add("short", s, unit.id + "-s" + (i + 1));
    });
    if (dynShort) {
      index["dyn:" + dynShort.id] = { kind: "short", en: dynShort.en, zh: dynShort.zh };
      add("short", dynShort, "dyn:" + dynShort.id);
    }

    unit.long.slice(0, LONG_FIXED).forEach(function (s, i) {
      add("long", s, unit.id + "-l" + (i + 1));
    });
    if (dynLong) {
      index["dyn:" + dynLong.id] = { kind: "long", en: dynLong.en, zh: dynLong.zh };
      add("long", dynLong, "dyn:" + dynLong.id);
    }

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

  // 从练习池抽一轮（SPEC §14）。每次打开重新抽。
  // 未学完 850 → 只出已解锁课时的题；学完 → 全池，不再看课时（§14.7）
  function drawQuiz(lite) {
    var total = wordTotal();
    var done = allLearned();
    var ratio = total ? learnedCount() / total : 0;
    var res = window.Exercises.draw({
      levels: window.Exercises.planLevels(ratio, done),
      seen: window.Store.exSeen(),
      allLearned: done,
      unitIndex: current,
      preview: !!lite
    });
    window.Store.setExSeen(res.seen);
    return res;
  }

  function fillQuiz(wrap, lite) {
    var res = drawQuiz(lite);
    window.Extras.renderQuiz(wrap, res.items, res.notes, lite);
  }

  // 课外两块各占一屏：第 3 屏 拓展，第 4 屏 练习
  function buildExtrasPages(unit, practice) {
    var out = [];

    var readPage = document.createElement("section");
    readPage.className = "page page-ext";
    var wrap1 = document.createElement("div");
    wrap1.className = "ex-wrap";
    window.Extras.renderRead(wrap1, unit.id, {
      practice: practice,
      lite: false,
      banner: practice && showModeBanner()
    });
    // 练习模式没有"学习页"，复健卡挂在拓展页顶部
    if (practice) attachRehab(wrap1);
    readPage.appendChild(wrap1);
    out.push(readPage);

    var quizPage = document.createElement("section");
    quizPage.className = "page page-ext";
    var wrap2 = document.createElement("div");
    wrap2.className = "ex-wrap";
    fillQuiz(wrap2, false);
    quizPage.appendChild(wrap2);

    var next = document.createElement("button");
    next.className = "next";
    next.type = "button";
    if (practice) {
      // 练习模式下"换一篇"没意义（池子跟课时无关），改成重抽（SPEC §14.3.1）
      // 练习模式：一整天一起换（拓展跟单元走，练习跟池子走，两个都要换）
      next.textContent = "再学一天";
      next.addEventListener("click", nextDay);
    } else {
      next.textContent = "再学一篇";
      next.addEventListener("click", advance);
    }
    quizPage.appendChild(next);
    out.push(quizPage);

    return out;
  }

  // 前 5 天：拓展 + 练习合成一屏，各给一条（SPEC §11.2）
  // 目的：别让新用户以为功能缺失
  function buildLitePage(unit) {
    var page = document.createElement("section");
    page.className = "page page-ext";

    var wrap = document.createElement("div");
    wrap.className = "ex-wrap";
    window.Extras.renderRead(wrap, unit.id, { practice: false, lite: true, banner: false });

    var sep = document.createElement("hr");
    sep.className = "ex-sep";
    wrap.appendChild(sep);

    // 练习要单独一层：renderQuiz 会清空自己那个容器，不能直接传给 wrap
    var quizWrap = document.createElement("div");
    wrap.appendChild(quizWrap);
    fillQuiz(quizWrap, true);

    var tip = document.createElement("div");
    tip.className = "ex-tip";
    tip.textContent = "前 5 天拓展与练习合为一屏，各一条；第 6 天起各占一屏。";
    wrap.appendChild(tip);

    page.appendChild(wrap);

    var next = document.createElement("button");
    next.className = "next";
    next.type = "button";
    next.textContent = "再学一篇";
    next.addEventListener("click", advance);
    page.appendChild(next);

    return page;
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
    if (window.EXTRAS && window.EXTRAS[unit.id]) {
      if (extrasUnlocked()) {
        var ep = buildExtrasPages(unit, false);
        ep.forEach(function (p) { pages.appendChild(p); });
        count = 2 + ep.length;
      } else {
        pages.appendChild(buildLitePage(unit));
        count = 3;
      }
    }

    pages.scrollLeft = 0;
    renderDots(count);

    var min = Math.max(3, Math.round(countWords(unit) / 90));
    document.getElementById("idx").textContent = (current + 1) + " / " + units.length;
    document.getElementById("eta").textContent = "约 " + min + " 分钟学完";
  }

  // 练习模式的"再学一天"：换单元 → 拓展和练习一起变；不记"已读单元"、不加词频
  function nextDay() {
    current = (current + 1) % units.length;
    window.Store.setCur(current);
    render();
    var pages = document.getElementById("pages");
    if (pages) pages.scrollLeft = 0;
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
      var info = (window.WORDS || {})[w] || (window.WORD_ALLOWED || {})[w] ||
        (window.WORD_DEVIATION || {})[w] || (window.CONTRACTIONS || {})[w] ||
        (window.GLOSSARY || {})[w];
      color = "var(--story)";
      en = w;
      zh = info ? info.zh : "";
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
    if (!row) return;
    row.setAttribute("aria-checked", isPracticeMode() ? "true" : "false");
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
    showModeBanner: showModeBanner,
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
