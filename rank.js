/* rank.js — 全局排行榜（Supabase）
 * 用法：
 *   <script src="rank.js" defer></script>
 *   提交：Rank.submit('2048', score)
 *   弹层：Rank.openPanel() / 页面里放 <button onclick="Rank.openPanel()">
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://fmgrwyivvfcmktawvmlx.supabase.co";
  var SUPABASE_KEY = "sb_publishable_DrTXFdP4VmnzEHv4uoWxoA_7AdgYmfl";
  var TABLE = "scores";
  var API = SUPABASE_URL + "/rest/v1/" + TABLE;

  var LS_UID = "rank_uid";
  var LS_NAME = "rank_name";

  /* ---------- 身份 ---------- */
  function getUid() {
    var id = null;
    try { id = localStorage.getItem(LS_UID); } catch (e) {}
    if (!id) {
      id = "p_" + Math.random().toString(36).slice(2, 10) +
           Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(LS_UID, id); } catch (e) {}
    }
    return id;
  }

  function getName() {
    var n = null;
    try { n = localStorage.getItem(LS_NAME); } catch (e) {}
    return n || "";
  }

  function setName(n) {
    n = (n || "").trim().slice(0, 16);
    if (!n) n = "匿名玩家";
    try { localStorage.setItem(LS_NAME, n); } catch (e) {}
    return n;
  }

  /* ---------- 请求头 ---------- */
  function headers(extra) {
    var h = {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  /* ---------- 提交分数 ---------- */
  function submit(game, points) {
    points = Math.round(Number(points) || 0);
    if (points <= 0) return Promise.resolve(false);

    var body = {
      player_id: getUid(),
      player_name: getName() || "匿名玩家",
      game: String(game),
      points: points
    };

    return fetch(API, {
      method: "POST",
      headers: headers({ "Prefer": "return=minimal" }),
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.ok;
    }).catch(function () {
      return false;
    });
  }

  /* ---------- 拉榜 ---------- */
  /* 返回 { rows:[{id,name,total,games:{}}], mine:{rank,total} } */
  function fetchBoard() {
    var url = API + "?select=player_id,player_name,game,points&limit=5000";
    return fetch(url, { headers: headers(), cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) return { rows: [], mine: null };

        var map = {}; // player_id -> {name, games:{}}
        data.forEach(function (row) {
          var pid = row.player_id;
          if (!pid) return;
          if (!map[pid]) map[pid] = { id: pid, name: row.player_name || "匿名玩家", games: {} };
          if (row.player_name) map[pid].name = row.player_name;

          var g = row.game;
          var p = Number(row.points) || 0;
          map[pid].games[g] = Math.max(map[pid].games[g] || 0, p);
        });

        var rows = Object.keys(map).map(function (pid) {
          var o = map[pid];
          var total = 0;
          Object.keys(o.games).forEach(function (g) { total += o.games[g]; });
          return { id: o.id, name: o.name, total: total, games: o.games };
        });

        rows.sort(function (a, b) { return b.total - a.total; });

        var myId = getUid();
        var mine = null;
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].id === myId) { mine = { rank: i + 1, total: rows[i].total }; break; }
        }
        return { rows: rows, mine: mine };
      })
      .catch(function () { return { rows: [], mine: null }; });
  }

  /* ---------- 单游戏榜 ---------- */
  /* gameId 可选：snake / 2048 / memory / minesweeper / steak / fish
   * 返回 { sortedList:[{player_id,player_name,game,points}], myItem, myRank } */
  function getBoard(gameId) {
    var url = API + "?select=player_id,player_name,game,points" +
              "&game=eq." + encodeURIComponent(gameId) +
              "&order=points.desc&limit=1000";
    return fetch(url, { headers: headers(), cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) return { sortedList: [], myItem: null, myRank: null };

        var playerBest = {};
        data.forEach(function (row) {
          var pid = row.player_id;
          if (!pid) return;
          if (!playerBest[pid] || row.points > playerBest[pid].points) playerBest[pid] = row;
        });

        var sortedList = Object.keys(playerBest).map(function (pid) { return playerBest[pid]; })
          .sort(function (a, b) { return b.points - a.points; });

        var myId = getUid();
        var myIndex = -1;
        for (var i = 0; i < sortedList.length; i++) {
          if (sortedList[i].player_id === myId) { myIndex = i; break; }
        }
        return {
          sortedList: sortedList,
          myItem: myIndex === -1 ? null : sortedList[myIndex],
          myRank: myIndex === -1 ? null : myIndex + 1
        };
      })
      .catch(function () { return { sortedList: [], myItem: null, myRank: null }; });
  }

  /* ---------- 弹层 ---------- */
  var panel = null;

  function buildPanel() {
    if (panel) return panel;

    var css = document.createElement("style");
    css.textContent =
      "#rkFab{position:fixed;right:14px;bottom:14px;z-index:99998;width:52px;height:52px;border-radius:50%;" +
      "border:1px solid var(--accent,#ff6622);background:#242424;color:var(--accent-soft,#ffaa55);font-size:22px;" +
      "cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5);font-family:inherit;}" +
      "#rkFab:active{transform:scale(.94);}" +
      "#rkWrap{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:none;" +
      "align-items:center;justify-content:center;padding:18px;}" +
      "#rkWrap.show{display:flex;}" +
      "#rkBox{background:#1e1e1e;border:1px solid #333;border-radius:16px;width:100%;max-width:400px;" +
      "max-height:80vh;display:flex;flex-direction:column;overflow:hidden;font-family:inherit;}" +
      "#rkHead{padding:14px 16px;border-bottom:1px solid #2c2c2c;display:flex;justify-content:space-between;align-items:center;}" +
      "#rkHead b{color:#fff;font-size:16px;}" +
      "#rkClose{background:none;border:none;color:#888;font-size:22px;cursor:pointer;padding:0 4px;}" +
      "#rkMe{padding:12px 16px;border-bottom:1px solid #2c2c2c;font-size:13px;color:#bbb;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}" +
      "#rkMe input{flex:1;min-width:110px;background:#141414;border:1px solid #333;border-radius:8px;color:#eee;padding:7px 10px;font-family:inherit;font-size:13px;}" +
      "#rkMe button{background:#242424;border:1px solid var(--accent,#ff6622);color:var(--accent-soft,#ffaa55);border-radius:8px;padding:7px 12px;font-family:inherit;font-size:13px;cursor:pointer;}" +
      "#rkList{overflow-y:auto;padding:6px 0;}" +
      ".rkRow{display:flex;align-items:center;gap:10px;padding:9px 16px;font-size:14px;color:#ddd;}" +
      ".rkRow.hi{background:#2a1e14;color:#ffd0aa;}" +
      ".rkNo{width:26px;text-align:right;color:#777;font-size:13px;flex:none;}" +
      ".rkNm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".rkPt{color:var(--accent-soft,#ffaa55);font-weight:600;flex:none;}" +
      ".rkEmpty{padding:24px;text-align:center;color:#777;font-size:13px;}" +
      ".rkTag{font-size:11px;color:#888;margin-left:6px;font-weight:400;}";
    document.head.appendChild(css);

    panel = document.createElement("div");
    panel.id = "rkWrap";
    panel.innerHTML =
      '<div id="rkBox">' +
        '<div id="rkHead"><b>🏆 总排行榜</b><button id="rkClose">×</button></div>' +
        '<div id="rkMe">' +
          '<span>我的名字</span>' +
          '<input id="rkName" maxlength="16" placeholder="起个名" />' +
          '<button id="rkSave">保存</button>' +
        '</div>' +
        '<div id="rkList"><div class="rkEmpty">加载中…</div></div>' +
      '</div>';
    document.body.appendChild(panel);

    var fab = document.createElement("button");
    fab.id = "rkFab";
    fab.textContent = "🏆";
    fab.title = "排行榜";
    fab.addEventListener("click", openPanel);
    document.body.appendChild(fab);

    panel.addEventListener("click", function (e) {
      if (e.target === panel) closePanel();
    });
    panel.querySelector("#rkClose").addEventListener("click", closePanel);
    panel.querySelector("#rkSave").addEventListener("click", function () {
      var v = panel.querySelector("#rkName").value;
      setName(v);
      render();
    });

    return panel;
  }

  function openPanel() {
    buildPanel();
    panel.classList.add("show");
    var nm = panel.querySelector("#rkName");
    nm.value = getName();
    render();
  }

  function closePanel() {
    if (panel) panel.classList.remove("show");
  }

  function render() {
    var list = panel.querySelector("#rkList");
    var me = panel.querySelector("#rkMe");
    list.innerHTML = '<div class="rkEmpty">加载中…</div>';

    fetchBoard().then(function (res) {
      var rows = res.rows;
      var mine = res.mine;

      if (!rows.length) {
        list.innerHTML = '<div class="rkEmpty">还没有人上榜，去玩一局吧</div>';
        return;
      }

      var html = "";
      rows.slice(0, 50).forEach(function (r, i) {
        var cls = mine && (i + 1) === mine.rank ? "rkRow hi" : "rkRow";
        var games = Object.keys(r.games).map(function (g) {
          return g + " " + r.games[g];
        }).join(" · ");
        html += '<div class="' + cls + '">' +
          '<span class="rkNo">' + (i + 1) + '</span>' +
          '<span class="rkNm">' + esc(r.name) +
            (games ? '<span class="rkTag">' + esc(games) + '</span>' : '') +
          '</span>' +
          '<span class="rkPt">' + r.total + '</span>' +
        '</div>';
      });
      list.innerHTML = html;

      var myLine = mine
        ? "你第 " + mine.rank + " 名 · 总积分 " + mine.total
        : "你还没上榜";
      me.querySelector(".rkMyLine") && me.removeChild(me.querySelector(".rkMyLine"));
      var d = document.createElement("div");
      d.className = "rkMyLine";
      d.style.cssText = "width:100%;font-size:12px;color:#888;margin-top:2px;";
      d.textContent = myLine;
      me.appendChild(d);
    });
  }

  function esc(s) {
    var q = String.fromCharCode(34), amp = String.fromCharCode(38);
    var M = { "&": amp + "amp;", "<": amp + "lt;", ">": amp + "gt;", '"': amp + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) { return M[c]; });
  }

  window.Rank = {
    getUid: getUid,
    getName: getName,
    setName: setName,
    submit: submit,
    fetchBoard: fetchBoard,
    getBoard: getBoard,
    openPanel: openPanel
  };
})();
