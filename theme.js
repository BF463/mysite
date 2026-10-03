/* theme.js — 全站主题色模块
 * 用法：在页面 <head> 里加 <script src="theme.js" defer></script>
 * 需要主题化的颜色用 var(--accent) / var(--accent-soft)
 */
(function () {
  "use strict";

  var STORE_KEY = "site_theme";
  var PRESETS = [
    { name: "橙",   accent: "#ff6622", soft: "#ffaa55" },
    { name: "青",   accent: "#22aaff", soft: "#66ccff" },
    { name: "绿",   accent: "#33cc77", soft: "#77ddaa" },
    { name: "紫",   accent: "#9a66ff", soft: "#c9a6ff" },
    { name: "粉",   accent: "#ff5599", soft: "#ff9ac2" },
    { name: "红",   accent: "#ff4444", soft: "#ff8888" },
    { name: "黄",   accent: "#e6b800", soft: "#ffdc66" },
    { name: "灰蓝", accent: "#5a7ea8", soft: "#9ab4d4" }
  ];

  /* ---------- 颜色工具 ---------- */
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  function rgbToHex(r, g, b) {
    var f = function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? "0" + s : s;
    };
    return "#" + f(r) + f(g) + f(b);
  }
  /* 浅色：朝白色插值 */
  function softOf(hex) {
    var c = hexToRgb(hex);
    return rgbToHex(c.r + (255 - c.r) * 0.42, c.g + (255 - c.g) * 0.42, c.b + (255 - c.b) * 0.42);
  }

  /* ---------- 应用主题 ---------- */
  function apply(accent, soft) {
    if (!soft) soft = softOf(accent);
    var root = document.documentElement.style;
    root.setProperty("--accent", accent);
    root.setProperty("--accent-soft", soft);
  }

  /* ---------- 读取已存 ---------- */
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) {}
  if (saved && saved.accent) apply(saved.accent, saved.soft);

  function save(accent, soft) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ accent: accent, soft: soft })); } catch (e) {}
    apply(accent, soft);
  }

  /* ---------- 面板 DOM ---------- */
  function buildPanel() {
    if (document.getElementById("themePanel")) return;

    var style = document.createElement("style");
    style.textContent =
      ".theme-fab{position:fixed;right:14px;bottom:14px;width:44px;height:44px;border-radius:50%;" +
      "border:1px solid #3a3a3a;background:#242424;color:var(--accent-soft);font-size:20px;" +
      "display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:900;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.5);transition:transform .12s;}" +
      ".theme-fab:active{transform:scale(.9);}" +
      ".theme-panel{position:fixed;right:14px;bottom:66px;z-index:901;background:#242424;" +
      "border:1px solid #3a3a3a;border-radius:14px;padding:14px;width:212px;" +
      "box-shadow:0 8px 28px rgba(0,0,0,.6);display:none;}" +
      ".theme-panel.show{display:block;animation:tp-in .16s ease;}" +
      "@keyframes tp-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}" +
      ".theme-panel h3{font-size:12px;color:#999;font-weight:500;margin:0 0 10px;letter-spacing:1px;}" +
      ".theme-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}" +
      ".theme-grid button{aspect-ratio:1;border-radius:10px;border:2px solid transparent;cursor:pointer;" +
      "transition:transform .1s;}" +
      ".theme-grid button:active{transform:scale(.9);}" +
      ".theme-grid button.on{border-color:#fff;}" +
      ".theme-row{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #333;}" +
      ".theme-row label{font-size:12px;color:#999;flex:1;}" +
      ".theme-row input[type=color]{width:34px;height:28px;border:1px solid #3a3a3a;border-radius:8px;" +
      "background:#1c1c1c;padding:2px;cursor:pointer;}";

    var fab = document.createElement("button");
    fab.className = "theme-fab";
    fab.type = "button";
    fab.title = "换主题色";
    fab.textContent = "🎨";

    var panel = document.createElement("div");
    panel.className = "theme-panel";
    panel.id = "themePanel";
    panel.innerHTML =
      '<h3>主题颜色</h3><div class="theme-grid" id="themeGrid"></div>' +
      '<div class="theme-row"><label>自定义</label>' +
      '<input type="color" id="themePick" value="#ff6622"></div>';

    document.head.appendChild(style);
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var grid = panel.querySelector("#themeGrid");
    var pick = panel.querySelector("#themePick");

    PRESETS.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.style.background = p.accent;
      b.title = p.name;
      b.addEventListener("click", function () {
        save(p.accent, p.soft);
        markActive(p.accent);
        pick.value = p.accent;
      });
      grid.appendChild(b);
    });

    function markActive(accent) {
      var kids = grid.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.toggle("on", PRESETS[i].accent.toLowerCase() === String(accent).toLowerCase());
      }
    }

    var cur = saved && saved.accent ? saved.accent : PRESETS[0].accent;
    pick.value = cur;
    markActive(cur);

    pick.addEventListener("input", function () {
      save(pick.value, softOf(pick.value));
      markActive(pick.value);
    });

    fab.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.classList.toggle("show");
    });
    document.addEventListener("click", function (e) {
      if (!panel.contains(e.target) && e.target !== fab) panel.classList.remove("show");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildPanel);
  } else {
    buildPanel();
  }
})();
