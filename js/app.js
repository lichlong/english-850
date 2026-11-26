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

    var total = unit.short.length + unit.long.length;
    var pages = document.getElementById("pages");
    pages.innerHTML = "";
    pages.appendChild(buildPage1(unit));
    pages.appendChild(buildPage2(unit, total + 1));
    pages.scrollLeft = 0;

    renderDots(2);

    var min = Math.max(3, Math.round(countWords(unit) / 90));
    document.getElementById("idx").textContent = (current + 1) + " / " + units.length;
    document.getElementById("eta").textContent = "约 " + min + " 分钟学完";
  }

  function advance() {
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
      var info = (window.WORDS || {})[w] || (window.WORD_ALLOWED || {})[w];
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

    var rows = document.querySelectorAll(".row-link");
    Array.prototype.forEach.call(rows, function (r) {
      r.addEventListener("click", function () {
        openList(r.getAttribute("data-list"));
      });
    });

    render();
    window.Progress.start();
    window.Store.log("open", units[current] ? units[current].id : null);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
