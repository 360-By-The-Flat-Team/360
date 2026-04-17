const API = "https://api.360-search.com/search";

const searchBox = document.getElementById("searchBox");
const resultsDiv = document.getElementById("results");
const paginationDiv = document.getElementById("pagination");

function getParam(name) {
  return new URL(location.href).searchParams.get(name);
}

async function runSearch() {
  const q = getParam("q") || "";
  const page = getParam("page") || "1";

  if (!q) return;

  searchBox.value = q;

  const url = `${API}?q=${encodeURIComponent(q)}&page=${page}`;
  const res = await fetch(url);
  const data = await res.json();

  renderResults(data.results || []);
  renderPagination(Number(page));
}

function renderResults(items) {
  resultsDiv.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-title">
        <a href="${item.url}" target="_blank">${item.title || "Untitled"}</a>
      </div>
      <div class="card-snippet">${item.content || ""}</div>
      <div class="card-url">${item.url}</div>
    `;

    resultsDiv.appendChild(card);
  });
}

function renderPagination(current) {
  paginationDiv.innerHTML = "";

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.textContent = "Previous";
  prev.disabled = current <= 1;
  prev.onclick = () => goToPage(current - 1);

  const next = document.createElement("button");
  next.className = "page-btn";
  next.textContent = "Next";
  next.onclick = () => goToPage(current + 1);

  paginationDiv.appendChild(prev);
  paginationDiv.appendChild(next);
}

function goToPage(page) {
  const q = searchBox.value;
  const newUrl = `/search.html?q=${encodeURIComponent(q)}&page=${page}`;
  history.pushState({}, "", newUrl);
  runSearch();
}

searchBox.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const q = searchBox.value;
    const newUrl = `/search.html?q=${encodeURIComponent(q)}&page=1`;
    history.pushState({}, "", newUrl);
    runSearch();
  }
});

runSearch();
