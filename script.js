const menuData = [
  {
    day: 2,
    weekday: "月",
    staple: "ごはん",
    dishes: ["ちくぜんに", "あったかじる"],
    calories: 553,
    protein: 26.1,
    salt: 2.3,
  },
  {
    day: 3,
    weekday: "火",
    staple: "ごはん",
    dishes: ["とりにくとさといものにつけ", "もやしとじゃこのごまいため", "ふくまめ"],
    calories: 604,
    protein: 25.7,
    salt: 1.5,
  },
  {
    day: 4,
    weekday: "水",
    staple: "ごはん",
    dishes: ["しろみざかなフライのチリソースかけ", "カラフルスープ"],
    calories: 560,
    protein: 22.1,
    salt: 1.5,
  },
  {
    day: 5,
    weekday: "木",
    staple: "コッペパン",
    dishes: ["だいずのミートソースに", "フレンチサラダ"],
    calories: 627,
    protein: 26.7,
    salt: 3.3,
  },
  {
    day: 6,
    weekday: "金",
    staple: "ごはん",
    dishes: ["だいこんごはん", "ほうれんそうオムレツ", "ぶたじる"],
    calories: 567,
    protein: 23.3,
    salt: 2.3,
  },
  {
    day: 9,
    weekday: "月",
    staple: "ごはん",
    dishes: ["とりにくのさんしょくに", "キャベツのみそしる"],
    calories: 611,
    protein: 23.9,
    salt: 2.5,
  },
  {
    day: 10,
    weekday: "火",
    staple: "ごはん",
    dishes: ["いわしのしょうがに", "はりはりなべ"],
    calories: 632,
    protein: 31.3,
    salt: 1.6,
  },
  {
    day: 12,
    weekday: "木",
    staple: "あじつけコッペパン",
    dishes: ["ハヤシシチュー", "さわやかソテー"],
    calories: 662,
    protein: 25.1,
    salt: 3.3,
  },
  {
    day: 13,
    weekday: "金",
    staple: "ごはん",
    dishes: ["ちゅうかどんぶり", "あげはるまき"],
    calories: 646,
    protein: 20.6,
    salt: 1.3,
  },
  {
    day: 16,
    weekday: "月",
    staple: "ごはん",
    dishes: ["おでん", "うめふうみあえ"],
    calories: 561,
    protein: 23.8,
    salt: 2.1,
  },
  {
    day: 17,
    weekday: "火",
    staple: "ごはん",
    dishes: ["さばのしおやき", "ひじきまめ", "ふゆやさいのうすくずじる"],
    calories: 602,
    protein: 26.5,
    salt: 2.2,
  },
  {
    day: 18,
    weekday: "水",
    staple: "ごはん",
    dishes: ["マーボーだいこん", "もやしのいためナムル"],
    calories: 524,
    protein: 19.1,
    salt: 2.0,
  },
  {
    day: 19,
    weekday: "木",
    staple: "ミルクコッペパン",
    dishes: ["とりにくのトマトサルサに", "ポトフ"],
    calories: 651,
    protein: 27.4,
    salt: 2.2,
  },
  {
    day: 20,
    weekday: "金",
    staple: "ごはん",
    dishes: ["ごまとうにゅうなべ", "くきわかめのきんぴら"],
    calories: 565,
    protein: 24.4,
    salt: 2.4,
  },
  {
    day: 24,
    weekday: "火",
    staple: "ごはん",
    dishes: ["だいこんカレー", "フルーツポンチ"],
    calories: 641,
    protein: 20.4,
    salt: 1.4,
  },
  {
    day: 25,
    weekday: "水",
    staple: "ごはん",
    dishes: ["はまちのたつたあげ", "おかかいため", "みそしる"],
    calories: 616,
    protein: 28.0,
    salt: 2.0,
  },
  {
    day: 26,
    weekday: "木",
    staple: "こがたコッペパン・スパゲティ",
    dishes: ["わふうスパゲティ（きざみのりつき）", "レモンサラダ"],
    calories: 523,
    protein: 24.4,
    salt: 1.9,
  },
  {
    day: 27,
    weekday: "金",
    staple: "ごはん",
    dishes: ["だいこんとさといものそぼろに", "もやしのこうみいため"],
    calories: 534,
    protein: 20.5,
    salt: 1.7,
  },
];

const menuGrid = document.getElementById("menuGrid");
const cardTemplate = document.getElementById("menuCardTemplate");
const searchInput = document.getElementById("searchInput");
const weekdaySelect = document.getElementById("weekdaySelect");
const resultCount = document.getElementById("resultCount");
const resetButton = document.getElementById("resetButton");

function normalizeText(value) {
  return value.toLowerCase().replace(/[\s　]+/g, "");
}

function renderCards(items) {
  menuGrid.innerHTML = "";

  if (items.length === 0) {
    menuGrid.innerHTML = '<p class="empty">条件に一致する献立がありません。</p>';
    resultCount.textContent = "0件";
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of items) {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);

    card.querySelector(".date").textContent = `2月${item.day}日`;
    card.querySelector(".weekday").textContent = item.weekday;
    card.querySelector(".staple").textContent = `主食: ${item.staple}`;

    const dishList = card.querySelector(".dishes");
    for (const dish of item.dishes) {
      const li = document.createElement("li");
      li.textContent = dish;
      dishList.appendChild(li);
    }

    card.querySelector(".calorie").textContent = `${item.calories} kcal`;
    card.querySelector(".protein").textContent = `${item.protein.toFixed(1)} g`;
    card.querySelector(".salt").textContent = `${item.salt.toFixed(1)} g`;

    fragment.appendChild(card);
  }

  menuGrid.appendChild(fragment);
  resultCount.textContent = `${items.length}件 / 全${menuData.length}件`;
}

function applyFilter() {
  const keyword = normalizeText(searchInput.value);
  const weekday = weekdaySelect.value;

  const filtered = menuData.filter((item) => {
    const byWeekday = !weekday || item.weekday === weekday;
    if (!byWeekday) return false;

    if (!keyword) return true;

    const target = normalizeText(
      `${item.day}${item.weekday}${item.staple}${item.dishes.join("")}`
    );

    return target.includes(keyword);
  });

  renderCards(filtered);
}

searchInput.addEventListener("input", applyFilter);
weekdaySelect.addEventListener("change", applyFilter);
resetButton.addEventListener("click", () => {
  searchInput.value = "";
  weekdaySelect.value = "";
  applyFilter();
});

renderCards(menuData);
