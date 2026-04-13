/* ============================================================
   360 CHAT — NOTIFICATIONS.JS V2.1
   Drop-in notification system for chat.html.
   Pure JS — no CSS mixed in. Add notif styles to chat.css.

   HOW TO USE IN chat.html:
     1. Add <script src="../notifications.js"></script> before </body>
     2. See integration notes below — 2 small additions to chat.html's
        existing script block are all that's needed.
   ============================================================ */

(function () {
  "use strict";

  /* ── State ── */
  const state = {
    dnd:         JSON.parse(localStorage.getItem("360_chat_dnd")   || "false"),
    pushEnabled: JSON.parse(localStorage.getItem("360_push_enabled") || "false"),
    pushGranted: typeof Notification !== "undefined" && Notification.permission === "granted",
    unread:      JSON.parse(sessionStorage.getItem("360_unread")   || "{}"),
    activeRoom:  null,
  };

  /* ── Persist unread counts across renders ── */
  function saveUnread() {
    try { sessionStorage.setItem("360_unread", JSON.stringify(state.unread)); } catch(e) {}
  }

  /* ============================================================
     PUSH PERMISSION
  ============================================================ */
  async function requestPermission() {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") { state.pushGranted = true; return true; }
    if (Notification.permission === "denied")  return false;
    const p = await Notification.requestPermission();
    state.pushGranted = p === "granted";
    return state.pushGranted;
  }

  function sendPush(title, body, tag) {
    if (!state.pushEnabled || !state.pushGranted || document.hasFocus() || state.dnd) return;
    try {
      const n = new Notification(title, {
        body:  (body || "").slice(0, 120),
        icon:  "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag:   tag || "360-chat",
        renotify: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) { console.warn("Push notification failed:", e); }
  }

  /* ============================================================
     BADGE SYSTEM
  ============================================================ */
  function roomKey(room) {
    if (!room) return null;
    return `${room.type || "public"}:${room.id || "public"}`;
  }

  function incrementUnread(key) {
    if (!key) return;
    state.unread[key] = (state.unread[key] || 0) + 1;
    saveUnread();
    renderBadge(key);
    flashTitle();
  }

  function clearUnread(key) {
    if (!key) return;
    delete state.unread[key];
    saveUnread();
    renderBadge(key);
  }

  function renderBadge(key) {
    const count = state.unread[key] || 0;
    const els = findRoomElements(key);
    els.forEach(el => {
      let badge = el.querySelector(".notif-badge-360");
      if (count <= 0) { badge?.remove(); return; }
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "notif-badge-360";
        el.appendChild(badge);
        el.style.position = "relative";
      }
      badge.textContent = count > 99 ? "99+" : String(count);
    });
  }

  function renderAllBadges() {
    Object.keys(state.unread).forEach(key => renderBadge(key));
  }

  function findRoomElements(key) {
    const els = [];
    if (key === "public:public") {
      const el = document.getElementById("publicRoomItem");
      if (el) els.push(el);
    } else {
      const [type, id] = key.split(":");
      if (type === "dm") {
        const el = document.querySelector(`[data-dm-id="${id}"]`);
        if (el) els.push(el);
      } else {
        const el = document.querySelector(`[data-server-id="${id}"]`);
        if (el) els.push(el);
      }
    }
    return els;
  }

  /* ============================================================
     TAB TITLE FLASH
  ============================================================ */
  let flashInterval = null;

  function flashTitle() {
    if (document.hasFocus() || flashInterval) return;
    const orig = document.title;
    let t = 0;
    flashInterval = setInterval(() => {
      document.title = t++ % 2 === 0 ? "💬 New message!" : orig;
      if (t > 8 || document.hasFocus()) {
        clearInterval(flashInterval);
        flashInterval = null;
        document.title = orig;
      }
    }, 600);
  }

  window.addEventListener("focus", () => {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    document.title = document.title.replace("💬 New message!", "").trim() || "360 — Chat";
  });

  /* ============================================================
     TOAST
  ============================================================ */
  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "notif-toast-360";
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed", bottom: "80px", right: "20px",
      background: "rgba(15,23,42,.95)", color: "#fff",
      padding: "10px 18px", borderRadius: "10px",
      fontSize: "13px", fontWeight: "600",
      zIndex: "99999", pointerEvents: "none",
      boxShadow: "0 8px 24px rgba(0,0,0,.4)",
      animation: "notifSlideIn360 .2s ease",
    });
    document.head.insertAdjacentHTML("beforeend", `
      <style id="_notif_anim" once>
        @keyframes notifSlideIn360 {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      </style>`
    );
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  /* ============================================================
     DND TOGGLE
  ============================================================ */
  function initDNDToggle() {
    const btn = document.getElementById("dnd-toggle");
    if (!btn) return;
    btn.textContent = state.dnd ? "🔕 DnD On" : "🔔 DnD Off";
    btn.addEventListener("click", () => {
      state.dnd = !state.dnd;
      localStorage.setItem("360_chat_dnd", JSON.stringify(state.dnd));
      btn.textContent = state.dnd ? "🔕 DnD On" : "🔔 DnD Off";
      showToast(state.dnd ? "🔕 Do Not Disturb enabled" : "🔔 Notifications enabled");
    });
  }

  /* ============================================================
     NOTIF BUTTON (existing #notif-btn in chat.html)
     Piggybacks onto the existing button instead of requiring a new one
  ============================================================ */
  function initNotifButton() {
    const btn = document.getElementById("notif-btn");
    if (!btn) return;

    /* Sync initial state */
    if (state.pushEnabled && state.pushGranted) {
      btn.textContent = "🔔 On";
      btn.style.color = "#22c55e";
    }

    btn.addEventListener("click", async () => {
      if (state.pushEnabled) {
        /* Toggle off */
        state.pushEnabled = false;
        localStorage.setItem("360_push_enabled", "false");
        btn.textContent = "🔔 Notify";
        btn.style.color = "";
        showToast("Notifications off");
        return;
      }
      /* Request and toggle on */
      const granted = await requestPermission();
      if (granted) {
        state.pushEnabled = true;
        localStorage.setItem("360_push_enabled", "true");
        btn.textContent = "🔔 On";
        btn.style.color = "#22c55e";
        showToast("🔔 Notifications on!");
      } else {
        btn.textContent = "🔕 Blocked";
        btn.style.opacity = ".5";
        showToast("Notifications blocked in browser settings");
      }
    });
  }

  /* ============================================================
     PUBLIC API
     Call these from chat.html to integrate:

     // In switchRoom():
     window.ChatNotif.onRoomSwitch(room);

     // In renderMessage(), when loadRxn===true:
     window.ChatNotif.onMessage(msg, activeRoom, currentUserId);
  ============================================================ */
  window.ChatNotif = {

    /* Call whenever the user switches rooms */
    onRoomSwitch(room) {
      state.activeRoom = room;
      const key = roomKey(room);
      if (key) clearUnread(key);
    },

    /* Call for every incoming realtime message */
    onMessage(msg, activeRoom, currentUserId) {
      if (!msg) return;

      /* Determine which room this message belongs to */
      const msgRoomType = msg.dm_id      ? "dm"
                        : msg.server_id  ? "server"
                        : msg.channel_id ? "channel"
                        : "public";
      const msgRoomId   = msg.dm_id || msg.server_id || msg.channel_id || "public";
      const msgKey      = `${msgRoomType}:${msgRoomId}`;
      const curKey      = roomKey(activeRoom);
      const isOwn       = msg.user_id === currentUserId;

      if (isOwn) return;

      /* Push notification */
      if (!document.hasFocus() || msgKey !== curKey) {
        const isDM = msgRoomType === "dm";
        sendPush(
          isDM ? `DM from ${msg.username || "Someone"}` : `${msg.username || "Someone"} in ${activeRoom?.name || "360 Chat"}`,
          (msg.text || "📎 file").slice(0, 80),
          "360-chat-" + msgKey
        );
      }

      /* Unread badge — only for rooms NOT currently active */
      if (msgKey !== curKey) {
        incrementUnread(msgKey);
      }
    },

    /* Expose helpers for manual use */
    clearUnread,
    showToast,
    sendPush,
  };

  /* ============================================================
     INJECT BADGE CSS
  ============================================================ */
  function injectStyles() {
    if (document.getElementById("_notif360_styles")) return;
    const style = document.createElement("style");
    style.id = "_notif360_styles";
    style.textContent = `
      .notif-badge-360 {
        position: absolute;
        top: 5px;
        right: 7px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        background: linear-gradient(110deg, #3b82f6, #06b6d4);
        color: #050816;
        font-size: 10px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(59,130,246,.45);
        animation: badgePop360 .2s cubic-bezier(.175,.885,.32,1.275);
        pointer-events: none;
        z-index: 10;
      }
      @keyframes badgePop360 {
        from { transform: scale(0); }
        to   { transform: scale(1); }
      }
      .room-item, .dm-item { position: relative; }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     INIT
  ============================================================ */
  function init() {
    injectStyles();
    initNotifButton();
    initDNDToggle();
    renderAllBadges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ============================================================
     INTEGRATION SNIPPET — copy these 2 additions into chat.html

     ADDITION 1: Right after "switchRoom({type:'public'...})" in the
     INIT block, add:
       window.ChatNotif.onRoomSwitch(activeRoom);

     ADDITION 2: Inside switchRoom() function, at the top, add:
       window.ChatNotif?.onRoomSwitch(room);

     ADDITION 3: Inside renderMessage(), after the "if(loadRxn)" block,
     add:
       if (loadRxn && msg.user_id !== currentUserId) {
         window.ChatNotif?.onMessage(msg, activeRoom, currentUserId);
       }

     That's it — 3 one-liners and notifications are live.
  ============================================================ */

})();
