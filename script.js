const pageTitle = document.getElementById("pageTitle");
const menuGrid = document.getElementById("menuGrid");
const cardTemplate = document.getElementById("menuCardTemplate");
const searchInput = document.getElementById("searchInput");
const weekdaySelect = document.getElementById("weekdaySelect");
const resultCount = document.getElementById("resultCount");
const resetButton = document.getElementById("resetButton");
const monthTabs = document.getElementById("monthTabs");
const pdfLink = document.getElementById("pdfLink");

const STORE_KEY = "school-lunch-selected-menu";
const RATING_STORE_KEY = "school-lunch-ratings";
const RATING_OPTIONS = [
  { value: "good", label: "Like" },
  { value: "bad", label: "Unlike" },
];

let menus = [];
let selectedMenuId = "";
let ratings = {};

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

function getRatingLabel(ratingValue) {
  if (ratingValue === "good") return "Like";
  if (ratingValue === "bad") return "Unlike";
  return "Not rated";
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

function renderMonthTabs() {
  monthTabs.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const menu of menus) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-tab${menu.id === selectedMenuId ? " active" : ""}`;
    button.textContent = formatMenuLabel(menu);
    button.addEventListener("click", () => {
      selectedMenuId = menu.id;
      localStorage.setItem(STORE_KEY, selectedMenuId);
      searchInput.value = "";
      weekdaySelect.value = "";
      renderMonthTabs();
      applyFilter();
    });
    fragment.appendChild(button);
  }

  monthTabs.appendChild(fragment);
}

function renderRatingSection(container, stateElement, menuId, day) {
  const key = getRatingKey(menuId, day);
  const current = ratings[key] || "";

  container.innerHTML = "";

  for (const option of RATING_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rating-btn";
    button.dataset.value = option.value;
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(current === option.value));
    if (current === option.value) button.classList.add("active");

    button.addEventListener("click", () => {
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
    });

    container.appendChild(button);
  }

  stateElement.textContent = getRatingLabel(current);
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

    const ratingActions = card.querySelector(".rating-actions");
    const ratingState = card.querySelector(".rating-state");
    renderRatingSection(ratingActions, ratingState, menuId, item.day);

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
    loadRatings();
    await loadMenus();
    renderMonthTabs();
    renderHeaderAndSource();
    applyFilter();
  } catch (error) {
    console.error(error);
    setError("データの読み込みに失敗しました。ファイル構成を確認してください。");
  }
})();
