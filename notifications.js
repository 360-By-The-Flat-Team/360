/* =============================================
   UPDATED notifications.js (FULL REWRITE)
   ============================================= */

(function () {
  "use strict";

  const state = {
    dnd: JSON.parse(localStorage.getItem("360_chat_dnd") || "false"),
    unread: {},
    pushGranted: Notification.permission === "granted",
    pushEnabled: localStorage.getItem("360_push_enabled") === "true",
  };

  /* =========================
     PERMISSION + TOGGLE
  ========================= */
  async function requestPushPermission() {
    if (!("Notification" in window)) return;

    try {
      const perm = await Notification.requestPermission();
      state.pushGranted = perm === "granted";
    } catch (e) {
      console.error(e);
    }
  }

  function initToggle() {
    const toggle = document.getElementById("notif-toggle");
    if (!toggle) return;

    toggle.checked = state.pushEnabled;

    toggle.addEventListener("change", async (e) => {
      if (e.target.checked) {
        await requestPushPermission();

        if (Notification.permission === "granted") {
          state.pushEnabled = true;
          localStorage.setItem("360_push_enabled", "true");

          if (!document.hasFocus()) {
            sendPushNotification("Notifications ON!", "You're all set 🎉");
          } else {
            showToast("🔔 Notifications enabled");
          }
        } else {
          toggle.checked = false;
        }
      } else {
        state.pushEnabled = false;
        localStorage.setItem("360_push_enabled", "false");
        showToast("Notifications disabled");
      }
    });
  }

  /* =========================
     PUSH NOTIFICATIONS
  ========================= */
  function sendPushNotification(title, body, tag = "chat") {
    if (!state.pushEnabled || !state.pushGranted || document.hasFocus() || state.dnd) return;

    try {
      new Notification(title, {
        body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag,
      });
    } catch (e) {
      console.error(e);
    }
  }

  /* =========================
     UNREAD SYSTEM
  ========================= */
  function getKey(el) {
    if (el.dataset.serverId) return `server:${el.dataset.serverId}`;
    if (el.dataset.dmId) return `dm:${el.dataset.dmId}`;
    if (el.id === "publicRoomItem") return "public:public";
    return null;
  }

  function incrementUnread(key) {
    state.unread[key] = (state.unread[key] || 0) + 1;
    renderBadges();
  }

  function clearUnread(key) {
    delete state.unread[key];
    renderBadges();
  }

  function renderBadges() {
    document.querySelectorAll(".room-item, .dm-item, #publicRoomItem").forEach(el => {
      const key = getKey(el);
      if (!key) return;

      let badge = el.querySelector(".notif-badge");
      const count = state.unread[key] || 0;

      if (count <= 0) {
        badge?.remove();
        return;
      }

      if (!badge) {
        badge = document.createElement("div");
        badge.className = "notif-badge";
        el.appendChild(badge);
      }

      badge.textContent = count > 99 ? "99+" : count;
    });
  }

  /* =========================
     SIMPLE TOAST
  ========================= */
  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "simple-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
  }

  /* =========================
     HOOK INTO CHAT
  ========================= */
  window.ChatNotifications = {
    onMessage(room, message) {
      const key = `${room.type}:${room.id}`;

      if (!document.hasFocus()) {
        incrementUnread(key);
      }

      sendPushNotification(message.author, message.content, key);
    },

    onOpen(room) {
      const key = `${room.type}:${room.id}`;
      clearUnread(key);
    }
  };

  /* =========================
     INIT
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    initToggle();
  });
})();


/* =============================================
   ADD TO chat.css
   ============================================= */

/* BLUE BADGE */
.notif-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-item,
.dm-item {
  position: relative;
}

/* SIMPLE TOAST */
.simple-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #111;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
}



