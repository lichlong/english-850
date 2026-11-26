// 本地备份：导出 / 导入（SPEC §15.3）
// 不做后端，数据只有一份，所以给两个按钮：导出成文件、从文件恢复。
// 交互尽量少步：导出一下就得文件；导入选完文件、页内确认一次就恢复。
(function () {
  "use strict";

  var APP = "english-850";
  var FORMAT = 1;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function stamp() {
    var d = new Date();
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
  }

  // ---- 导出 ----
  function exportFile() {
    var data = window.Store.exportAll();
    var n = Object.keys(data).length;
    var payload = {
      app: APP,
      format: FORMAT,
      exportedAt: new Date().toISOString(),
      data: data
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "english-850-" + stamp() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    if (window.Toast) window.Toast(n ? "已导出 " + n + " 项记录" : "已导出（当前还没有记录）");
  }

  // ---- 导入 ----
  function readFile(file, done) {
    var fr = new FileReader();
    fr.onload = function () {
      var obj = null;
      try { obj = JSON.parse(String(fr.result)); } catch (e) { obj = null; }
      done(obj);
    };
    fr.onerror = function () { done(null); };
    fr.readAsText(file);
  }

  function askConfirm(body, text, onYes) {
    body.innerHTML = "";
    var p = el("p", "bk-ask", text);
    var yes = el("button", "bk-btn bk-yes", "确定恢复");
    var no = el("button", "bk-btn", "取消");
    yes.type = "button";
    no.type = "button";
    yes.addEventListener("click", onYes);
    no.addEventListener("click", function () {
      document.getElementById("sub").classList.remove("on");
    });
    body.appendChild(p);
    body.appendChild(yes);
    body.appendChild(no);
  }

  function openImport() {
    var input = document.getElementById("file-import");
    if (input) input.click();
  }

  function handleFile(file) {
    if (!file) return;
    readFile(file, function (obj) {
      var body = document.getElementById("sub-body");
      document.getElementById("sub-title").textContent = "导入备份";
      document.getElementById("sub").classList.add("on");

      if (!obj || obj.app !== APP || !obj.data) {
        body.innerHTML = "";
        body.appendChild(el("div", "bk-ask", "这个文件不是 english-850 的备份，没有改动任何内容。"));
        return;
      }

      var n = Object.keys(obj.data).length;
      var when = obj.exportedAt ? obj.exportedAt.slice(0, 10) : "未知日期";
      askConfirm(
        body,
        "备份时间 " + when + "，共 " + n + " 项记录。恢复会用这份备份覆盖当前进度，确定吗？",
        function () {
          window.Store.importAll(obj.data);
          if (window.Toast) window.Toast("已恢复，正在刷新");
          window.setTimeout(function () { window.location.reload(); }, 500);
        }
      );
    });
  }

  function boot() {
    var bExp = document.getElementById("btn-export");
    var bImp = document.getElementById("btn-import");
    var input = document.getElementById("file-import");
    if (bExp) bExp.addEventListener("click", exportFile);
    if (bImp) bImp.addEventListener("click", openImport);
    if (input) {
      input.addEventListener("change", function () {
        handleFile(input.files && input.files[0]);
        input.value = "";
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.Backup = { exportFile: exportFile, handleFile: handleFile };
})();
