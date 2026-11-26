// 课外拓展 + 课外练习（SPEC §11）
// 两块各占一屏；答案原位替换、可逆；提示一律页面内，不调用系统弹窗
(function () {
  "use strict";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---- 页内轻提示（替代 window.confirm / alert） ----
  var toastTimer = null;
  function toast(msg) {
    var box = document.getElementById("toast");
    if (!box) {
      box = el("div", "toast");
      box.id = "toast";
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.add("on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      box.classList.remove("on");
    }, 2200);
  }

  // ---- 已学词判定（未学完就进练习模式时，题面收窄到已学范围） ----
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

  function learnedSet() {
    var stats = window.Store.wordStats();
    var set = {};
    Object.keys(stats).forEach(function (w) {
      if (stats[w] && stats[w].n > 0) set[w] = 1;
    });
    return set;
  }

  function tokensOf(text) {
    return String(text).match(/[A-Za-z']+/g) || [];
  }

  function allKnown(text, learned) {
    return tokensOf(text).every(function (t) {
      var b = baseOf(t);
      return !b || learned[b];
    });
  }

  function strictMode(practiceMode) {
    return practiceMode && window.App && window.App.allLearned && !window.App.allLearned();
  }

  // ---- 练习模式顶部提示条（含页内二次确认） ----
  function banner(container) {
    var bar = el("div", "mode-banner");
    var text = el("span", "mode-text", "您已学完所有词汇，默认开启练习模式");
    var back = el("button", "mode-back", "返回学习模式");
    var close = el("button", "mode-close", "×");
    back.type = "button";
    close.type = "button";
    close.setAttribute("aria-label", "关闭提示");

    close.addEventListener("click", function () {
      bar.remove();
    });

    back.addEventListener("click", function () {
      bar.innerHTML = "";
      bar.appendChild(el("span", "mode-text", "切回学习模式？练习模式会关掉，之后可在「我的」里再打开。"));
      var ok = el("button", "mode-back", "确定");
      var no = el("button", "mode-back mode-cancel", "取消");
      ok.type = "button";
      no.type = "button";
      ok.addEventListener("click", function () {
        window.Store.setModeOverride("learn");
        window.App.refresh();
        toast("已切回学习模式");
      });
      no.addEventListener("click", function () {
        bar.innerHTML = "";
        bar.appendChild(text);
        bar.appendChild(back);
        bar.appendChild(close);
      });
      bar.appendChild(ok);
      bar.appendChild(no);
    });

    bar.appendChild(text);
    bar.appendChild(back);
    bar.appendChild(close);
    container.appendChild(bar);
  }

  // ---- 第一屏：课外拓展（原文 / 中文 / 简说） ----
  function renderRead(container, unitId, practiceMode) {
    var data = (window.EXTRAS || {})[unitId];
    container.innerHTML = "";
    if (!data) {
      container.appendChild(el("div", "ex-empty", "这一课还没有课外内容。"));
      return;
    }

    if (practiceMode) banner(container);

    container.appendChild(el("h3", "ex-h", "课外拓展"));

    var learned = learnedSet();
    var strict = strictMode(practiceMode);

    var titleEl = el("div", "ex-title", data.read.title);
    if (strict) {
      var simpleAll = data.read.blocks.every(function (b) { return allKnown(b.simple, learned); });
      if (!simpleAll) titleEl.appendChild(el("span", "ex-tag", "含未学词"));
    }
    container.appendChild(titleEl);

    var body = el("div", "ex-read");
    data.read.blocks.forEach(function (b, i) {
      if (i > 0) body.appendChild(el("hr", "ex-sep"));
      var block = el("div", "ex-block");
      block.appendChild(el("span", "ex-tag", "原文"));
      block.appendChild(el("p", "ex-std", b.std));
      block.appendChild(el("p", "ex-zh-s", b.zh));
      block.appendChild(el("span", "ex-tag ex-tag-say", "简说"));
      block.appendChild(el("p", "ex-simple", b.simple));
      body.appendChild(block);
    });
    container.appendChild(body);
  }

  // ---- 第二屏：课外练习 ----
  function quizItem(item, i) {
    var wrap = el("div", "ex-item");
    wrap.appendChild(el("span", "ex-no", i + 1));

    var line = el("div", "ex-line");
    var zh = el("span", "ex-zh", item.zh);
    var en = el("span", "ex-en", item.en);
    en.hidden = true;
    line.appendChild(zh);
    line.appendChild(en);
    wrap.appendChild(line);

    var btn = el("button", "ex-btn", "参考答案");
    btn.type = "button";
    var shown = false;
    btn.addEventListener("click", function () {
      shown = !shown;
      zh.hidden = shown;
      en.hidden = !shown;
      btn.textContent = shown ? "看中文" : "参考答案";
      window.Store.log(shown ? "quiz_reveal" : "quiz_hide", null, { level: item.level });
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function renderQuiz(container, unitId, practiceMode) {
    var data = (window.EXTRAS || {})[unitId];
    container.innerHTML = "";
    if (!data) {
      container.appendChild(el("div", "ex-empty", "这一课还没有练习题。"));
      return;
    }

    container.appendChild(el("h3", "ex-h", "课外练习"));

    var learned = learnedSet();
    var strict = strictMode(practiceMode);
    var list = el("div", "ex-quiz");
    var kept = 0;
    var dropped = 0;

    data.quiz.forEach(function (q) {
      if (strict && !allKnown(q.en, learned)) {
        dropped++;
        return;
      }
      list.appendChild(quizItem(q, kept));
      kept++;
    });
    container.appendChild(list);

    if (!kept) {
      container.appendChild(el("div", "ex-empty", "这几道题用到的词你还没学到，先回学习模式继续读。"));
    } else if (dropped) {
      container.appendChild(el("div", "ex-tip", "另有 " + dropped + " 道题含未学词，暂时不显示。"));
    }
    container.appendChild(el("div", "ex-tip", "先在心里说一遍，再点参考答案对照。"));
  }

  window.Toast = toast;
  window.Extras = { renderRead: renderRead, renderQuiz: renderQuiz };
})();
