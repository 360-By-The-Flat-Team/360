/* ════════════════════════════════════════════════════════════════
   CHAT.HTML INTEGRATION PATCH — notifications.js bridge
   ────────────────────────────────────────────────────────────────
   Add these two <script> tags to chat.html:

   1. RIGHT BEFORE </body>:
      <script src="../notifications.js"></script>

   2. Inside chat.html's existing <script> block, find the line:
        switchRoom({type:"public",id:"public",name:"General",icon:"🌐"});
      and ADD these lines directly BEFORE it:

        // ── Notification bridge: expose room/user state to notifications.js ──
        const _origSwitchRoom = switchRoom;
        window.switchRoom = function(room, ...args) {
          _origSwitchRoom(room, ...args);
          window._activeRoomForNotif  = room;
          if (window.clearRoomUnread) clearRoomUnread(room);
          // mark unread dots on sidebar items
          document.querySelectorAll(".room-item,.dm-item").forEach(el => {
            el.classList.remove("has-unread");
          });
        };

   3. Inside the (async()=>{ INIT block, after:
        if(currentUserId) currentProfile=await getProfile(currentUserId);

      ADD:
        window._currentUserIdForNotif  = currentUserId;
        window._currentProfileForNotif = currentProfile;

   4. Inside sb.auth.onAuthStateChange callback, after:
        currentProfile=currentUserId?await getProfile(currentUserId):null;

      ADD:
        window._currentUserIdForNotif  = currentUserId;
        window._currentProfileForNotif = currentProfile;

   5. Inside the renderMessage function, at the VERY END (after the last line
      that reads: "if(loadRxn) {"), before the closing brace, ADD:

        // Update sidebar unread dot if not active room
        const activeKey = window._activeRoomForNotif
          ? `${window._activeRoomForNotif.type}:${window._activeRoomForNotif.id}`
          : null;
        const thisKey = `${activeRoom.type}:${activeRoom.id}`;
        if (loadRxn && activeKey && thisKey !== activeKey) {
          // mark room item as having unread
          const roomEl = document.querySelector(`[data-server-id="${activeRoom.id}"]`)
            || document.querySelector(`[data-dm-id="${activeRoom.id}"]`);
          if (roomEl) roomEl.classList.add("has-unread");
        }

   ────────────────────────────────────────────────────────────────
   That's all. The heavy lifting (sounds, badges, drawer, toasts,
   push notifications) is all inside notifications.js.
════════════════════════════════════════════════════════════════ */
