// Service Worker：让页面断网也能打开（SPEC §5）
// 策略：网络优先，失败回缓存。理由：这个项目改得勤，网络优先才能保证"改完刷新就见到新版"；
// 缓存只是断网时的兜底，不做"缓存优先"那种要等两轮才更新的方案。
//
// 改 CACHE 里的版本号 = 换一个缓存空间，旧缓存会在下次激活时自动删掉。
const CACHE = "e850-v36";

// 只预缓存"第一屏必须有"的几个文件。带 ?v= 的资源由运行时缓存补（见 fetch）
const PRECACHE = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 只接管本站资源

  e.respondWith(
    fetch(req)
      .then(function (res) {
        // 联网成功就顺手更新缓存（?v= 变了也能覆盖成新文件）
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      })
      .catch(function () {
        // 断网：先找这个请求的缓存，找不到就给首页（保证不是白屏）
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          return caches.match("./index.html").then(function (home) {
            return home || new Response("离线，且这份内容没缓存过。", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
          });
        });
      })
  );
});
