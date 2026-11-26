// 注册离线缓存（SPEC §5）。只在 http/https 下注册，直接双击 index.html 时跳过。
(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      // 注册失败不影响正常使用，只是没有离线能力
    });
  });
})();
