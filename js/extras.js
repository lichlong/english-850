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
    container.appendChild(el("div", "ex-title", data.read.title));
    var body = el("div", "ex-read");
    data.read.paragraphs.forEach(function (p) {
      body.appendChild(el("p", null, p.en));
    });
    container.appendChild(body);

    // 课外练习
    container.appendChild(el("h3", "ex-h", "课外练习"));
    var list = el("div", "ex-quiz");
    data.quiz.forEach(function (q, i) {
      list.appendChild(quizItem(q, i));
    });
    container.appendChild(list);

    var tip = el("div", "ex-tip", "先在心里说一遍，再点参考答案对照。");
    container.appendChild(tip);
  }

  window.Extras = { render: render };
})();
