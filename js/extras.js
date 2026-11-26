// 课外拓展 + 课外练习：同屏渲染，答案原位替换、可逆（SPEC §11.1）
(function () {
  "use strict";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // 一句练习：中文在上；点按钮后**同一位置**换成英文，再点换回
  function quizItem(item, i) {
    var wrap = el("div", "ex-item");

    var no = el("span", "ex-no", i + 1);
    var line = el("div", "ex-line");
    var zh = el("span", "ex-zh", item.zh);
    var en = el("span", "ex-en", item.en);
    en.hidden = true;
    line.appendChild(zh);
    line.appendChild(en);
    wrap.appendChild(no);
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

  // ---- 已学词判定（SPEC §11.4 补充：未学完就进练习模式时，题面词汇要收窄到已学范围） ----
  function baseOf(tok) {
    var w = String(tok).toLowerCase();
    if (/'s$/.test(w)) w = w.slice(0, -2);
    else w = w.replace(/'+$/, "");
    var W = window.WORDS || {}, F = window.WORD_FORMS || {};
    if (W[w]) return w;
    if (F[w] && W[F[w]]) return F[w];
    var cands = [
      w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
      w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
      w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, "")
    ];
    for (var i = 0; i < cands.length; i++) if (cands[i] && W[cands[i]]) return cands[i];
    return null; // 表外词（允许项/偏离词），不参与收窄
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

  function render(container, unitId, practiceMode) {
    var data = (window.EXTRAS || {})[unitId];
    container.innerHTML = "";
    if (!data) {
      container.appendChild(el("div", "ex-empty", "这一课还没有课外内容。"));
      return;
    }

    if (practiceMode) {
      var banner = el("div", "mode-banner");
      banner.appendChild(el("span", "mode-text", "您已学完所有词汇，默认开启练习模式"));
      var back = el("button", "mode-back", "返回学习模式");
      back.type = "button";
      back.addEventListener("click", function () {
        if (window.confirm("返回学习模式？练习模式会关掉，下次可在「我的」里再打开。")) {
          window.Store.setModeOverride("learn");
          window.App.refresh();
        }
      });
      var close = el("button", "mode-close", "×");
      close.type = "button";
      close.setAttribute("aria-label", "关闭提示");
      close.addEventListener("click", function () {
        banner.classList.add("gone");
      });
      banner.appendChild(back);
      banner.appendChild(close);
      container.appendChild(banner);
    }

    // 课外拓展
    container.appendChild(el("h3", "ex-h", "课外拓展"));
    var learned = learnedSet();
    var strict = practiceMode && window.App && window.App.allLearned && !window.App.allLearned();
    var titleEl = el("div", "ex-title", data.read.title);
    if (strict) {
      var readAll = data.read.paragraphs.every(function (p) { return allKnown(p.en, learned); });
      if (!readAll) titleEl.appendChild(el("span", "ex-tag", "含未学词"));
    }
    container.appendChild(titleEl);
    var body = el("div", "ex-read");
    data.read.paragraphs.forEach(function (p) {
      body.appendChild(el("p", null, p.en));
    });
    container.appendChild(body);

    // 课外练习
    container.appendChild(el("h3", "ex-h", "课外练习"));
    var list = el("div", "ex-quiz");
    var kept = 0;
    var dropped = 0;
    data.quiz.forEach(function (q, i) {
      // 练习模式 + 还没学完 850 → 只出"答案里的词全学过"的题
      if (strict && !allKnown(q.en, learned)) {
        dropped++;
        return;
      }
      list.appendChild(quizItem(q, kept));
      kept++;
    });
    container.appendChild(list);

    if (!kept) {
      list.appendChild(el("div", "ex-empty", "这几道题用到的词你还没学到，先回学习模式继续读。"));
    } else if (dropped) {
      list.appendChild(el("div", "ex-tip", "另有 " + dropped + " 道题含未学词，暂时不显示。"));
    }

    var tip = el("div", "ex-tip", "先在心里说一遍，再点参考答案对照。");
    container.appendChild(tip);
  }

  window.Extras = { render: render };
})();
