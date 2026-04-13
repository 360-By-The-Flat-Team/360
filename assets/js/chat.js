// 360 Chat v2.0.4 — modernized engine
// Assumes global `sb` (Supabase client) from main.js

/* ════════════════ GLOBAL STATE ════════════════ */
let currentUserId   = null;
let currentProfile  = null;
let activeRoom      = { type: "public", id: "public", name: "General", icon: "🌐" };
let msgElMap        = new Map();
let replyingTo      = null;
let pendingFile     = null;
let isSending       = false;
let typingChannel   = null;
let typingUsers     = {};
let lastMsgDate     = null;
let lastMsgUserId   = null;

const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥','💀','🎉','✨','💯','🚀','⭐','👀','🙏','💪','🤖','😊','🥺','🤣','😅','😱'];

/* ════════════════ UTILS ════════════════ */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
}
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" });
}
function isImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.split("?")[0]);
}
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function applyShortcodes(text) {
  return text; // placeholder for future emoji shortcodes
}
function filterProfanity(text) {
  return text; // hook for profanity filter
}

/* ════════════════ ROOM + DATA HELPERS ════════════════ */
async function getProfile(uid) {
  const { data } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
  return data || { id: uid, username: "User", role: "user" };
}

async function loadCommunities() {
  const list = document.getElementById("communities-list");
  list.innerHTML = "";
  if (!currentUserId) return;
  const { data: mems } = await sb
    .from("server_members")
    .select("server_id,servers(name)")
    .eq("user_id", currentUserId)
    .order("server_id");
  (mems || []).forEach(m => {
    const btn = document.createElement("button");
    btn.className = "room-item";
    btn.dataset.serverId = m.server_id;
    btn.innerHTML = `<span class="room-icon">🏠</span><span class="room-name">${m.servers.name}</span>`;
    btn.addEventListener("click", () => {
      switchRoom({ type:"server", id:m.server_id, name:m.servers.name, icon:"🏠" });
    });
    list.appendChild(btn);
  });
}

async function loadDMs() {
  const list = document.getElementById("dm-list");
  list.innerHTML = "";
  if (!currentUserId) return;
  const { data } = await sb
    .from("direct_messages")
    .select("*")
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
    .order("updated_at", { ascending:false });
  (data || []).forEach(dm => {
    const otherId = dm.user_a === currentUserId ? dm.user_b : dm.user_a;
    const btn = document.createElement("button");
    btn.className = "room-item";
    btn.dataset.dmId = dm.id;
    btn.innerHTML = `<span class="room-icon">💬</span><span class="room-name">${dm.other_username || "DM"}</span>`;
    btn.addEventListener("click", () => {
      switchRoom({ type:"dm", id:dm.id, name:dm.other_username || "DM", icon:"💬" });
    });
    list.appendChild(btn);
  });
}

async function startDMByEmail(email) {
  const errEl = document.getElementById("dm-error");
  errEl.textContent = "";
  if (!email) { errEl.textContent = "Email required."; return; }
  const { data: user } = await sb.from("profiles").select("*").eq("email", email).maybeSingle();
  if (!user) { errEl.textContent = "User not found."; return; }
  if (user.id === currentUserId) { errEl.textContent = "You can't DM yourself."; return; }

  const { data: existing } = await sb
    .from("direct_messages")
    .select("*")
    .or(`and(user_a.eq.${currentUserId},user_b.eq.${user.id}),and(user_a.eq.${user.id},user_b.eq.${currentUserId})`)
    .maybeSingle();

  let dm = existing;
  if (!dm) {
    const { data: created, error } = await sb
      .from("direct_messages")
      .insert({
        user_a: currentUserId,
        user_b: user.id,
        other_username: user.username || email
      })
      .select()
      .single();
    if (error) { errEl.textContent = error.message; return; }
    dm = created;
  }

  document.getElementById("startDmModal").classList.remove("open");
  await loadDMs();
  switchRoom({ type:"dm", id:dm.id, name:user.username || email, icon:"💬" });
}

async function handleCommunityClick(server) {
  // If passcode protected and not member, show join modal
  const { data: mem } = await sb
    .from("server_members")
    .select("id")
    .eq("server_id", server.id)
    .eq("user_id", currentUserId)
    .maybeSingle();
  if (!mem) {
    const modal = document.getElementById("joinCommunityModal");
    document.getElementById("jc-name").textContent = server.name;
    document.getElementById("jc-passcode").value = "";
    document.getElementById("jc-error").textContent = "";
    modal.classList.add("open");
    joinPending = server;
    return;
  }
  await enterCommunity(server);
}

async function joinCommunity(server, passcode) {
  const errEl = document.getElementById("jc-error");
  errEl.textContent = "";
  if (server.passcode && server.passcode !== passcode) {
    errEl.textContent = "Incorrect passcode.";
    return;
  }
  const { error } = await sb
    .from("server_members")
    .insert({ server_id: server.id, user_id: currentUserId });
  if (error && !/duplicate/i.test(error.message)) {
    errEl.textContent = error.message;
    return;
  }
  document.getElementById("joinCommunityModal").classList.remove("open");
  await loadCommunities();
  await enterCommunity(server);
}

async function enterCommunity(server) {
  switchRoom({ type:"server", id:server.id, name:server.name, icon:"🏠" });
}

/* ════════════════ RENDER MESSAGE ════════════════ */
function renderMessage(msg, loadRxn = true) {
  const r = activeRoom;
  if (r.type === "public") {
    if (msg.channel_id || msg.dm_id || msg.server_id) return;
  } else if (r.type === "channel") {
    if (String(msg.channel_id) !== String(r.id)) return;
  } else if (r.type === "server") {
    if (String(msg.server_id) !== String(r.id)) return;
  } else if (r.type === "dm") {
    if (String(msg.dm_id) !== String(r.id)) return;
  }
  if (msgElMap.has(String(msg.id))) return;

  const win = document.getElementById("chat-window");
  const msgDate = formatDate(msg.created_at);
  if (msgDate !== lastMsgDate) {
    const d = document.createElement("div");
    d.className = "date-divider";
    d.textContent = msgDate;
    win.appendChild(d);
    lastMsgDate = msgDate;
    lastMsgUserId = null;
  }

  const grouped = msg.user_id === lastMsgUserId;
  lastMsgUserId = msg.user_id;

  const el = document.createElement("div");
  el.className = "chat-message" + (grouped ? " grouped" : "");
  el.dataset.msgId = msg.id;
  el.dataset.userId = msg.user_id || "";

  const roleBadge = msg.role && msg.role !== "user"
    ? `<span class="role-badge role-${msg.role}">${msg.role}</span>`
    : "";
  const tagBadge = msg.tag ? `<span class="user-tag">[${msg.tag}]</span>` : "";
  const rawText = (msg.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeText = rawText.replace(/@(\w+)/g, (match, name) => {
    const isMe = currentProfile && name.toLowerCase() === (currentProfile.username || "").toLowerCase();
    return `<span class="mention-highlight${isMe ? " mine" : ""}">${match}</span>`;
  });

  let replyHTML = "";
  if (msg.reply_to_id && msg.reply_to_text) {
    const sr = (msg.reply_to_text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    replyHTML = `<div class="reply-quote" data-jump="${msg.reply_to_id}">
      <span class="rq-author">${msg.reply_to_username || "Unknown"}</span>
      <span class="rq-text">${sr}</span>
    </div>`;
  }

  const avatarHTML = msg.avatar_url
    ? `<img class="chat-avatar" src="${msg.avatar_url}" data-uid="${msg.user_id}" alt="" onerror="this.outerHTML='<div class=\\'chat-avatar initials\\' data-uid=\\'${msg.user_id}\\'>${getInitials(msg.username)}</div>'">`
    : `<div class="chat-avatar initials" data-uid="${msg.user_id}">${getInitials(msg.username)}</div>`;

  let attachHTML = "";
  if (msg.file_url) {
    if (isImage(msg.file_url)) {
      attachHTML = `<img class="msg-image" src="${msg.file_url}" alt="image" loading="lazy" />`;
    } else {
      const fn = decodeURIComponent(msg.file_url.split("/").pop().split("?")[0]);
      attachHTML = `<a class="msg-file" href="${msg.file_url}" target="_blank">📎 ${fn}</a>`;
    }
  }

  el.innerHTML = `
    ${avatarHTML}
    <div class="msg-body">
      ${!grouped ? `<div class="msg-meta">
        <span class="msg-username">${msg.username || "Unknown"}${tagBadge}${roleBadge}</span>
        <span class="msg-time">${formatTime(msg.created_at)}</span>
      </div>` : ""}
      ${replyHTML}
      ${safeText ? `<div class="msg-text">${safeText}</div>` : ""}
      ${attachHTML}
      <div class="reactions-row" id="reactions-${msg.id}"></div>
    </div>
    <div class="msg-actions">
      <button class="msg-action-btn" data-reply="${msg.id}" title="Reply">↩️</button>
      <button class="msg-action-btn" data-react="${msg.id}" title="React">😊</button>
      ${currentUserId === msg.user_id ? `<button class="msg-action-btn" data-delete="${msg.id}" title="Delete">🗑️</button>` : ""}
    </div>
  `;

  el.querySelectorAll(".chat-avatar").forEach(av => {
    av.addEventListener("click", e => {
      e.stopPropagation();
      // hook: showProfilePopup(av.dataset.uid, av);
    });
  });

  el.querySelectorAll(".reply-quote").forEach(q => {
    q.addEventListener("click", () => {
      const t = msgElMap.get(String(q.dataset.jump));
      if (t) {
        t.scrollIntoView({ behavior:"smooth", block:"center" });
        t.style.background = "rgba(59,130,246,.15)";
        setTimeout(() => { t.style.background = ""; }, 1500);
      }
    });
  });

  const replyBtn = el.querySelector(`[data-reply="${msg.id}"]`);
  if (replyBtn) {
    replyBtn.addEventListener("click", e => {
      e.stopPropagation();
      replyingTo = {
        id: msg.id,
        username: msg.username,
        text: msg.text || (msg.file_url ? "📎 file" : "")
      };
      document.getElementById("rb-author").textContent = msg.username;
      document.getElementById("rb-text").textContent = replyingTo.text;
      document.getElementById("reply-bar").classList.add("show");
      document.getElementById("message-input").focus();
    });
  }

  const reactBtn = el.querySelector(`[data-react="${msg.id}"]`);
  const picker = buildMsgEmojiPicker(msg.id);
  reactBtn.style.position = "relative";
  reactBtn.appendChild(picker);
  reactBtn.addEventListener("click", e => {
    e.stopPropagation();
    picker.classList.toggle("open");
  });

  const delBtn = el.querySelector(`[data-delete="${msg.id}"]`);
  if (delBtn) delBtn.addEventListener("click", () => deleteMessage(msg.id));

  const img = el.querySelector(".msg-image");
  if (img) {
    img.addEventListener("click", () => {
      document.getElementById("lightbox-img").src = img.src;
      document.getElementById("lightbox").classList.add("open");
    });
  }

  document.getElementById("chat-window").appendChild(el);
  msgElMap.set(String(msg.id), el);

  if (loadRxn && msg.text && currentProfile) {
    const mentioned = new RegExp("@" + currentProfile.username + "\\b", "i").test(msg.text);
    if (mentioned && msg.user_id !== currentUserId) {
      const pingAudio = new Audio("../click-sound.mp3");
      pingAudio.volume = 0.6;
      pingAudio.play().catch(() => {});
      const origTitle = document.title;
      let flash = 0;
      const fi = setInterval(() => {
        document.title = flash++ % 2 === 0 ? "🔔 Mentioned!" : origTitle;
        if (flash > 6) { clearInterval(fi); document.title = origTitle; }
      }, 500);
    }
  }

  if (msg.text) maybeTranslateMessage(el, msg.text);

  if (loadRxn) {
    loadReactionsSingle(msg.id);
    const w = document.getElementById("chat-window");
    if (w.scrollHeight - w.scrollTop - w.clientHeight < 300) scrollBottom();
  }
}

/* ════════════════ REACTIONS ════════════════ */
function buildMsgEmojiPicker(msgId) {
  const p = document.createElement("div");
  p.className = "emoji-picker";
  EMOJIS.forEach(em => {
    const b = document.createElement("button");
    b.className = "emoji-opt";
    b.textContent = em;
    b.addEventListener("click", e => {
      e.stopPropagation();
      toggleReaction(msgId, em);
      p.classList.remove("open");
    });
    p.appendChild(b);
  });
  return p;
}

async function loadReactionsSingle(msgId) {
  const { data } = await sb.from("reactions").select("emoji,user_id").eq("message_id", msgId);
  if (data) renderReactions(msgId, data);
}

function renderReactions(msgId, reactions) {
  const el = msgElMap.get(String(msgId));
  const row = el?.querySelector(`#reactions-${msgId}`) || document.getElementById(`reactions-${msgId}`);
  if (!row) return;
  const g = {};
  reactions.forEach(r => { (g[r.emoji] = g[r.emoji] || []).push(r.user_id); });
  row.innerHTML = "";
  Object.entries(g).forEach(([em, users]) => {
    const pill = document.createElement("div");
    pill.className = "reaction-pill" + (users.includes(currentUserId) ? " mine" : "");
    pill.innerHTML = `${em}<span class="r-count">${users.length}</span>`;
    pill.addEventListener("click", () => toggleReaction(msgId, em));
    row.appendChild(pill);
  });
}

async function toggleReaction(msgId, emoji) {
  if (!currentUserId) { openAuth(); return; }
  const { data: ex } = await sb
    .from("reactions")
    .select("id")
    .eq("message_id", msgId)
    .eq("user_id", currentUserId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (ex) {
    await sb
      .from("reactions")
      .delete()
      .eq("message_id", msgId)
      .eq("user_id", currentUserId)
      .eq("emoji", emoji);
  } else {
    await sb.from("reactions").insert({ message_id: msgId, user_id: currentUserId, emoji });
  }
  loadReactionsSingle(msgId);
}

/* ════════════════ TYPING ════════════════ */
function renderTyping() {
  const el = document.getElementById("typing-indicator");
  const users = Object.values(typingUsers);
  if (!users.length) { el.innerHTML = ""; return; }
  const names = users.map(u => u.username).join(", ");
  const label = users.length === 1
    ? `${names} is typing`
    : users.length <= 3
      ? `${names} are typing`
      : `${users.length} people are typing`;
  const avHTML = users
    .slice(0, 3)
    .map(u => `<div class="typing-avatar">${getInitials(u.username)}</div>`)
    .join("");
  el.innerHTML = `
    <div class="typing-avatars">${avHTML}</div>
    <div class="typing-dots"><span></span><span></span><span></span></div>
    <span>${label}</span>
  `;
}

/* ════════════════ FILE UPLOAD ════════════════ */
document.getElementById("attachBtn").addEventListener("click", () =>
  document.getElementById("fileInput").click()
);

document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  pendingFile = file;
  document.getElementById("up-name").textContent = file.name;
  const thumb = document.getElementById("up-thumb");
  if (file.type.startsWith("image/")) {
    const r = new FileReader();
    r.onload = ev => {
      thumb.innerHTML = `<img src="${ev.target.result}" style="max-height:48px;border-radius:6px;" />`;
    };
    r.readAsDataURL(file);
  } else {
    thumb.innerHTML = "📎";
  }
  document.getElementById("upload-preview").classList.add("show");
  e.target.value = "";
});

document.getElementById("upload-cancel").addEventListener("click", clearUpload);

function clearUpload() {
  pendingFile = null;
  document.getElementById("upload-preview").classList.remove("show");
  document.getElementById("up-thumb").innerHTML = "";
  document.getElementById("up-name").textContent = "";
}

async function uploadFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const uid = currentUserId || "anon";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const prog = document.getElementById("upload-progress");
  const bar = document.getElementById("upload-progress-bar");
  prog.classList.add("show");
  bar.style.width = "40%";
  const { error } = await sb.storage.from("chat-uploads").upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  bar.style.width = "100%";
  setTimeout(() => { prog.classList.remove("show"); bar.style.width = "0%"; }, 500);
  if (error) { alert("Upload failed: " + error.message); return null; }
  const { data: urlData } = sb.storage.from("chat-uploads").getPublicUrl(path);
  return urlData?.publicUrl || null;
}

/* ════════════════ REPLY BAR ════════════════ */
document.getElementById("reply-cancel").addEventListener("click", () => {
  replyingTo = null;
  document.getElementById("reply-bar").classList.remove("show");
});

/* ════════════════ INPUT EMOJI PICKER ════════════════ */
const inputPicker = document.getElementById("inputEmojiPicker");
EMOJIS.forEach(em => {
  const b = document.createElement("button");
  b.className = "emoji-opt";
  b.textContent = em;
  b.addEventListener("click", e => {
    e.stopPropagation();
    const inp = document.getElementById("message-input");
    const pos = inp.selectionStart;
    inp.value = inp.value.slice(0, pos) + em + inp.value.slice(pos);
    inp.focus();
    inputPicker.classList.remove("open");
  });
  inputPicker.appendChild(b);
});

document.getElementById("emojiBtn").addEventListener("click", e => {
  e.stopPropagation();
  inputPicker.classList.toggle("open");
});

document.addEventListener("click", () => {
  inputPicker.classList.remove("open");
  document.querySelectorAll(".emoji-picker.open").forEach(p => p.classList.remove("open"));
});

/* Auto-resize */
const msgInput = document.getElementById("message-input");
msgInput.addEventListener("input", () => {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
});

/* Typing broadcast */
let typingDebounce;
msgInput.addEventListener("input", () => {
  if (!currentUserId || !typingChannel) return;
  clearTimeout(typingDebounce);
  typingDebounce = setTimeout(() => {
    const p = currentProfile;
    if (!p) return;
    typingChannel.send({
      type: "broadcast",
      event: "typing",
      payload: { username: p.username, avatar_url: p.avatar_url, uid: currentUserId }
    });
  }, 200);
});

/* ════════════════ SEND ════════════════ */
let slowModeSeconds = 0;
let lastSentTime    = 0;

async function sendMessage() {
  if (isSending) return;

  if (slowModeSeconds > 0) {
    const elapsed = (Date.now() - lastSentTime) / 1000;
    if (elapsed < slowModeSeconds) {
      showToast(`🐌 Slow mode — wait ${Math.ceil(slowModeSeconds - elapsed)}s`);
      return;
    }
  }

  const text = msgInput.value.trim();
  if (!text && !pendingFile) return;

  const { data:{ session } } = await sb.auth.getSession();
  if (!session) { openAuth(); return; }

  const p = currentProfile || await getProfile(session.user.id);
  if (text.startsWith("/")) {
    await runCommand(text, p);
    msgInput.value = "";
    msgInput.style.height = "auto";
    return;
  }

  isSending = true;
  document.getElementById("send-button").disabled = true;

  try {
    let fileUrl = null;
    if (pendingFile) {
      fileUrl = await uploadFile(pendingFile);
      if (fileUrl === null) return;
      clearUpload();
    }

    const payload = {
      user_id: session.user.id,
      username: p.username || session.user.email,
      avatar_url: p.avatar_url || null,
      tag: p.tag || null,
      role: p.role || "user",
      text: filterProfanity(applyShortcodes(text)),
      file_url: fileUrl
    };

    if (replyingTo) {
      payload.reply_to_id = replyingTo.id;
      payload.reply_to_username = replyingTo.username;
      payload.reply_to_text = (replyingTo.text || "").slice(0, 100);
      replyingTo = null;
      document.getElementById("reply-bar").classList.remove("show");
    }

    if (activeRoom.type === "dm") {
      payload.dm_id = activeRoom.id;
      const { error } = await sb.from("dm_messages").insert(payload);
      if (error) { console.error("Send:", error.message); alert("Error: " + error.message); return; }
      await sb
        .from("direct_messages")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeRoom.id);
    } else {
      if (activeRoom.type === "channel") payload.channel_id = activeRoom.id;
      if (activeRoom.type === "server") {
        try { payload.server_id = activeRoom.id; } catch {}
      }
      const { error } = await sb.from("messages").insert(payload);
      if (error) { console.error("Send:", error.message); alert("Error: " + error.message); return; }
    }

    msgInput.value = "";
    msgInput.style.height = "auto";
    lastSentTime = Date.now();
  } finally {
    isSending = false;
    document.getElementById("send-button").disabled = false;
  }
}

/* ════════════════ DELETE ════════════════ */
async function deleteMessage(msgId) {
  if (!confirm("Delete this message?")) return;
  if (activeRoom.type === "dm") {
    await sb.from("dm_messages").delete().eq("id", msgId);
  } else {
    await sb.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", msgId);
  }
  msgElMap.get(String(msgId))?.remove();
  msgElMap.delete(String(msgId));
}

/* ════════════════ SLASH COMMANDS ════════════════ */
const SLASH_COMMANDS = [
  { cmd:"/me",        args:"<action>",            desc:"Send an action message",       adminOnly:false, modAllowed:false },
  { cmd:"/shrug",     args:"",                    desc:"¯\\_(ツ)_/¯",                  adminOnly:false, modAllowed:false },
  { cmd:"/tableflip", args:"",                    desc:"(╯°□°）╯︵ ┻━┻",              adminOnly:false, modAllowed:false },
  { cmd:"/unflip",    args:"",                    desc:"┬─┬ ノ( ゜-゜ノ)",             adminOnly:false, modAllowed:false },
  { cmd:"/lenny",     args:"",                    desc:"( ͡° ͜ʖ ͡°)",                 adminOnly:false, modAllowed:false },
  { cmd:"/clear",     args:"",                    desc:"Clear your local chat view",   adminOnly:false, modAllowed:false },
  { cmd:"/help",      args:"",                    desc:"Show available commands",      adminOnly:false, modAllowed:false },
  { cmd:"/warn",      args:"<user> <msg>|<msg>",  desc:"Warn a user or broadcast",     adminOnly:true,  modAllowed:true  },
  { cmd:"/mute",      args:"<user> <time> <s|m>", desc:"Mute a user",                  adminOnly:true,  modAllowed:true  },
  { cmd:"/promote",   args:"<user>",              desc:"Promote user to mod",          adminOnly:true,  modAllowed:false },
  { cmd:"/demote",    args:"<user>",              desc:"Demote user to member",        adminOnly:true,  modAllowed:false },
  { cmd:"/ban",       args:"<user>",              desc:"Ban a user",                   adminOnly:true,  modAllowed:false },
  { cmd:"/unban",     args:"<user>",              desc:"Unban a user",                 adminOnly:true,  modAllowed:false },
  { cmd:"/tag",       args:"<user> <tag>",        desc:"Set a custom tag on a user",   adminOnly:true,  modAllowed:false },
  { cmd:"/role",      args:"<user> <role>",       desc:"Set role (user/mod/admin)",    adminOnly:true,  modAllowed:false },
  { cmd:"/delete",    args:"<message_id>",        desc:"Delete a message by ID",       adminOnly:true,  modAllowed:false },
  { cmd:"/announce",  args:"<message>",           desc:"Send a bold announcement",     adminOnly:true,  modAllowed:false },
  { cmd:"/kick",      args:"<user>",              desc:"Remove user from community",   adminOnly:true,  modAllowed:false },
  { cmd:"/slow",      args:"<seconds>",           desc:"Set slow mode (0 to disable)", adminOnly:true,  modAllowed:false }
];

async function runCommand(text, profile) {
  const parts = text.trim().split(" ");
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);

  const isAdmin = profile.role === "admin";
  const isMod   = profile.role === "mod" || isAdmin;

  const userCommands  = ["/me","/shrug","/tableflip","/unflip","/lenny","/clear","/help"];
  const modCommands   = ["/warn","/mute"];
  const adminCommands = ["/promote","/demote","/ban","/unban","/tag","/role","/delete","/announce","/kick","/slow"];

  if (userCommands.includes(cmd)) {
    // ok
  } else if (modCommands.includes(cmd)) {
    if (!isMod) { showToast("❌ Mods and admins only."); return; }
  } else if (adminCommands.includes(cmd)) {
    if (!isAdmin) { showToast("❌ Admins only."); return; }
  } else {
    showToast("❌ Unknown command. Type /help for a list.");
    return;
  }

  /* ── All-user commands ── */
  if (cmd === "/me") {
    if (!args.length) return;
    const { data:{ session } } = await sb.auth.getSession();
    await sb.from("messages").insert({
      user_id: session.user.id,
      username: profile.username,
      avatar_url: profile.avatar_url || null,
      role: profile.role || "user",
      text: `_${profile.username} ${filterProfanity(args.join(" "))}_`,
      ...(activeRoom.type === "channel" ? { channel_id: activeRoom.id } : {}),
      ...(activeRoom.type === "server" ? { server_id: activeRoom.id } : {})
    });
    return;
  }
  if (cmd === "/shrug")     { msgInput.value = "¯\\_(ツ)_/¯";     return; }
  if (cmd === "/tableflip") { msgInput.value = "(╯°□°）╯︵ ┻━┻"; return; }
  if (cmd === "/unflip")    { msgInput.value = "┬─┬ ノ( ゜-゜ノ)"; return; }
  if (cmd === "/lenny")     { msgInput.value = "( ͡° ͜ʖ ͡°)";     return; }
  if (cmd === "/clear")     { document.getElementById("chat-window").innerHTML = ""; msgElMap.clear(); return; }
  if (cmd === "/help") {
    const list = SLASH_COMMANDS
      .filter(c => !c.adminOnly || isAdmin || (isMod && c.modAllowed))
      .map(c => `${c.cmd} ${c.args} — ${c.desc}`)
      .join("\n");
    alert("Available commands:\n\n" + list);
    return;
  }

  /* ── Mod + Admin ── */
  if (cmd === "/warn") {
    if (!args[0]) { showToast("Usage: /warn <user> <message>  or  /warn <message>"); return; }
    const { data: matched } = await sb.from("profiles").select("username").eq("username", args[0]).maybeSingle();
    if (matched) {
      const warnMsg = args.slice(1).join(" ");
      if (!warnMsg) { showToast("Usage: /warn <user> <message>"); return; }
      await sb.from("messages").insert({
        user_id:"system", username:"System", avatar_url:null, tag:"warn",
        text:`⚠️ Warning to ${args[0]}: ${warnMsg} — issued by ${profile.username}`, role:"admin",
        ...(activeRoom.type === "channel" ? { channel_id: activeRoom.id } : {}),
        ...(activeRoom.type === "server" ? { server_id: activeRoom.id } : {})
      });
      showToast(`⚠️ Warning issued to ${args[0]}`);
    } else {
      await sb.from("messages").insert({
        user_id:"system", username:"System", avatar_url:null, tag:"warn",
        text:`⚠️ Warning to all: ${args.join(" ")} — issued by ${profile.username}`, role:"admin",
        ...(activeRoom.type === "channel" ? { channel_id: activeRoom.id } : {}),
        ...(activeRoom.type === "server" ? { server_id: activeRoom.id } : {})
      });
      showToast("⚠️ Broadcast warning sent");
    }
    return;
  }

  if (cmd === "/mute") {
    const targetUser = args[0];
    const timeVal = parseInt(args[1]);
    const unit = (args[2] || "s").toLowerCase();
    if (!targetUser || isNaN(timeVal)) { showToast("Usage: /mute <user> <time> <s|m>"); return; }
    if (!["s","m"].includes(unit))     { showToast("Unit must be 's' or 'm'."); return; }
    const durationMs   = unit === "m" ? timeVal * 60000 : timeVal * 1000;
    const mutedUntilTs = new Date(Date.now() + durationMs).toISOString();
    const { error } = await sb.from("profiles").update({ muted_until: mutedUntilTs }).eq("username", targetUser);
    if (error) { showToast(`Error: ${error.message}`); return; }
    const dur = unit === "m" ? `${timeVal}m` : `${timeVal}s`;
    await sb.from("messages").insert({
      user_id:"system", username:"System", avatar_url:null, tag:null,
      text:`🔇 ${targetUser} muted for ${dur} by ${profile.username}`, role:"admin",
      ...(activeRoom.type === "channel" ? { channel_id: activeRoom.id } : {}),
      ...(activeRoom.type === "server" ? { server_id: activeRoom.id } : {})
    });
    showToast(`🔇 Muted ${targetUser} for ${dur}`);
    return;
  }

  /* ── Admin-only ── */
  if (cmd === "/promote")  { await sb.from("profiles").update({ role:"mod" }).eq("username", args[0]);   showToast(`✅ Promoted ${args[0]} to mod`); }
  else if (cmd === "/demote")   { await sb.from("profiles").update({ role:"user" }).eq("username", args[0]);  showToast(`✅ Demoted ${args[0]}`); }
  else if (cmd === "/ban")      { await sb.from("profiles").update({ banned:true }).eq("username", args[0]);  showToast(`🚫 Banned ${args[0]}`); }
  else if (cmd === "/unban")    { await sb.from("profiles").update({ banned:false }).eq("username", args[0]); showToast(`✅ Unbanned ${args[0]}`); }
  else if (cmd === "/tag") {
    const tag = args.slice(1).join(" ");
    await sb.from("profiles").update({ tag }).eq("username", args[0]);
    showToast(`🏷️ Tagged ${args[0]}: ${tag}`);
  }
  else if (cmd === "/role") {
    const [targetUser, newRole] = args;
    if (!targetUser || !newRole) { showToast("Usage: /role <user> <role>"); return; }
    const valid = ["user","mod","admin"];
    if (!valid.includes(newRole.toLowerCase())) { showToast(`Invalid role. Valid: ${valid.join(", ")}`); return; }
    const { error } = await sb.from("profiles").update({ role:newRole.toLowerCase() }).eq("username", targetUser);
    if (error) { showToast(`Error: ${error.message}`); return; }
    showToast(`✅ Set ${targetUser}'s role to ${newRole.toLowerCase()}`);
  }
  else if (cmd === "/delete") {
    const id = parseInt(args[0]);
    if (!id) { showToast("Usage: /delete <message_id>"); return; }
    await sb.from("messages").update({ deleted_at:new Date().toISOString() }).eq("id", id);
    msgElMap.get(String(id))?.remove();
    msgElMap.delete(String(id));
    showToast("🗑️ Message deleted");
  }
  else if (cmd === "/announce") {
    const { data:{ session } } = await sb.auth.getSession();
    await sb.from("messages").insert({
      user_id: session.user.id,
      username: profile.username,
      avatar_url: profile.avatar_url || null,
      role: profile.role,
      text: `📢 **${args.join(" ")}**`,
      ...(activeRoom.type === "channel" ? { channel_id: activeRoom.id } : {}),
      ...(activeRoom.type === "server" ? { server_id: activeRoom.id } : {})
    });
  }
  else if (cmd === "/kick") {
    await sb
      .from("server_members")
      .delete()
      .eq("user_id", args[0])
      .eq("server_id", activeRoom.serverId || activeRoom.id);
    showToast(`👢 Kicked ${args[0]}`);
  }
  else if (cmd === "/slow") {
    slowModeSeconds = parseInt(args[0]) || 0;
    showToast(slowModeSeconds ? `🐌 Slow mode: ${slowModeSeconds}s` : "✅ Slow mode disabled");
  }
}

/* Toast */
function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:rgba(15,23,42,.95);color:#fff;padding:8px 18px;border-radius:999px;
    font-size:13px;font-weight:600;z-index:9999;pointer-events:none;
    animation:toastIn .2s ease;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ════════════════ AUTO-TRANSLATE ════════════════ */
const translateCache = {};

async function translateText(text, targetLang) {
  if (!text || !targetLang) return null;
  const key = `${targetLang}:${text}`;
  if (translateCache[key]) return translateCache[key];
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
    const res  = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || translated === text) return null;
    translateCache[key] = translated;
    return translated;
  } catch {
    return null;
  }
}

async function maybeTranslateMessage(el, originalText) {
  const lang = document.getElementById("translateLang")?.value;
  if (!lang || !originalText) return;
  if (originalText.trim().length < 3) return;
  const translated = await translateText(originalText, lang);
  if (!translated) return;
  const textDiv = el.querySelector(".msg-text");
  if (!textDiv) return;
  if (el.querySelector(".msg-translation")) return;
  const pill = document.createElement("div");
  pill.className = "msg-translation";
  pill.style.cssText = "font-size:12px;color:var(--mut);margin-top:3px;font-style:italic;";
  pill.textContent = "⟳ " + translated;
  textDiv.after(pill);
}

document.getElementById("translateLang")?.addEventListener("change", () => {
  const lang = document.getElementById("translateLang").value;
  if (!lang) {
    document.querySelectorAll(".msg-translation").forEach(el => el.remove());
    return;
  }
  msgElMap.forEach((el) => {
    const textDiv = el.querySelector(".msg-text");
    if (textDiv) {
      el.querySelector(".msg-translation")?.remove();
      maybeTranslateMessage(el, textDiv.textContent);
    }
  });
});

/* Scroll bottom */
function scrollBottom() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const w = document.getElementById("chat-window");
      w.scrollTop = w.scrollHeight;
    });
  });
}

/* Send + keybinds + lightbox close */
document.getElementById("send-button").addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
document.getElementById("lightbox").addEventListener("click", () =>
  document.getElementById("lightbox").classList.remove("open")
);

/* ════════════════ COMMUNITY MODALS ════════════════ */
let joinPending = null;

document.getElementById("createCommunityBtn").addEventListener("click", () => {
  if (!currentUserId) { openAuth(); return; }
  document.getElementById("cc-name").value = "";
  document.getElementById("cc-passcode").value = "";
  document.getElementById("cc-error").textContent = "";
  document.getElementById("createCommunityModal").classList.add("open");
});
document.getElementById("cc-cancel").addEventListener("click", () =>
  document.getElementById("createCommunityModal").classList.remove("open")
);
document.getElementById("cc-create").addEventListener("click", async () => {
  const name = document.getElementById("cc-name").value.trim();
  const passcode = document.getElementById("cc-passcode").value.trim();
  if (!name) { document.getElementById("cc-error").textContent = "Name required."; return; }
  const { data: server, error } = await sb
    .from("servers")
    .insert({ name, passcode: passcode || null, owner_id: currentUserId })
    .select()
    .single();
  if (error) { document.getElementById("cc-error").textContent = error.message; return; }
  await sb.from("channels").insert({ name:"general", server_id:server.id, is_public:true });
  await sb.from("server_members").insert({ server_id:server.id, user_id:currentUserId });
  document.getElementById("createCommunityModal").classList.remove("open");
  await loadCommunities();
  await enterCommunity(server);
});

document.getElementById("browseCommunityBtn").addEventListener("click", async () => {
  if (!currentUserId) { openAuth(); return; }
  const { data } = await sb.from("servers").select("*").order("name");
  if (!data || !data.length) { alert("No communities yet!"); return; }
  const names = data.map((s, i) => `${i + 1}. ${s.name}${s.passcode ? " 🔒" : ""}`).join("\n");
  const pick = prompt(`Communities:\n${names}\n\nEnter number:`);
  const idx = parseInt(pick) - 1;
  if (isNaN(idx) || !data[idx]) return;
  await handleCommunityClick(data[idx]);
});

document.getElementById("jc-cancel").addEventListener("click", () => {
  document.getElementById("joinCommunityModal").classList.remove("open");
  joinPending = null;
});
document.getElementById("jc-join").addEventListener("click", async () => {
  if (!joinPending) return;
  await joinCommunity(joinPending, document.getElementById("jc-passcode").value.trim());
});
document.getElementById("jc-passcode").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("jc-join").click();
});

/* DM MODAL */
document.getElementById("startDmBtn").addEventListener("click", () => {
  if (!currentUserId) { openAuth(); return; }
  document.getElementById("dm-email").value = "";
  document.getElementById("dm-error").textContent = "";
  document.getElementById("startDmModal").classList.add("open");
});
document.getElementById("dm-cancel").addEventListener("click", () =>
  document.getElementById("startDmModal").classList.remove("open")
);
document.getElementById("dm-start").addEventListener("click", async () =>
  await startDMByEmail(document.getElementById("dm-email").value.trim())
);
document.getElementById("dm-email").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("dm-start").click();
});

/* Mobile sidebar toggle */
document.getElementById("roomsToggle").addEventListener("click", () =>
  document.getElementById("chatLeft").classList.toggle("mobile-open")
);

/* ════════════════ @MENTION + /SLASH AUTOCOMPLETE ════════════════ */
let mentionQuery    = null;
let mentionStart    = 0;
let mentionSelIndex = 0;
let slashSelIndex   = 0;
const knownUsers    = [];

function registerUser(username) {
  if (username && !knownUsers.includes(username)) knownUsers.push(username);
}

function showMentionPopup(query) {
  const popup = document.getElementById("mention-popup");
  const matches = knownUsers
    .filter(u => u.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 8);
  if (!matches.length) { popup.classList.remove("open"); return; }
  popup.innerHTML = matches.map((u, i) => `
    <div class="mention-option${i === mentionSelIndex ? " selected" : ""}" data-user="${u}">
      <div class="mention-avatar">${u[0].toUpperCase()}</div>
      <span>@${u}</span>
    </div>
  `).join("");
  popup.classList.add("open");
  popup.querySelectorAll(".mention-option").forEach(opt => {
    opt.addEventListener("mousedown", e => {
      e.preventDefault();
      insertMention(opt.dataset.user);
    });
  });
}

function insertMention(username) {
  const val = msgInput.value;
  msgInput.value = val.slice(0, mentionStart) + "@" + username + " " + val.slice(msgInput.selectionStart);
  mentionQuery = null;
  document.getElementById("mention-popup").classList.remove("open");
  msgInput.focus();
}

function showSlashPopup(query) {
  const popup   = document.getElementById("slash-popup");
  const isAdmin = currentProfile?.role === "admin";
  const isMod   = currentProfile?.role === "mod" || isAdmin;

  const show = SLASH_COMMANDS
    .filter(c => {
      if (!c.adminOnly) return c.cmd.startsWith("/" + query);
      if (isAdmin) return c.cmd.startsWith("/" + query);
      if (isMod && c.modAllowed) return c.cmd.startsWith("/" + query);
      return false;
    })
    .slice(0, 8);

  if (!show.length) { popup.classList.remove("open"); return; }

  popup.innerHTML = show.map((c, i) => `
    <div class="slash-option${i === slashSelIndex ? " selected" : ""}" data-cmd="${c.cmd}">
      <span class="slash-cmd">${c.cmd} <small style="opacity:.5;font-weight:400;">${c.args}</small></span>
      <span class="slash-desc">${c.desc}</span>
    </div>
  `).join("");
  popup.classList.add("open");
  popup.querySelectorAll(".slash-option").forEach(opt => {
    opt.addEventListener("mousedown", e => {
      e.preventDefault();
      msgInput.value = opt.dataset.cmd + " ";
      popup.classList.remove("open");
      msgInput.focus();
    });
  });
}

msgInput.addEventListener("input", () => {
  const val = msgInput.value;
  const pos = msgInput.selectionStart;

  if (val.startsWith("/") && !val.includes(" ")) {
    slashSelIndex = 0;
    showSlashPopup(val.slice(1));
    document.getElementById("mention-popup").classList.remove("open");
    return;
  }
  document.getElementById("slash-popup").classList.remove("open");

  const textBefore = val.slice(0, pos);
  const atMatch    = textBefore.match(/@(\w*)$/);
  if (atMatch) {
    mentionQuery    = atMatch[1];
    mentionStart    = textBefore.lastIndexOf("@");
    mentionSelIndex = 0;
    showMentionPopup(mentionQuery);
  } else {
    mentionQuery = null;
    document.getElementById("mention-popup").classList.remove("open");
  }
});

msgInput.addEventListener("keydown", e => {
  const mp = document.getElementById("mention-popup");
  const sp = document.getElementById("slash-popup");

  if (mp.classList.contains("open")) {
    const opts = mp.querySelectorAll(".mention-option");
    if (e.key === "ArrowDown")  { e.preventDefault(); mentionSelIndex = Math.min(mentionSelIndex + 1, opts.length - 1); showMentionPopup(mentionQuery); }
    if (e.key === "ArrowUp")    { e.preventDefault(); mentionSelIndex = Math.max(mentionSelIndex - 1, 0); showMentionPopup(mentionQuery); }
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const sel = mp.querySelector(".selected");
      if (sel) insertMention(sel.dataset.user);
      return;
    }
    if (e.key === "Escape") { mp.classList.remove("open"); mentionQuery = null; }
  }

  if (sp.classList.contains("open")) {
    const opts = sp.querySelectorAll(".slash-option");
    if (e.key === "ArrowDown")  { e.preventDefault(); slashSelIndex = Math.min(slashSelIndex + 1, opts.length - 1); showSlashPopup(msgInput.value.slice(1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); slashSelIndex = Math.max(slashSelIndex - 1, 0); showSlashPopup(msgInput.value.slice(1)); }
    if (e.key === "Tab") {
      e.preventDefault();
      const sel = sp.querySelector(".selected");
      if (sel) { msgInput.value = sel.dataset.cmd + " "; sp.classList.remove("open"); }
    }
    if (e.key === "Escape") { sp.classList.remove("open"); }
  }
});

/* ════════════════ ONLINE PRESENCE ════════════════ */
const onlineUsers = new Set();

function updateOnlineCount() {
  document.getElementById("online-count").textContent = onlineUsers.size;
}

function startPresence() {
  try {
    if (!currentUserId || !currentProfile) return;
    const presenceChan = sb.channel("presence-global", {
      config: { presence: { key: currentUserId } }
    });
    presenceChan
      .on("presence", { event:"sync" }, () => {
        const state = presenceChan.presenceState();
        onlineUsers.clear();
        Object.values(state).forEach(presences => {
          presences.forEach(p => onlineUsers.add(p.user_id || p.presence_ref));
        });
        updateOnlineCount();
      })
      .on("presence", { event:"join" }, ({ newPresences }) => {
        newPresences.forEach(p => onlineUsers.add(p.user_id || p.presence_ref));
        updateOnlineCount();
      })
      .on("presence", { event:"leave" }, ({ leftPresences }) => {
        leftPresences.forEach(p => onlineUsers.delete(p.user_id || p.presence_ref));
        updateOnlineCount();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await presenceChan.track({
            user_id:  currentUserId,
            username: currentProfile.username,
            online_at: new Date().toISOString()
          });
        }
      });
  } catch (e) {
    console.warn("Presence error:", e);
  }
}

/* ════════════════ UNREAD + NOTIFS HOOK ════════════════ */
const unreadCounts = {};

function getRoomKey(room) {
  return `${room.type}:${room.id}`;
}

function renderUnreadBadge(room, count) {
  let el = null;
  if (room.type === "public")  el = document.getElementById("publicRoomItem");
  else if (room.type === "dm") el = document.querySelector(`[data-dm-id="${room.id}"]`);
  else                         el = document.querySelector(`[data-server-id="${room.id}"]`);
  if (!el) return;
  el.querySelector(".unread-badge")?.remove();
  if (count > 0) {
    const badge = document.createElement("div");
    badge.className = "unread-badge";
    badge.textContent = count > 99 ? "99+" : String(count);
    el.appendChild(badge);
  }
}

async function markRoomRead(room) {
  if (!currentUserId) return;
  const key = getRoomKey(room);
  unreadCounts[key] = 0;
  renderUnreadBadge(room, 0);
  try {
    await sb.from("last_read").upsert({
      user_id: currentUserId,
      room_type: room.type,
      room_id: String(room.id),
      last_read_at: new Date().toISOString()
    }, { onConflict:"user_id,room_type,room_id" });
  } catch {}
}

async function loadUnreadCounts() {
  if (!currentUserId) return;
  try {
    const { data: reads } = await sb
      .from("last_read")
      .select("room_type,room_id,last_read_at")
      .eq("user_id", currentUserId);
    const readMap = {};
    (reads || []).forEach(r => { readMap[`${r.room_type}:${r.room_id}`] = r.last_read_at; });

    // Public
    const pubReadAt = readMap["public:public"] || new Date(0).toISOString();
    const { count: pc } = await sb
      .from("messages")
      .select("*", { count:"exact", head:true })
      .is("channel_id", null)
      .is("dm_id", null)
      .is("server_id", null)
      .is("deleted_at", null)
      .neq("user_id", currentUserId)
      .gt("created_at", pubReadAt);
    if (pc) {
      unreadCounts["public:public"] = pc;
      renderUnreadBadge({ type:"public", id:"public" }, pc);
    }

    // DMs
    const { data: dms } = await sb
      .from("direct_messages")
      .select("id")
      .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);
    for (const dm of (dms || [])) {
      const at = readMap[`dm:${dm.id}`] || new Date(0).toISOString();
      const { count } = await sb
        .from("dm_messages")
        .select("*", { count:"exact", head:true })
        .eq("dm_id", dm.id)
        .neq("user_id", currentUserId)
        .gt("created_at", at);
      if (count) {
        unreadCounts[`dm:${dm.id}`] = count;
        renderUnreadBadge({ type:"dm", id:dm.id }, count);
      }
    }

    // Servers
    const { data: mems } = await sb
      .from("server_members")
      .select("server_id")
      .eq("user_id", currentUserId);
    for (const m of (mems || [])) {
      const at = readMap[`server:${m.server_id}`] || new Date(0).toISOString();
      const { count } = await sb
        .from("messages")
        .select("*", { count:"exact", head:true })
        .eq("server_id", m.server_id)
        .is("deleted_at", null)
        .neq("user_id", currentUserId)
        .gt("created_at", at);
      if (count) {
        unreadCounts[`server:${m.server_id}`] = count;
        renderUnreadBadge({ type:"server", id:m.server_id }, count);
      }
    }
  } catch (e) {
    console.warn("loadUnreadCounts:", e);
  }
}

/* Hook: incoming messages (called from realtime subscriptions) */
function handleIncomingMessage(msg, isRealtime) {
  renderMessage(msg, true);
  if (!isRealtime) return;

  maybePushNotif(msg);

  const msgRoomType = msg.channel_id
    ? "channel"
    : msg.server_id
      ? "server"
      : msg.dm_id
        ? "dm"
        : "public";
  const msgRoomId = msg.channel_id || msg.server_id || msg.dm_id || "public";
  const msgKey = `${msgRoomType}:${msgRoomId}`;
  const curKey = getRoomKey(activeRoom);

  if (msgKey !== curKey && msg.user_id !== currentUserId) {
    unreadCounts[msgKey] = (unreadCounts[msgKey] || 0) + 1;
    renderUnreadBadge({ type:msgRoomType, id:msgRoomId }, unreadCounts[msgKey]);
    if (!document.hasFocus()) {
      const orig = document.title;
      let f = 0;
      const fi = setInterval(() => {
        document.title = f++ % 2 === 0 ? "💬 New message!" : orig;
        if (f > 6) { clearInterval(fi); document.title = orig; }
      }, 600);
    }
  }
}

/* ════════════════ NOTIFICATIONS (BUTTON + PUSH) ════════════════ */
let notificationsEnabled = typeof Notification !== "undefined" && Notification.permission === "granted";

document.getElementById("notif-btn")?.addEventListener("click", async () => {
  const btn = document.getElementById("notif-btn");
  if (!("Notification" in window)) { btn.textContent = "❌ N/A"; return; }
  if (Notification.permission === "granted") {
    notificationsEnabled = true;
    btn.textContent = "🔔 On";
    btn.style.color = "#22c55e";
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    notificationsEnabled = true;
    btn.textContent = "🔔 On";
    btn.style.color = "#22c55e";
    new Notification("360 Chat", {
      body: "Notifications on! You'll get pinged for @mentions & DMs.",
      icon: "../favicon-32x32.png"
    });
  } else {
    btn.textContent = "🔕 Off";
    btn.style.opacity = ".5";
  }
});

(function initNotifButton() {
  const btn = document.getElementById("notif-btn");
  if (!btn) return;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    notificationsEnabled = true;
    btn.textContent = "🔔 On";
    btn.style.color = "#22c55e";
  } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    btn.textContent = "🔕 Off";
    btn.style.opacity = ".5";
  }
})();

function maybePushNotif(msg) {
  if (!notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (document.hasFocus()) return;
  const isMention = currentProfile && new RegExp("@" + currentProfile.username + "\\b", "i").test(msg.text || "");
  const isDM = !!msg.dm_id;
  if (!isMention && !isDM) return;
  const n = new Notification(isDM ? `DM from ${msg.username}` : `${msg.username} mentioned you`, {
    body: (msg.text || "📎 file").slice(0, 100),
    icon: msg.avatar_url || "../favicon-32x32.png",
    tag: "360-chat-" + (msg.dm_id || msg.channel_id || "public"),
    renotify: true
  });
  n.onclick = () => { window.focus(); n.close(); };
}

/* ════════════════ ROOM SWITCHING + REALTIME ════════════════ */
let msgChannel = null;

async function subscribeRoom(room) {
  if (msgChannel) {
    try { await msgChannel.unsubscribe(); } catch {}
    msgChannel = null;
  }

  const baseFilter = room.type === "dm"
    ? { event:"INSERT", schema:"public", table:"dm_messages", filter:`dm_id=eq.${room.id}` }
    : { event:"INSERT", schema:"public", table:"messages" };

  msgChannel = sb.channel(`room-${room.type}-${room.id}`);

  if (room.type === "dm") {
    msgChannel.on("postgres_changes", baseFilter, payload => {
      const msg = payload.new;
      handleIncomingMessage(msg, true);
    });
  } else if (room.type === "public") {
    msgChannel.on("postgres_changes", {
      event:"INSERT",
      schema:"public",
      table:"messages",
      filter:"channel_id=is.null,server_id=is.null,dm_id=is.null"
    }, payload => {
      const msg = payload.new;
      handleIncomingMessage(msg, true);
    });
  } else if (room.type === "server") {
    msgChannel.on("postgres_changes", {
      event:"INSERT",
      schema:"public",
      table:"messages",
      filter:`server_id=eq.${room.id}`
    }, payload => {
      const msg = payload.new;
      handleIncomingMessage(msg, true);
    });
  }

  msgChannel.subscribe();
}

async function loadHistory(room) {
  msgElMap.clear();
  document.getElementById("chat-window").innerHTML = "";
  lastMsgDate = null;
  lastMsgUserId = null;

  if (room.type === "dm") {
    const { data } = await sb
      .from("dm_messages")
      .select("*")
      .eq("dm_id", room.id)
      .order("created_at", { ascending:true });
    (data || []).forEach(m => renderMessage(m, false));
  } else if (room.type === "public") {
    const { data } = await sb
      .from("messages")
      .select("*")
      .is("channel_id", null)
      .is("server_id", null)
      .is("dm_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending:true });
    (data || []).forEach(m => renderMessage(m, false));
  } else if (room.type === "server") {
    const { data } = await sb
      .from("messages")
      .select("*")
      .eq("server_id", room.id)
      .is("deleted_at", null)
      .order("created_at", { ascending:true });
    (data || []).forEach(m => renderMessage(m, false));
  }

  scrollBottom();
}

function updateRoomHeader(room) {
  document.getElementById("hdr-icon").textContent = room.icon || "💬";
  document.getElementById("hdr-name").textContent = room.name || "Chat";
  document.getElementById("hdr-desc").textContent =
    room.type === "public"
      ? "Public chat"
      : room.type === "dm"
        ? "Direct message"
        : "Community chat";
}

function highlightSidebar(room) {
  document.querySelectorAll(".room-item").forEach(el => el.classList.remove("active"));
  if (room.type === "public") {
    document.getElementById("publicRoomItem")?.classList.add("active");
  } else if (room.type === "dm") {
    document.querySelector(`[data-dm-id="${room.id}"]`)?.classList.add("active");
  } else if (room.type === "server") {
    document.querySelector(`[data-server-id="${room.id}"]`)?.classList.add("active");
  }
}

async function switchRoom(room) {
  activeRoom = room;
  updateRoomHeader(room);
  highlightSidebar(room);
  await loadHistory(room);
  await subscribeRoom(room);
  markRoomRead(room);
}

/* ════════════════ INIT ════════════════ */
(async () => {
  try {
    // Load session + profile
    const { data:{ session } } = await sb.auth.getSession();
    currentUserId = session?.user?.id || null;
    if (currentUserId) currentProfile = await getProfile(currentUserId);

    // Load sidebar lists
    await loadCommunities();
    await loadDMs();

    // Public room click
    document.getElementById("publicRoomItem").addEventListener("click", () => {
      switchRoom({ type:"public", id:"public", name:"General", icon:"🌐" });
    });

    // Enter default room
    await switchRoom({ type:"public", id:"public", name:"General", icon:"🌐" });

    // Presence
    startPresence();

    // Typing channel
    typingChannel = sb.channel("typing-global");
    typingChannel
      .on("broadcast", { event:"typing" }, payload => {
        const { uid, username, avatar_url } = payload.payload;
        if (uid === currentUserId) return;
        typingUsers[uid] = { username, avatar_url };
        renderTyping();
        setTimeout(() => {
          delete typingUsers[uid];
          renderTyping();
        }, 2500);
      })
      .subscribe();

    // Reaction updates
    sb.channel("reactions-global")
      .on("postgres_changes", {
        event:"*",
        schema:"public",
        table:"reactions"
      }, payload => {
        const mid = payload.new?.message_id || payload.old?.message_id;
        if (mid && document.getElementById(`reactions-${mid}`)) {
          loadReactionsSingle(mid);
        }
      })
      .subscribe();

    // Auth state change
    sb.auth.onAuthStateChange(async (_, session2) => {
      currentUserId = session2?.user?.id || null;
      currentProfile = currentUserId ? await getProfile(currentUserId) : null;
      loadDMs();
      startPresence();
    });

    // Load unread counts after auth settles
    setTimeout(() => {
      if (currentUserId) loadUnreadCounts();
    }, 1500);

  } catch (e) {
    console.error("Init error:", e);
  }
})();
