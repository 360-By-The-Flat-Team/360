/* ════════════════════════════════════════════════════════════════
   360 CHAT — NOTIFICATIONS.JS V1.0
   Drop this AFTER main.js and chat's inline <script> block.

   Features:
     • Browser Push Notifications (with permission request)
     • In-app toast notifications for @mentions and DMs
     • Unread badge counters on rooms + DM items
     • Unread dot on tab favicon
     • Notification bell button (top-right of chat header)
     • Notification history drawer (last 20 notifications)
     • Do-Not-Disturb toggle
     • Sound alerts (reuses existing click-sound.mp3 + a soft ping)
════════════════════════════════════════════════════════════════ */

(function initChatNotifications() {
  "use strict";

  /* ── State ── */
  const state = {
    dnd: JSON.parse(localStorage.getItem("360_chat_dnd") || "false"),
    unread: {},          // roomKey -> count
    notifHistory: JSON.parse(localStorage.getItem("360_notif_history") || "[]"),
    pushGranted: Notification.permission === "granted",
    drawerOpen: false,
  };

  /* ── Ping audio (soft 440Hz tone via Web Audio) ── */
  let audioCtx = null;
  function ping(vol = 0.18) {
    if (state.dnd) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  }

  /* ════════════════════════════════════════
     PUSH NOTIFICATIONS
  ════════════════════════════════════════ */
  function requestPushPermission() {
    if (!("Notification" in window) || state.pushGranted) return;
    Notification.requestPermission().then(perm => {
      state.pushGranted = perm === "granted";
      if (state.pushGranted) showInAppToast("🔔 Push notifications enabled!", "success");
      renderBell();
    });
  }

  function sendPushNotification(title, body, tag = "chat") {
    if (!state.pushGranted || document.hasFocus() || state.dnd) return;
    try {
      new Notification(title, {
        body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag,
        requireInteraction: false,
        silent: false,
      });
    } catch {}
  }

  /* ════════════════════════════════════════
     UNREAD COUNTERS
  ════════════════════════════════════════ */
  function getRoomKey(room) {
    return `${room.type}:${room.id}`;
  }

  function incrementUnread(roomKey) {
    state.unread[roomKey] = (state.unread[roomKey] || 0) + 1;
    renderAllUnreadBadges();
    updateFaviconDot();
  }

  function clearUnread(roomKey) {
    delete state.unread[roomKey];
    renderAllUnreadBadges();
    updateFaviconDot();
  }

  function totalUnread() {
    return Object.values(state.unread).reduce((a, b) => a + b, 0);
  }

  function renderBadge(el, count) {
    let badge = el.querySelector(".notif-badge");
    if (!count) { badge?.remove(); return; }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "notif-badge";
      el.appendChild(badge);
    }
    badge.textContent = count > 99 ? "99+" : count;
  }

  function renderAllUnreadBadges() {
    /* Room items */
    document.querySelectorAll(".room-item[data-server-id], #publicRoomItem, .dm-item").forEach(el => {
      let key = null;
      if (el.id === "publicRoomItem") key = "public:public";
      else if (el.dataset.serverId)   key = `server:${el.dataset.serverId}`;
      else if (el.dataset.dmId)       key = `dm:${el.dataset.dmId}`;
      if (key) renderBadge(el, state.unread[key] || 0);
    });
    /* Bell button total */
    const bellBtn = document.getElementById("notif-bell-btn");
    if (bellBtn) renderBadge(bellBtn, totalUnread());
  }

  /* ── Favicon dot ── */
  let origTitle = document.title;
  function updateFaviconDot() {
    const total = totalUnread();
    const canvas = document.createElement("canvas");
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "/favicon-32x32.png";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);
      if (total > 0) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(26, 6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(total > 9 ? "9+" : total, 26, 6);
      }
      let link = document.querySelector("link[rel='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = canvas.toDataURL();
    };
    img.onerror = () => {};
    document.title = total > 0 ? `(${total}) ${origTitle}` : origTitle;
  }

  /* ════════════════════════════════════════
     NOTIFICATION HISTORY
  ════════════════════════════════════════ */
  function addNotifToHistory(n) {
    state.notifHistory.unshift({ ...n, ts: Date.now() });
    if (state.notifHistory.length > 50) state.notifHistory.pop();
    localStorage.setItem("360_notif_history", JSON.stringify(state.notifHistory));
    renderNotifDrawer();
  }

  function formatRelTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  /* ════════════════════════════════════════
     IN-APP TOAST
  ════════════════════════════════════════ */
  function showInAppToast(msg, type = "info", duration = 3500) {
    if (state.dnd && type !== "success" && type !== "error") return;
    const t = document.createElement("div");
    t.className = `notif-toast notif-toast--${type}`;
    t.innerHTML = `<span class="notif-toast-msg">${msg}</span><button class="notif-toast-close">✕</button>`;
    t.querySelector(".notif-toast-close").onclick = () => t.remove();
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("notif-toast--visible"));
    setTimeout(() => { t.classList.remove("notif-toast--visible"); setTimeout(() => t.remove(), 350); }, duration);
  }

  /* ════════════════════════════════════════
     CORE: HANDLE INCOMING MESSAGE
     Called by the chat system for every new message
  ════════════════════════════════════════ */
  window.handleChatNotification = function(msg, activeRoom, currentUserId, currentProfile) {
    const roomKey = getRoomKey(activeRoom);
    const isActiveRoom = document.hasFocus() && !document.hidden;
    const isMention = currentProfile && msg.text &&
      new RegExp(`@${currentProfile.username}\\b`, "i").test(msg.text);
    const isDM = activeRoom?.type === "dm";
    const isOwnMsg = msg.user_id === currentUserId;

    if (isOwnMsg) return; // never notify for own messages

    /* Increment unread if not the active, visible room */
    if (!isActiveRoom) {
      incrementUnread(roomKey);
    }

    /* ── Mention notification ── */
    if (isMention) {
      ping(0.22);
      const notif = {
        type: "mention",
        title: `@Mention from ${msg.username}`,
        body: msg.text?.slice(0, 120) || "",
        room: activeRoom.name,
        icon: "🔔",
      };
      addNotifToHistory(notif);
      showInAppToast(`🔔 <strong>${msg.username}</strong> mentioned you in <strong>#${activeRoom.name}</strong>`, "mention", 5000);
      sendPushNotification(notif.title, notif.body, `mention-${msg.id}`);
    }
    /* ── DM notification ── */
    else if (isDM && !isActiveRoom) {
      ping(0.15);
      const notif = {
        type: "dm",
        title: `DM from ${msg.username}`,
        body: msg.text?.slice(0, 120) || (msg.file_url ? "📎 Attachment" : ""),
        room: "Direct Message",
        icon: "💬",
      };
      addNotifToHistory(notif);
      showInAppToast(`💬 <strong>${msg.username}</strong>: ${notif.body.slice(0, 60) || "sent a file"}`, "dm", 5000);
      sendPushNotification(notif.title, notif.body, `dm-${msg.id}`);
    }
    /* ── General new message (only if room is not focused) ── */
    else if (!isActiveRoom) {
      const notif = {
        type: "message",
        title: `${msg.username} in #${activeRoom.name}`,
        body: msg.text?.slice(0, 80) || "📎 File",
        room: activeRoom.name,
        icon: "💬",
      };
      addNotifToHistory(notif);
    }
  };

  /* ── Clear unread when user switches to a room ── */
  window.clearRoomUnread = function(room) {
    clearUnread(getRoomKey(room));
  };

  /* ════════════════════════════════════════
     NOTIFICATION BELL UI
  ════════════════════════════════════════ */
  function injectBellStyles() {
    if (document.getElementById("notif-styles")) return;
    const style = document.createElement("style");
    style.id = "notif-styles";
    style.textContent = `
      /* Badge */
      .notif-badge {
        position: absolute;
        top: -5px; right: -5px;
        min-width: 18px; height: 18px;
        padding: 0 4px;
        border-radius: 999px;
        background: #ef4444;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        line-height: 1;
        pointer-events: none;
        border: 2px solid var(--bg, #fff);
        box-shadow: 0 1px 4px rgba(0,0,0,.25);
        animation: badgePop .25s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes badgePop {
        from { transform: scale(0); }
        to   { transform: scale(1); }
      }

      /* Room items need relative pos for badge */
      .room-item, .dm-item, #notif-bell-btn { position: relative; }

      /* ── Bell button ── */
      #notif-bell-btn {
        width: 36px; height: 36px;
        border-radius: 10px;
        border: 1px solid var(--glass-border, rgba(255,255,255,.12));
        background: var(--glass-bg, rgba(255,255,255,.08));
        backdrop-filter: blur(8px);
        cursor: pointer;
        font-size: 17px;
        display: flex; align-items: center; justify-content: center;
        color: inherit;
        flex-shrink: 0;
        transition: background .15s;
        margin-left: 8px;
      }
      #notif-bell-btn:hover { background: var(--glass-bg-hover, rgba(255,255,255,.15)); }
      #notif-bell-btn.ringing { animation: bellRing .5s ease; }
      @keyframes bellRing {
        0%,100% { transform: rotate(0); }
        20%     { transform: rotate(-18deg); }
        40%     { transform: rotate(18deg); }
        60%     { transform: rotate(-10deg); }
        80%     { transform: rotate(10deg); }
      }

      /* ── DND toggle ── */
      #notif-dnd-btn {
        width: 36px; height: 36px;
        border-radius: 10px;
        border: 1px solid var(--glass-border, rgba(255,255,255,.12));
        background: var(--glass-bg, rgba(255,255,255,.08));
        cursor: pointer;
        font-size: 15px;
        display: flex; align-items: center; justify-content: center;
        color: inherit;
        flex-shrink: 0;
        transition: background .15s, border-color .15s;
        margin-left: 6px;
      }
      #notif-dnd-btn:hover { background: var(--glass-bg-hover, rgba(255,255,255,.15)); }
      #notif-dnd-btn.dnd-on { border-color: #ef4444; background: rgba(239,68,68,.12); }

      /* ── Notification drawer ── */
      #notif-drawer {
        position: fixed;
        top: 50px; right: 0;
        width: 320px;
        max-height: calc(100vh - 60px);
        background: var(--glass-bg-strong, rgba(15,23,42,.97));
        backdrop-filter: blur(20px);
        border-left: 1px solid var(--glass-border, rgba(255,255,255,.12));
        border-bottom: 1px solid var(--glass-border, rgba(255,255,255,.12));
        border-bottom-left-radius: 16px;
        box-shadow: -8px 8px 40px rgba(0,0,0,.35);
        z-index: 400;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform .28s cubic-bezier(.4,0,.2,1);
        overflow: hidden;
      }
      #notif-drawer.open { transform: translateX(0); }

      #notif-drawer-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid var(--glass-border, rgba(255,255,255,.1));
        flex-shrink: 0;
      }
      #notif-drawer-header span {
        font-size: 13px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .08em; opacity: .6;
      }
      #notif-clear-btn {
        font-size: 11px; color: #ef4444; background: none; border: none;
        cursor: pointer; opacity: .7; padding: 2px 6px; border-radius: 6px;
      }
      #notif-clear-btn:hover { opacity: 1; background: rgba(239,68,68,.1); }

      #notif-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #notif-list::-webkit-scrollbar { width: 4px; }
      #notif-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 999px; }

      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.07);
        animation: slideInRight .2s ease;
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(12px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .notif-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
      .notif-content { flex: 1; min-width: 0; }
      .notif-title {
        font-size: 13px; font-weight: 700;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        color: #fff;
      }
      .notif-body {
        font-size: 12px; color: rgba(255,255,255,.55);
        margin-top: 2px; line-height: 1.45;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .notif-time { font-size: 10px; color: rgba(255,255,255,.3); margin-top: 3px; }
      .notif-empty {
        text-align: center; padding: 40px 16px;
        font-size: 13px; color: rgba(255,255,255,.3);
      }

      /* ── Unread divider inside chat ── */
      .unread-count-divider {
        display: flex; align-items: center; gap: 8px;
        margin: 10px 0 4px; font-size: 11px;
        color: #3b82f6; font-weight: 700;
        animation: fadeIn .3s ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .unread-count-divider::before, .unread-count-divider::after {
        content: ""; flex: 1; height: 1px; background: #3b82f6; opacity: .35;
      }

      /* ── Toast notifications ── */
      .notif-toast {
        position: fixed;
        bottom: 90px; right: 16px;
        min-width: 260px; max-width: 340px;
        padding: 12px 36px 12px 14px;
        border-radius: 12px;
        background: rgba(15,23,42,.96);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 8px 32px rgba(0,0,0,.35);
        font-size: 13px; color: #fff;
        z-index: 9999;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity .25s ease, transform .25s ease;
        pointer-events: all;
      }
      .notif-toast--visible { opacity: 1; transform: translateY(0); }
      .notif-toast--mention { border-color: rgba(59,130,246,.5); background: rgba(10,20,50,.97); }
      .notif-toast--dm      { border-color: rgba(168,85,247,.4); background: rgba(20,10,40,.97); }
      .notif-toast--success { border-color: rgba(34,197,94,.5); }
      .notif-toast--error   { border-color: rgba(239,68,68,.5); }
      .notif-toast-close {
        position: absolute; top: 8px; right: 8px;
        background: none; border: none; color: rgba(255,255,255,.4);
        cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 5px;
        border-radius: 4px;
      }
      .notif-toast-close:hover { color: #fff; background: rgba(255,255,255,.1); }
      .notif-toast-msg strong { color: #93c5fd; }

      /* Unread dot on room items in sidebar */
      .room-item.has-unread .room-name::after,
      .dm-item.has-unread .dm-name::after {
        content: "";
        display: inline-block;
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--a, #3b82f6);
        margin-left: 6px;
        vertical-align: middle;
        box-shadow: 0 0 6px var(--a, #3b82f6);
      }

      @media (max-width: 600px) {
        #notif-drawer { width: 100vw; }
        .notif-toast { right: 8px; left: 8px; min-width: auto; max-width: none; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Render bell + DND buttons into chat header ── */
  function injectBellButton() {
    const header = document.querySelector(".chat-header");
    if (!header || document.getElementById("notif-bell-btn")) return;

    const bellBtn = document.createElement("button");
    bellBtn.id = "notif-bell-btn";
    bellBtn.title = "Notifications";
    bellBtn.textContent = "🔔";
    bellBtn.style.transform = "none";

    const dndBtn = document.createElement("button");
    dndBtn.id = "notif-dnd-btn";
    dndBtn.title = "Do Not Disturb";
    dndBtn.textContent = state.dnd ? "🔕" : "🔔";
    if (state.dnd) dndBtn.classList.add("dnd-on");

    header.appendChild(bellBtn);
    header.appendChild(dndBtn);

    /* Push permission on first bell click */
    bellBtn.addEventListener("click", e => {
      e.stopPropagation();
      requestPushPermission();
      toggleDrawer();
    });

    dndBtn.addEventListener("click", e => {
      e.stopPropagation();
      state.dnd = !state.dnd;
      localStorage.setItem("360_chat_dnd", JSON.stringify(state.dnd));
      dndBtn.textContent = state.dnd ? "🔕" : "🔔";
      dndBtn.classList.toggle("dnd-on", state.dnd);
      showInAppToast(state.dnd ? "🔕 Do Not Disturb ON" : "🔔 Notifications ON", "success", 2000);
    });
  }

  /* ── Notification drawer ── */
  function injectDrawer() {
    if (document.getElementById("notif-drawer")) return;
    const drawer = document.createElement("div");
    drawer.id = "notif-drawer";
    drawer.innerHTML = `
      <div id="notif-drawer-header">
        <span>🔔 Notifications</span>
        <button id="notif-clear-btn">Clear all</button>
      </div>
      <div id="notif-list"></div>
    `;
    document.body.appendChild(drawer);

    document.getElementById("notif-clear-btn").onclick = () => {
      state.notifHistory = [];
      localStorage.setItem("360_notif_history", "[]");
      renderNotifDrawer();
    };

    /* Close on outside click */
    document.addEventListener("click", e => {
      const drawer = document.getElementById("notif-drawer");
      const bell = document.getElementById("notif-bell-btn");
      if (drawer && !drawer.contains(e.target) && e.target !== bell) {
        drawer.classList.remove("open");
        state.drawerOpen = false;
      }
    });

    renderNotifDrawer();
  }

  function renderNotifDrawer() {
    const list = document.getElementById("notif-list");
    if (!list) return;
    if (!state.notifHistory.length) {
      list.innerHTML = `<div class="notif-empty">No notifications yet.<br>You'll see mentions and DMs here.</div>`;
      return;
    }
    list.innerHTML = state.notifHistory.slice(0, 30).map(n => `
      <div class="notif-item">
        <span class="notif-icon">${n.icon || "💬"}</span>
        <div class="notif-content">
          <div class="notif-title">${n.title || ""}</div>
          <div class="notif-body">${n.body || ""}</div>
          <div class="notif-time">${formatRelTime(n.ts)} · #${n.room || "general"}</div>
        </div>
      </div>
    `).join("");
  }

  function toggleDrawer() {
    const drawer = document.getElementById("notif-drawer");
    if (!drawer) return;
    state.drawerOpen = !state.drawerOpen;
    drawer.classList.toggle("open", state.drawerOpen);
    if (state.drawerOpen) renderNotifDrawer();
    ringBell();
  }

  function renderBell() {
    const bellBtn = document.getElementById("notif-bell-btn");
    if (!bellBtn) return;
    if (!state.pushGranted) {
      bellBtn.title = "Click to enable push notifications";
    }
    renderAllUnreadBadges();
  }

  function ringBell() {
    const bellBtn = document.getElementById("notif-bell-btn");
    if (!bellBtn) return;
    bellBtn.classList.remove("ringing");
    void bellBtn.offsetWidth; // reflow
    bellBtn.classList.add("ringing");
    setTimeout(() => bellBtn.classList.remove("ringing"), 600);
  }

  /* ════════════════════════════════════════
     MONKEY-PATCH: intercept chat's renderMessage
     to fire notifications
  ════════════════════════════════════════ */
  function patchRenderMessage() {
    /* We watch for new messages arriving via the real-time channel
       by observing DOM mutations on #chat-window.
       This avoids touching the original renderMessage code. */
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    /* Observe for new .chat-message nodes */
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mut => {
        mut.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (!node.classList.contains("chat-message")) return;

          const userId  = node.dataset.userId;
          const msgText = node.querySelector(".msg-text")?.textContent || "";
          const username = node.querySelector(".msg-username")?.textContent?.split("[")[0].trim() || "Someone";

          /* Build a lightweight pseudo-msg object */
          const pseudoMsg = {
            id: node.dataset.msgId,
            user_id: userId,
            username,
            text: msgText,
          };

          /* Access globals set by chat's inline script */
          const activeRoom   = window._activeRoomForNotif || { type:"public", id:"public", name:"General" };
          const currentUserId = window._currentUserIdForNotif;
          const currentProfile = window._currentProfileForNotif;

          if (window.handleChatNotification) {
            window.handleChatNotification(pseudoMsg, activeRoom, currentUserId, currentProfile);
          }
        });
      });
    });

    observer.observe(chatWindow, { childList: true });
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init() {
    injectBellStyles();

    /* Wait for chat header to exist (may be instant or after short delay) */
    const tryInject = () => {
      if (document.querySelector(".chat-header")) {
        injectBellButton();
        injectDrawer();
        renderBell();
        renderAllUnreadBadges();
        patchRenderMessage();

        /* Ask for push permission automatically (once, quietly) */
        if (Notification.permission === "default") {
          setTimeout(requestPushPermission, 4000);
        }
      } else {
        setTimeout(tryInject, 300);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryInject);
    } else {
      tryInject();
    }
  }

  init();
})();
