// 渲染：条目、标号、中英开关、点词查义
(function () {
  "use strict";

  var popup = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function findWord(raw) {
    var w = String(raw).toLowerCase();
    // 所有格 father's / fathers' → father
    if (/'s$/.test(w)) w = w.slice(0, -2);
    else w = w.replace(/'+$/, "");
    if (window.WORDS[w]) return w;
    if (window.WORD_ALLOWED && window.WORD_ALLOWED[w]) return w;
    if (window.WORD_DEVIATION && window.WORD_DEVIATION[w]) return w;
    if (window.WORD_FORMS[w]) {
      var b = window.WORD_FORMS[w];
      if (window.WORDS[b] || (window.WORD_DEVIATION && window.WORD_DEVIATION[b])) return b;
    }

    var cands = [
      w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
      w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/ed$/, "e"),
      w.replace(/ing$/, ""), w.replace(/ing$/, "e"), w.replace(/ly$/, "")
    ];
    for (var i = 0; i < cands.length; i++) {
      if (cands[i] && window.WORDS[cands[i]]) return cands[i];
    }
    return null;
  }

  function tokenize(text) {
    var re = /[A-Za-z']+/g;
    var out = "";
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      out += esc(text.slice(last, m.index));
      var w = m[0];
      var base = findWord(w);
      out += '<span class="w" data-w="' + esc(base || w.toLowerCase()) + '">' + esc(w) + "</span>";
      last = m.index + w.length;
    }
    out += esc(text.slice(last));
    return out;
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var SVG_LIKE = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.4A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7 3.3c0 5-7 9.4-7 9.4z"/></svg>';
  var SVG_SAVE = '<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-4-5 4z"/></svg>';

  function closePopup() {
    if (popup) {
      popup.remove();
      popup = null;
    }
  }

  function showPopup(word, x, y) {
    closePopup();
    var info = (window.WORDS && window.WORDS[word]) ||
      (window.WORD_ALLOWED && window.WORD_ALLOWED[word]) ||
      (window.WORD_DEVIATION && window.WORD_DEVIATION[word]);
    var id = "w:" + word;
    var saved = window.Store.getMark(id, "save");

    popup = el("div", "popup");
    var html = '<div class="pop-top"><span class="pop-word">' + esc(word) + "</span>";
    if (info && info.ipa) html += '<span class="pop-ipa">' + esc(info.ipa) + "</span>";
    html += '<button class="pop-save-mini' + (saved ? " on" : "") +
      '" type="button" aria-label="收藏">' + SVG_SAVE + "</button></div>";

    if (info) {
      html += '<div class="pop-zh">' + esc(info.zh) + "</div>";
      if (info.full) html += '<div class="pop-full">' + esc(info.full) + "</div>";
    } else {
      html += '<div class="pop-empty">这个词还不在词表里。</div>';
    }

    popup.innerHTML = html;
    document.body.appendChild(popup);

    var r = popup.getBoundingClientRect();
    var left = x - r.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - r.width - 10));
    var top = y - r.height - 14;
    if (top < 10) top = y + 26;

    popup.style.left = left + "px";
    popup.style.top = top + "px";

    var mini = popup.querySelector(".pop-save-mini");
    mini.addEventListener("click", function (e) {
      e.stopPropagation();
      var on = window.Store.toggleMark(id, "save", { word: word });
      mini.classList.toggle("on", on);
    });
  }

  function zhButton(item) {
    var b = el("button", "tg");
    b.type = "button";
    b.textContent = "英";
    b.addEventListener("click", function () {
      var on = item.classList.toggle("show");
      b.classList.toggle("on", on);
      b.textContent = on ? "中/英" : "英";
    });
    return b;
  }

  function actsRow(id, meta) {
    var row = el("div", "acts");
    var like = el("button", "ico like" + (window.Store.getMark(id, "like") ? " on" : ""), SVG_LIKE);
    var save = el("button", "ico save" + (window.Store.getMark(id, "save") ? " on" : ""), SVG_SAVE);
    like.type = save.type = "button";
    like.setAttribute("data-a", "like");
    save.setAttribute("data-a", "save");
    like.setAttribute("aria-label", "赞");
    save.setAttribute("aria-label", "收藏");
    row.appendChild(like);
    row.appendChild(save);
    window.Actions.bind(row, id, meta);
    return row;
  }

  function sentenceItem(kind, num, obj, id, meta) {
    var item = el("div", "item");
    item.setAttribute("data-kind", kind);
    item.setAttribute("data-item", id);

    var row = el("div", "row");
    row.appendChild(el("span", "num", String(num)));
    row.appendChild(el("p", "txt", tokenize(obj.en)));
    row.appendChild(zhButton(item));
    item.appendChild(row);

    item.appendChild(el("p", "zh", esc(obj.zh)));
    item.appendChild(actsRow(id, meta));
    return item;
  }

  function storyItem(unit, num) {
    var id = unit.id + "-p";
    var item = el("div", "item");
    item.setAttribute("data-kind", "story");
    item.setAttribute("data-item", id);

    var head = el("div", "story-head");
    head.appendChild(el("span", "num", String(num)));
    head.appendChild(el("h2", "story-title", esc(unit.passage.title)));
    head.appendChild(zhButton(item));
    item.appendChild(head);

    unit.passage.paragraphs.forEach(function (p) {
      var para = el("div", "para");
      para.appendChild(el("p", "en", tokenize(p.en)));
      para.appendChild(el("p", "zh", esc(p.zh)));
      item.appendChild(para);
    });

    item.appendChild(actsRow(id, { unit: unit.id }));
    return item;
  }

  document.addEventListener("click", function (e) {
    var t = e.target;

    if (t.classList && t.classList.contains("w")) {
      window.Store.touchWord(t.getAttribute("data-w"));
      showPopup(t.getAttribute("data-w"), e.clientX, e.clientY);
      return;
    }

    if (popup && !popup.contains(t)) closePopup();
  });

  // 通用可点文本块：课外拓展的原文与简说都用它，交给全局 .w 点击处理查词
  function textBlock(text, cls) {
    return el("p", cls || "en", tokenize(text));
  }

  window.Reader = {
    sentenceItem: sentenceItem,
    storyItem: storyItem,
    textBlock: textBlock,
    closePopup: closePopup
  };
})();
