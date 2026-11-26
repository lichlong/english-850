// 发音（SPEC §11.15）：只用浏览器自带的语音合成，不打包任何音频文件
// 设计口径：
//   1. 不支持就**不显示喇叭**（不报错、不占位），保证 HTML 与小红书沙箱都能跑
//   2. 只读英文；中文不读（学的是英语，读中文只会打断）
//   3. 用户点了才出声——iOS 也要求必须由手指触发，正好一致，不需要用户多做任何一步
(function () {
  "use strict";

  var has = typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance === "function";

  var voice = null;

  // 优先 en-US，其次 en-GB / en-AU，最后任何 en-*
  function pick() {
    if (!has) return null;
    if (voice) return voice;
    var vs = [];
    try { vs = window.speechSynthesis.getVoices() || []; } catch (e) { vs = []; }
    if (!vs.length) return null;
    var pref = ["en-us", "en-gb", "en-au", "en"];
    for (var i = 0; i < pref.length; i++) {
      for (var j = 0; j < vs.length; j++) {
        var lang = String(vs[j].lang || "").toLowerCase();
        if (lang.indexOf(pref[i]) === 0) { voice = vs[j]; return voice; }
      }
    }
    return null;
  }

  // 桌面 Chrome 的语音表是异步到的；iOS 常常第一次点击后才齐
  if (has) {
    pick();
    try {
      window.speechSynthesis.addEventListener("voiceschanged", function () { pick(); });
    } catch (e) {
      try { window.speechSynthesis.onvoiceschanged = pick; } catch (e2) {}
    }
  }

  function say(text) {
    if (!has) return false;
    var t = String(text == null ? "" : text).trim();
    if (!t) return false;
    try {
      var syn = window.speechSynthesis;
      syn.cancel(); // 连点两句时不排队念旧句
      var u = new window.SpeechSynthesisUtterance(t);
      var v = pick();
      u.lang = v ? v.lang : "en-US";
      if (v) u.voice = v;
      u.rate = 0.92;  // 略慢一点，方便跟读
      u.pitch = 1;
      syn.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  var SVG = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M4.2 9.4h3.1L11.8 6v12L7.3 14.6H4.2z"/>' +
    '<path d="M14.9 8.8a4.4 4.4 0 0 1 0 6.4"/>' +
    '<path d="M17.2 6.5a7.6 7.6 0 0 1 0 11"/></svg>';

  // 造一个喇叭按钮；不支持语音时返回 null，调用方直接不插
  function button(text, cls, label) {
    if (!has) return null;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "spk" + (cls ? " " + cls : "");
    b.innerHTML = SVG;
    b.setAttribute("aria-label", label || "朗读");
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      say(text);
      if (window.Store && window.Store.log) window.Store.log("speak", String(text).slice(0, 40));
    });
    return b;
  }

  // 塞进一段已有的容器里（拿不到按钮就什么也不做）
  function into(parent, text, cls, label) {
    var b = button(text, cls, label);
    if (b && parent) parent.appendChild(b);
    return b;
  }

  window.Speak = { ok: has, say: say, button: button, into: into };
})();
