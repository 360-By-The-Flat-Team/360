document.getElementById("uploadBtn").onclick = uploadMusic;

async function uploadMusic() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  document.getElementById("status").textContent = "Uploading...";

  const filePath = `${crypto.randomUUID()}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from("music")
    .upload(filePath, file);

  if (uploadError) {
    document.getElementById("status").textContent = "Upload failed.";
    return;
  }

  const user = await supabase.auth.getUser();

  await supabase.from("music_files").insert({
    title: file.name,
    file_path: filePath,
    user_id: user.data.user.id
  });

  document.getElementById("status").textContent = "Uploaded!";
  loadSongs();
}

async function loadSongs() {
  const { data } = await supabase.from("music_files").select("*");

  const container = document.getElementById("songs");
  container.innerHTML = "";

  data.forEach(song => {
    const url = supabase.storage
      .from("music")
      .getPublicUrl(song.file_path).data.publicUrl;

    container.innerHTML += `
      <div class="song">
        <b>${song.title}</b><br>
        <audio controls src="${url}"></audio>
      </div>
    `;
  });
}

loadSongs();
