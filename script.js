/* ============================================================
   SUPABASE CLIENT
============================================================ */
const supabase = supabase.createClient(
  "https://wiswfpfsjiowtrdyqpxy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
);

/* ============================================================
   AUTH UI ELEMENTS
============================================================ */
const openLoginBtn = document.getElementById("open-login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authPopup = document.getElementById("auth-popup");
const loginBtn = document.getElementById("auth-login-btn");
const signupBtn = document.getElementById("auth-signup-btn");
const closeBtn = document.getElementById("auth-close-btn");
const errorMsg = document.getElementById("auth-error");

/* ============================================================
   POPUP OPEN/CLOSE
============================================================ */
openLoginBtn.onclick = () => authPopup.classList.remove("hidden");
closeBtn.onclick = () => authPopup.classList.add("hidden");

/* ============================================================
   EMAIL LOGIN
============================================================ */
loginBtn.onclick = async () => {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.textContent = error.message;
  } else {
    location.reload();
  }
};

/* ============================================================
   EMAIL SIGNUP
============================================================ */
signupBtn.onclick = async () => {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  const { error } = await supabase.auth.signUp({ email, password });

  errorMsg.textContent = error
    ? error.message
    : "Check your email to confirm your account!";
};

/* ============================================================
   FIXED GITHUB LOGIN (opens new tab)
============================================================ */
document.getElementById("github-login").onclick = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    console.error("GitHub login error:", error.message);
    return;
  }

  if (data?.url) window.open(data.url, "_blank");
};

/* ============================================================
   FIXED GOOGLE LOGIN (opens new tab)
============================================================ */
document.getElementById("google-login").onclick = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    console.error("Google login error:", error.message);
    return;
  }

  if (data?.url) window.open(data.url, "_blank");
};

/* ============================================================
   LOGOUT
============================================================ */
logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

/* ============================================================
   SHOW/HIDE BUTTONS BASED ON SESSION
============================================================ */
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    logoutBtn.style.display = "inline-block";
    openLoginBtn.style.display = "none";
  } else {
    logoutBtn.style.display = "none";
    openLoginBtn.style.display = "inline-block";
  }
});
/* ============================================================
   CHAT SYSTEM — REALTIME + SEND + ROLE BADGES
============================================================ */

/* DOM elements */
const chatWindow = document.getElementById("chat-window");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

/* ============================================================
   FETCH USER PROFILE (role, username, avatar)
============================================================ */
async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, role")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("Profile fetch error:", error.message);
    return { username: "Unknown", avatar_url: null, role: "user" };
  }

  return data;
}

/* ============================================================
   SEND CHAT MESSAGE (dynamic role fetch)
============================================================ */
async function sendChatMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    authPopup.classList.remove("hidden");
    return;
  }

  // Fetch role dynamically from profiles
  const profile = await getUserProfile(user.id);
  const role = profile.role || "user";

  const { error } = await supabase.from("messages").insert({
    user_id: user.id,
    username: profile.username || user.email,
    text: text,
    role: role
  });

  if (error) {
    console.error("Message send error:", error.message);
    return;
  }

  messageInput.value = "";
}

/* Send on button click */
sendBtn.onclick = sendChatMessage;

/* Send on Enter key */
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

/* ============================================================
   RENDER MESSAGE WITH AVATAR + TAG
============================================================ */
function renderMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("chat-message");

  const usernameDisplay = msg.tag
    ? `${msg.username} <span class="user-tag">[${msg.tag}]</span>`
    : msg.username;

  div.innerHTML = `
    ${renderAvatar(msg.avatar_url, msg.username)}
    <div class="chat-line">
      <strong>${usernameDisplay}</strong>
      <p>${msg.text}</p>
    </div>
  `;

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Tag styling
const tagStyle = document.createElement("style");
tagStyle.textContent = `
  .user-tag {
    color: #facc15;
    font-weight: bold;
    margin-left: 4px;
  }
`;
document.head.appendChild(tagStyle);

/* ============================================================
   LOAD CHAT HISTORY
============================================================ */
async function loadChatHistory() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Chat history error:", error.message);
    return;
  }

  chatWindow.innerHTML = "";

  data.forEach((msg) => renderMessage(msg));
}

/* ============================================================
   REALTIME CHAT LISTENER
============================================================ */
supabase
  .channel("realtime-messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      renderMessage(payload.new);
    }
  )
  .subscribe();

/* Load chat on page load */
loadChatHistory();

/* ============================================================
   ROLE BADGE STYLES (inject into page)
============================================================ */
const style = document.createElement("style");
style.textContent = `
  .role-badge {
    display: inline-block;
    margin-left: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: bold;
  }

  .role-admin { background: #dc2626; color: white; }
  .role-mod { background: #7c3aed; color: white; }
  .role-user { background: #6b7280; color: white; }
`;
document.head.appendChild(style);
/* ============================================================
   AI SYSTEM — GROQ API STREAMING
============================================================ */

const aiInput = document.getElementById("ai-input");
const aiSendBtn = document.getElementById("ai-send-btn");
const aiOutput = document.getElementById("ai-output");

/* ============================================================
   STREAM AI RESPONSE FROM GROQ
============================================================ */
async function sendAIRequest() {
  const prompt = aiInput.value.trim();
  if (!prompt) return;

  aiOutput.innerHTML = `<p><em>Thinking...</em></p>`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_GROQ_API_KEY"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ],
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    aiOutput.innerHTML = ""; // clear

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const json = line.replace("data:", "").trim();
        if (json === "[DONE]") continue;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            aiOutput.innerHTML += delta;
          }
        } catch (err) {
          console.warn("Stream parse error:", err);
        }
      }
    }
  } catch (err) {
    aiOutput.innerHTML = `<p style="color:red;">AI Error: ${err.message}</p>`;
  }
}

/* Send AI request on button click */
aiSendBtn.onclick = sendAIRequest;

/* Send AI request on Enter key */
aiInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendAIRequest();
});
/* ============================================================
   UI EXTRAS — THEMES, BACKGROUNDS, CURSOR EFFECTS, MUSIC
============================================================ */

/* ------------------------------
   THEME TOGGLE (LIGHT / DARK)
------------------------------ */
const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");

    const mode = document.body.classList.contains("dark-theme")
      ? "dark"
      : "light";

    localStorage.setItem("theme", mode);
  });

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
}

/* ------------------------------
   BACKGROUND SWITCHER
------------------------------ */
const bgButtons = document.querySelectorAll("[data-bg]");

bgButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const bg = btn.getAttribute("data-bg");
    document.body.style.backgroundImage = `url('${bg}')`;
    localStorage.setItem("background", bg);
  });
});

// Load saved background
const savedBg = localStorage.getItem("background");
if (savedBg) {
  document.body.style.backgroundImage = `url('${savedBg}')`;
}

/* ------------------------------
   CURSOR EFFECT (RIPPLE)
------------------------------ */
document.addEventListener("click", (e) => {
  const ripple = document.createElement("span");
  ripple.classList.add("cursor-ripple");
  ripple.style.left = e.pageX + "px";
  ripple.style.top = e.pageY + "px";
  document.body.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
});

// Inject ripple style
const rippleStyle = document.createElement("style");
rippleStyle.textContent = `
  .cursor-ripple {
    position: absolute;
    width: 20px;
    height: 20px;
    background: rgba(59, 130, 246, 0.4);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple-pop 0.6s ease-out forwards;
    pointer-events: none;
    z-index: 9999;
  }

  @keyframes ripple-pop {
    to {
      transform: translate(-50%, -50%) scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

/* ------------------------------
   MUSIC TOGGLE
------------------------------ */
const music = new Audio("music.mp3");
music.loop = true;

const musicBtn = document.getElementById("music-toggle");

if (musicBtn) {
  musicBtn.addEventListener("click", () => {
    if (music.paused) {
      music.play();
      musicBtn.textContent = "🔊 Music On";
    } else {
      music.pause();
      musicBtn.textContent = "🔈 Music Off";
    }
  });
}

/* ------------------------------
   SMOOTH SCROLL TO SECTIONS
------------------------------ */
document.querySelectorAll("[data-scroll]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-scroll");
    const el = document.getElementById(target);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
});
/* ============================================================
   AVATAR UTILITIES
============================================================ */

function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function renderAvatar(url, username) {
  if (url) {
    return `<img class="chat-avatar" src="${url}" alt="${username}">`;
  }
  return `<div class="chat-avatar initials">${getInitials(username)}</div>`;
}

// Inject avatar styles
const avatarStyle = document.createElement("style");
avatarStyle.textContent = `
  .chat-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 8px;
  }
  .chat-avatar.initials {
    background: #4b5563;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
  }
  .chat-message {
    display: flex;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .chat-line {
    background: rgba(255,255,255,0.1);
    padding: 6px 10px;
    border-radius: 8px;
    max-width: 80%;
  }
`;
document.head.appendChild(avatarStyle);
/* ============================================================
   TYPING INDICATORS
============================================================ */

const typingIndicator = document.getElementById("typing-indicator") || (() => {
  const el = document.createElement("div");
  el.id = "typing-indicator";
  el.style.margin = "6px";
  el.style.opacity = "0.8";
  chatWindow.parentNode.insertBefore(el, chatWindow.nextSibling);
  return el;
})();

let typingTimeouts = {};

function showTyping(username) {
  typingIndicator.innerHTML = `${username} is typing…`;

  if (typingTimeouts[username]) clearTimeout(typingTimeouts[username]);

  typingTimeouts[username] = setTimeout(() => {
    typingIndicator.innerHTML = "";
  }, 2000);
}

// Send typing event
messageInput.addEventListener("input", async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const profile = await getUserProfile(user.id);

  supabase.channel("typing").send({
    type: "broadcast",
    event: "typing",
    payload: { username: profile.username }
  });
});

// Listen for typing events
supabase
  .channel("typing")
  .on("broadcast", { event: "typing" }, (payload) => {
    showTyping(payload.payload.username);
  })
  .subscribe();
/* ============================================================
   SLASH COMMAND ENGINE
============================================================ */

async function runCommand(text) {
  const parts = text.trim().split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const profile = await getUserProfile(user.id);

  if (profile.role !== "admin") {
    aiOutput.innerHTML = "❌ Only admins can use commands.";
    return;
  }

  // /promote <username>
  if (cmd === "/promote") {
    const target = args[0];
    await supabase.from("profiles").update({ role: "mod" }).eq("username", target);
    aiOutput.innerHTML = `✅ Promoted ${target} to mod.`;
    return;
  }

  // /demote <username>
  if (cmd === "/demote") {
    const target = args[0];
    await supabase.from("profiles").update({ role: "user" }).eq("username", target);
    aiOutput.innerHTML = `✅ Demoted ${target} to user.`;
    return;
  }

  // /tag <username> <tag>
  if (cmd === "/tag") {
    const target = args[0];
    const tag = args.slice(1).join(" ");
    await supabase.from("profiles").update({ tag }).eq("username", target);
    aiOutput.innerHTML = `🏷️ Set tag for ${target}: ${tag}`;
    return;
  }

  aiOutput.innerHTML = "❓ Unknown command.";
}
async function sendChatMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // Slash command?
  if (text.startsWith("/")) {
    await runCommand(text);
    messageInput.value = "";
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    authPopup.classList.remove("hidden");
    return;
  }

  const profile = await getUserProfile(user.id);

  await supabase.from("messages").insert({
    user_id: user.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    tag: profile.tag,
    text: text,
    role: profile.role
  });

  messageInput.value = "";
}
