const pageTitle = document.getElementById("pageTitle");
const menuGrid = document.getElementById("menuGrid");
const cardTemplate = document.getElementById("menuCardTemplate");
const searchInput = document.getElementById("searchInput");
const weekdaySelect = document.getElementById("weekdaySelect");
const resultCount = document.getElementById("resultCount");
const resetButton = document.getElementById("resetButton");
const monthTabs = document.getElementById("monthTabs");
const pdfLink = document.getElementById("pdfLink");
const voteBackendStatus = document.getElementById("voteBackendStatus");

const STORE_KEY = "school-lunch-selected-menu";
const RATING_STORE_KEY = "school-lunch-ratings";
const CLIENT_ID_STORE_KEY = "school-lunch-client-id";

const LABELS = {
  like: "おいしい",
  unlike: "おいしくない",
  notRated: "未評価",
  title: "感想",
  total: (like, unlike) => `おいしい ${like} / おいしくない ${unlike}`,
};

let menus = [];
let selectedMenuId = "";
let ratings = {};
let voteStats = {};
let clientId = "";

const appConfig = window.APP_CONFIG || {};
const supabaseUrl = String(appConfig.supabaseUrl || "").replace(/\/$/, "");
const supabaseAnonKey = String(appConfig.supabaseAnonKey || "");
const isSharedVoteEnabled = Boolean(supabaseUrl && supabaseAnonKey);

function normalizeText(value) {
  return String(value).toLowerCase().replace(/[\s　]+/g, "");
}

function sortMenus(items) {
  return [...items].sort((a, b) => {
    if (a.month === b.month) {
      return String(a.course).localeCompare(String(b.course), "ja");
    }
    return String(a.month).localeCompare(String(b.month), "ja");
  });
}

function formatMenuLabel(menu) {
  return `${menu.monthLabel} ${menu.course}献立`;
}

function getSelectedMenu() {
  return menus.find((menu) => menu.id === selectedMenuId) || menus[0] || null;
}

function getRatingKey(menuId, day) {
  return `${menuId}:${day}`;
}

function createClientId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadClientId() {
  const saved = localStorage.getItem(CLIENT_ID_STORE_KEY);
  clientId = saved || createClientId();
  localStorage.setItem(CLIENT_ID_STORE_KEY, clientId);
}

function getRatingLabel(ratingValue) {
  if (ratingValue === "good") return LABELS.like;
  if (ratingValue === "bad") return LABELS.unlike;
  return LABELS.notRated;
}

function getStatsForCard(menuId, day) {
  const key = getRatingKey(menuId, day);
  return voteStats[key] || { like: 0, unlike: 0 };
}

function loadRatings() {
  try {
    const raw = localStorage.getItem(RATING_STORE_KEY);
    ratings = raw ? JSON.parse(raw) : {};
  } catch {
    ratings = {};
  }
}

function saveRatings() {
  try {
    localStorage.setItem(RATING_STORE_KEY, JSON.stringify(ratings));
  } catch {
    // ignore storage error
  }
}

function updateVoteBackendStatus() {
  voteBackendStatus.textContent = isSharedVoteEnabled
    ? "共有集計: ON（全ユーザーの評価を表示）"
    : "共有集計: OFF（この端末内のみ）";
}

async function fetchSharedVoteStats(menuId) {
  const url =
    `${supabaseUrl}/rest/v1/meal_ratings` +
    `?select=day,vote&menu_id=eq.${encodeURIComponent(menuId)}`;

  const response = await fetch(url, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("共有集計の取得に失敗しました。");
  }

  const rows = await response.json();
  const nextStats = {};

  for (const row of rows) {
    const key = getRatingKey(menuId, row.day);
    if (!nextStats[key]) nextStats[key] = { like: 0, unlike: 0 };
    if (row.vote === "good") nextStats[key].like += 1;
    if (row.vote === "bad") nextStats[key].unlike += 1;
  }

  voteStats = nextStats;
}

function computeLocalVoteStats(menuId) {
  const nextStats = {};
  for (const [key, value] of Object.entries(ratings)) {
    const [menu, day] = key.split(":");
    if (menu !== menuId) continue;
    const cardKey = getRatingKey(menuId, Number(day));
    if (!nextStats[cardKey]) nextStats[cardKey] = { like: 0, unlike: 0 };
    if (value === "good") nextStats[cardKey].like += 1;
    if (value === "bad") nextStats[cardKey].unlike += 1;
  }
  voteStats = nextStats;
}

async function submitSharedVote(menuId, day, vote) {
  const payload = {
    menu_id: menuId,
    day,
    client_id: clientId,
    vote,
  };

  const url = `${supabaseUrl}/rest/v1/meal_ratings?on_conflict=menu_id,day,client_id`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("評価の送信に失敗しました。");
  }
}

async function deleteSharedVote(menuId, day) {
  const url =
    `${supabaseUrl}/rest/v1/meal_ratings` +
    `?menu_id=eq.${encodeURIComponent(menuId)}` +
    `&day=eq.${day}` +
    `&client_id=eq.${encodeURIComponent(clientId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("評価の削除に失敗しました。");
  }
}

async function loadVoteStatsForCurrentMenu() {
  const selectedMenu = getSelectedMenu();
  if (!selectedMenu) return;

  if (isSharedVoteEnabled) {
    await fetchSharedVoteStats(selectedMenu.id);
    return;
  }

  computeLocalVoteStats(selectedMenu.id);
}

function renderMonthTabs() {
  monthTabs.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const menu of menus) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-tab${menu.id === selectedMenuId ? " active" : ""}`;
    button.textContent = formatMenuLabel(menu);
    button.addEventListener("click", async () => {
      selectedMenuId = menu.id;
      localStorage.setItem(STORE_KEY, selectedMenuId);
      searchInput.value = "";
      weekdaySelect.value = "";
      renderMonthTabs();
      renderHeaderAndSource();
      await loadVoteStatsForCurrentMenu();
      applyFilter();
    });
    fragment.appendChild(button);
  }

  monthTabs.appendChild(fragment);
}

function renderRatingSummary(totalElement, menuId, day) {
  const stats = getStatsForCard(menuId, day);
  totalElement.textContent = LABELS.total(stats.like, stats.unlike);
}

function renderRatingSection(container, titleElement, stateElement, totalElement, menuId, day) {
  const key = getRatingKey(menuId, day);
  const current = ratings[key] || "";

  titleElement.textContent = LABELS.title;
  container.innerHTML = "";

  const options = [
    { value: "good", label: LABELS.like },
    { value: "bad", label: LABELS.unlike },
  ];

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rating-btn";
    button.dataset.value = option.value;
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(current === option.value));
    if (current === option.value) button.classList.add("active");

    button.addEventListener("click", async () => {
      const prev = ratings[key] || "";
      const next = prev === option.value ? "" : option.value;

      if (next) {
        ratings[key] = next;
      } else {
        delete ratings[key];
      }
      saveRatings();

      for (const btn of container.querySelectorAll(".rating-btn")) {
        const isActive = btn.dataset.value === next;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
      }

      stateElement.textContent = getRatingLabel(next);

      try {
        if (isSharedVoteEnabled) {
          if (next) {
            await submitSharedVote(menuId, day, next);
          } else {
            await deleteSharedVote(menuId, day);
          }
          await loadVoteStatsForCurrentMenu();
        } else {
          computeLocalVoteStats(menuId);
        }
      } catch (error) {
        console.error(error);
      }

      renderRatingSummary(totalElement, menuId, day);
    });

    container.appendChild(button);
  }

  stateElement.textContent = getRatingLabel(current);
  renderRatingSummary(totalElement, menuId, day);
}

function renderCards(items, totalCount, menuId) {
  menuGrid.innerHTML = "";

  if (items.length === 0) {
    menuGrid.innerHTML = '<p class="empty">条件に一致する献立がありません。</p>';
    resultCount.textContent = `0件 / 全${totalCount}件`;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of items) {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);

    card.querySelector(".date").textContent = `${item.day}日`;
    card.querySelector(".weekday").textContent = item.weekday;
    card.querySelector(".staple").textContent = `主食: ${item.staple}`;

    const dishList = card.querySelector(".dishes");
    for (const dish of item.dishes) {
      const li = document.createElement("li");
      li.textContent = dish;
      dishList.appendChild(li);
    }

    const ratingTitle = card.querySelector(".rating-title");
    const ratingActions = card.querySelector(".rating-actions");
    const ratingState = card.querySelector(".rating-state");
    const ratingTotal = card.querySelector(".rating-total");
    renderRatingSection(ratingActions, ratingTitle, ratingState, ratingTotal, menuId, item.day);

    card.querySelector(".calorie").textContent = `${item.calories} kcal`;
    card.querySelector(".protein").textContent = `${Number(item.protein).toFixed(1)} g`;
    card.querySelector(".salt").textContent = `${Number(item.salt).toFixed(1)} g`;

    fragment.appendChild(card);
  }

  menuGrid.appendChild(fragment);
  resultCount.textContent = `${items.length}件 / 全${totalCount}件`;
}

function applyFilter() {
  const selectedMenu = getSelectedMenu();
  if (!selectedMenu) return;

  const keyword = normalizeText(searchInput.value);
  const weekday = weekdaySelect.value;

  const filtered = selectedMenu.items.filter((item) => {
    const byWeekday = !weekday || item.weekday === weekday;
    if (!byWeekday) return false;

    if (!keyword) return true;

    const target = normalizeText(
      `${item.day}${item.weekday}${item.staple}${item.dishes.join("")}`
    );

    return target.includes(keyword);
  });

  renderCards(filtered, selectedMenu.items.length, selectedMenu.id);
}

function renderHeaderAndSource() {
  const selectedMenu = getSelectedMenu();
  if (!selectedMenu) return;

  pageTitle.textContent = selectedMenu.title || formatMenuLabel(selectedMenu);
  pdfLink.textContent = `${formatMenuLabel(selectedMenu)} のPDFを開く`;
  pdfLink.href = selectedMenu.pdf || "#";
}

async function loadMenus() {
  const response = await fetch("data/menu-data.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("献立データの読み込みに失敗しました。");
  }

  const json = await response.json();
  menus = sortMenus(json.menus || []);

  if (menus.length === 0) {
    throw new Error("献立データが空です。");
  }

  const savedId = localStorage.getItem(STORE_KEY);
  selectedMenuId = menus.some((menu) => menu.id === savedId) ? savedId : menus[0].id;
}

function setError(message) {
  monthTabs.innerHTML = "";
  menuGrid.innerHTML = `<p class=\"empty\">${message}</p>`;
  resultCount.textContent = "-";
}

searchInput.addEventListener("input", applyFilter);
weekdaySelect.addEventListener("change", applyFilter);

resetButton.addEventListener("click", () => {
  searchInput.value = "";
  weekdaySelect.value = "";
  applyFilter();
});

(async () => {
  try {
    loadClientId();
    loadRatings();
    updateVoteBackendStatus();

    await loadMenus();
    renderMonthTabs();
    renderHeaderAndSource();
    await loadVoteStatsForCurrentMenu();
    applyFilter();
  } catch (error) {
    console.error(error);
    setError("データの読み込みに失敗しました。ファイル構成を確認してください。");
  }
})();
