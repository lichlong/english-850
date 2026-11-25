// 点赞 / 收藏：只切状态、记事件，不做任何算法
(function () {
  "use strict";

  function bind(root, id, meta) {
    var btns = root.querySelectorAll(".ico");
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var kind = b.getAttribute("data-a");
        var on = window.Store.toggleMark(id, kind, meta);
        b.classList.toggle("on", on);
      });
    });
  }

  window.Actions = { bind: bind };
})();
