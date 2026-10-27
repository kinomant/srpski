/* ================= НАДЁЖНАЯ ОЗВУЧКА ================= */
let currentAudio = null;

const CYR_TO_LAT_TTS = {
  "а":"a", "б":"b", "в":"v", "г":"g", "д":"d", "ђ":"đ", "е":"e", "ж":"ž", "з":"z", "и":"i",
  "ј":"j", "к":"k", "л":"l", "љ":"lj", "м":"m", "н":"n", "њ":"nj", "о":"o", "п":"p", "р":"r",
  "с":"s", "т":"t", "ћ":"ć", "у":"u", "ф":"f", "х":"h", "ц":"c", "ч":"č", "џ":"dž", "ш":"š",
  "А":"A", "Б":"B", "В":"V", "Г":"G", "Д":"D", "Ђ":"Đ", "Е":"E", "Ж":"Ž", "З":"Z", "И":"I",
  "Ј":"J", "К":"K", "Л":"L", "Љ":"Lj", "М":"M", "Н":"N", "Њ":"Nj", "О":"O", "П":"P", "Р":"R",
  "С":"S", "Т":"T", "Ћ":"Ć", "У":"U", "Ф":"F", "Х":"H", "Ц":"C", "Ч":"Č", "Џ":"Dž", "Ш":"Š"
};

function toLatinForTTS(text) {
  return String(text).replace(/[а-яА-ЯёЁђјљњћџЂЈЉЊЋЏ]/g, c => CYR_TO_LAT_TTS[c] || c);
}

function cleanTextForSpeech(text) {
  if (!text) return "";
  return String(text)
    .replace(/<[^>]+>/g, "")
    .replace(/___+/g, "")
    .replace(/\{\{_\}\}/g, "")
    .replace(/[\[\]]/g, "")
    .replace(/—/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSystemVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => /^sr[-_]/i.test(v.lang)) ||
         voices.find(v => /^hr[-_]/i.test(v.lang)) ||
         voices.find(v => /^bs[-_]/i.test(v.lang)) || null;
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => getSystemVoice();
}

function speakWithSystem(clean, stopAnim) {
  if (!("speechSynthesis" in window)) { stopAnim(); return; }
  window.speechSynthesis.cancel();
  const latinText = toLatinForTTS(clean);
  const u = new SpeechSynthesisUtterance(latinText);
  const v = getSystemVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "hr-HR"; }
  u.rate = 0.92;
  u.onend = stopAnim;
  u.onerror = stopAnim;
  window.speechSynthesis.speak(u);
}

function speak(text, btnEl = null) {
  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  // Очищаем предыдущие попытки воспроизведения
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (btnEl) btnEl.classList.add("speaking");
  const stopAnim = () => {
    if (btnEl) btnEl.classList.remove("speaking");
  };

  const gTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=sr&client=tw-ob&q=${encodeURIComponent(clean)}`;
  const audio = new Audio();
  audio.referrerPolicy = "no-referrer";
  currentAudio = audio;

  let fallbackTriggered = false;
  const triggerFallback = () => {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    if (currentAudio === audio) currentAudio = null;
    speakWithSystem(clean, stopAnim);
  };

  audio.onended = () => {
    stopAnim();
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    triggerFallback();
  };

  audio.src = gTtsUrl;
  const playPromise = audio.play();

  if (playPromise !== undefined) {
    playPromise.catch(() => {
      triggerFallback();
    });
  }
}

const SPEAK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;

function speakButtonHTML(text) {
  const clean = cleanTextForSpeech(text);
  if (!clean) return "";
  return `<button class="speak-btn" type="button" aria-label="Озвучить" data-speak="${esc(clean)}">${SPEAK_ICON}</button>`;
}

/* ================= YOUTUBE ВИДЕОПЛЕЕР ================= */
const REPLAY_ICON = `<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`;

function videoHeaderHTML(it) {
  if (!it.ytId) return "";
  const start = it.start || 0;
  const end = it.end ? `&end=${it.end}` : "";
  const origin = window.location.origin && window.location.origin !== "null" 
    ? `&origin=${encodeURIComponent(window.location.origin)}` 
    : "";

  const src = `https://www.youtube-nocookie.com/embed/${it.ytId}?start=${start}${end}&enablejsapi=1&rel=0&playsinline=1&modestbranding=1${origin}`;
  const duration = it.end ? `${it.start}s – ${it.end}s` : `${it.start}s`;

  return `
    <div class="video-wrap">
      <iframe id="yt-iframe" src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <div class="video-controls">
      <button class="vid-btn" id="vid-replay" type="button" data-start="${start}">
        ${REPLAY_ICON} <span>Понови одломак</span>
      </button>
      <button class="vid-btn" id="vid-rate" type="button" data-rate="1">
        <span>⚡ 1.0x</span>
      </button>
      <span class="vid-time">${duration}</span>
    </div>`;
}

function replayVideo(startSec) {
  const f = document.querySelector("#yt-iframe");
  if (!f || !f.contentWindow) return;
  f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [startSec, true] }), '*');
  f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
}

function setPlaybackRate(rate) {
  const f = document.querySelector("#yt-iframe");
  if (!f || !f.contentWindow) return;
  f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }), '*');
}

/* ================= ХРАНИЛИЩЕ И СОСТОЯНИЕ ================= */
const STORAGE_KEY = "srpski-progress-v1";
const LAST_KEY = "srpski-last-v1";
const KEYS = "АБВГДЂЕЖЗИ";
const CASES = ["Именительный","Родительный","Дательный","Винительный","Локатив","Инструментал"];
const CLITIC_POOL = ["сам","си","је","смо","сте","су","ће","ћу","ћеш","ћемо","би","бих","ми","ти","му","јој","нам","вам","им","ме","те","га","нас","вас","их","се","ли"];

function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

const progress = load(STORAGE_KEY, {});
for (const id in LESSONS) {
  progress[id] = progress[id] || {};
  for (const sec in LESSONS[id].sections) {
    const len = LESSONS[id].sections[sec].items.length;
    let arr = progress[id][sec];
    
    if (!Array.isArray(arr)) {
      progress[id][sec] = new Array(len).fill(null);
    } else if (arr.length < len) {
      // Добавились новые задания в конец — сохраняем старые и дописываем null
      progress[id][sec] = arr.concat(new Array(len - arr.length).fill(null));
    } else if (arr.length > len) {
      // Задания удалили — аккуратно обрезаем хвост
      progress[id][sec] = arr.slice(0, len);
    }
  }
}
const saveProgress = () => store(STORAGE_KEY, progress);

const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle = arr => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const lc = s => String(s).toLocaleLowerCase("sr");
const cap = s => s.charAt(0).toLocaleUpperCase("sr") + s.slice(1);
const pad = n => String(n).padStart(2, "0");

const LAT2CYR = [["dž","џ"],["lj","љ"],["nj","њ"],["a","а"],["b","б"],["c","ц"],["č","ч"],["ć","ћ"],["d","д"],["đ","ђ"],["e","е"],["f","ф"],["g","г"],["h","х"],["i","и"],["j","ј"],["k","к"],["l","л"],["m","м"],["n","н"],["o","о"],["p","п"],["r","р"],["s","с"],["š","ш"],["t","т"],["u","у"],["v","в"],["z","з"],["ž","ж"],["dj","ђ"]];
function toCyr(s) {
  let out = s.replace(/dj/g, "ђ");
  for (const [l, c] of LAT2CYR) out = out.split(l).join(c);
  return out;
}
function normalize(s) {
  return toCyr(String(s).toLowerCase().replace(/<[^>]+>/g, ""))
    .replace(/[.,!?;:"«»„“”'’…()]/g, "")
    .replace(/\s+/g, " ").trim();
}
function stripDiacritics(s) {
  return String(s).replace(/[чčћć]/g, "c").replace(/[жž]/g, "z").replace(/[шš]/g, "s").replace(/[ђđ]/g, "dj").replace(/[џ]/g, "dz");
}

const SESSION_TARGET = 12;

function lessonStats(id) {
  let total = 0, done = 0;
  if (!LESSONS[id] || !progress[id]) return { total, done };
  for (const sec in LESSONS[id].sections) {
    const arr = progress[id][sec];
    if (!arr) continue;
    const target = Math.min(SESSION_TARGET, arr.length);
    const solved = arr.filter(x => x === true).length;
    total += target;
    done += Math.min(solved, target);
  }
  return { total, done };
}

function firstUnfinished(id) {
  if (!LESSONS[id] || !LESSONS[id].sections) return "";
  const secs = Object.keys(LESSONS[id].sections);
  return secs.find(s => progress[id] && progress[id][s] && progress[id][s].some(x => x !== true)) || secs[0];
}

/* ================= 1. ВИРТУАЛЬНАЯ КЛАВИАТУРА ДЛЯ IPHONE / SAFARI ================= */
const SR_LETTERS = ["ч", "ж", "ш", "ђ", "ћ", "џ", "ј", "љ", "њ"];
let activeInput = null;
let kbEl = null;

function positionKeyboardForVisualViewport() {
  if (!kbEl || kbEl.hidden) return;
  
  // Узнаем актуальную высоту нижней панели с кнопкой "Проверить"
  const barEl = document.querySelector(".actionbar");
  const barH = barEl ? barEl.offsetHeight : 80;

  if (window.visualViewport) {
    const vv = window.visualViewport;
    // Смещение снизу (высота системной клавиатуры iOS/Android)
    const bottomOffset = window.innerHeight - (vv.offsetTop + vv.height);
    
    // Если системная клавиатура телефона открыта (занимает больше 100px)
    if (bottomOffset > 100) {
      kbEl.style.bottom = `${bottomOffset + 8}px`;
    } else {
      // Клавиатура закрыта (или открыто на десктопе): держим плашку строго НАД кнопкой "Проверить"
      kbEl.style.bottom = `calc(${barH}px + 12px + var(--safe-b))`;
    }
  } else {
    kbEl.style.bottom = `calc(${barH}px + 12px + var(--safe-b))`;
  }
}

let vvHandlerAttached = false;

function setupVisualViewportListeners() {
  if (window.visualViewport && !vvHandlerAttached) {
    window.visualViewport.addEventListener("resize", positionKeyboardForVisualViewport);
    window.visualViewport.addEventListener("scroll", positionKeyboardForVisualViewport);
    vvHandlerAttached = true;
  }
}

function showVirtualKeyboard(inp) {
  activeInput = inp;
  setupVisualViewportListeners();

  if (!kbEl) {
    kbEl = document.createElement("div");
    kbEl.className = "sr-virtual-kb";
    kbEl.innerHTML = SR_LETTERS.map(ch => `<button class="sr-key" type="button" data-ch="${ch}">${ch}</button>`).join("");
    document.body.appendChild(kbEl);

    // Предотвращаем потерю фокуса инпутом при тапе по клавише
    kbEl.addEventListener("pointerdown", e => {
      e.preventDefault();
      const k = e.target.closest(".sr-key");
      if (!k || !activeInput) return;
      const ch = k.dataset.ch;
      const start = activeInput.selectionStart ?? activeInput.value.length;
      const end = activeInput.selectionEnd ?? activeInput.value.length;
      const val = activeInput.value;
      
      activeInput.value = val.slice(0, start) + ch + val.slice(end);
      activeInput.selectionStart = activeInput.selectionEnd = start + ch.length;
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      activeInput.focus();
    });
  }

  kbEl.hidden = false;
  positionKeyboardForVisualViewport();
}

function hideVirtualKeyboard() {
  if (kbEl) {
    kbEl.hidden = true;
    kbEl.style.bottom = "";
  }
  activeInput = null;
}

/* ================= 2. ТЕМА ================= */
const SUN_ICON = `<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0 0 1.41l1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>`;

let curTheme = load("srpski-theme", null);
if (!curTheme) {
  curTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t) {
  curTheme = t;
  document.documentElement.setAttribute("data-theme", t);
  store("srpski-theme", t);
  const icon = t === "dark" ? SUN_ICON : MOON_ICON;
  document.querySelectorAll(".theme-toggle-btn").forEach(b => b.innerHTML = icon);
}
applyTheme(curTheme);

function toggleTheme() {
  applyTheme(curTheme === "dark" ? "light" : "dark");
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".theme-toggle-btn");
  if (btn) toggleTheme();
});

/* ================= 3. ГЛАВНЫЙ ЭКРАН (HOME) ================= */
const VALID_TABS = ["a2", "b1", "b2", "c1", "lex"];
let activeTab = load("srpski-active-tab", "a2");
if (!VALID_TABS.includes(activeTab)) { activeTab = "a2"; store("srpski-active-tab", "a2"); }

const homeEl = $("#home");
const lessonEl = $("#lesson");

function stop(id, num) {
  const { total, done } = lessonStats(id);
  return `<li class="${total && done === total ? "done" : ""}">${lessonCard(id, num)}</li>`;
}

function lessonCard(id, num) {
  const l = LESSONS[id];
  const { total, done } = lessonStats(id);
  const pct = total ? Math.round(done / total * 100) : 0;
  const isNew = NEW_IDS.includes(id);
  const cls = ["lesson-card", isNew && done === 0 ? "is-new" : "", pct === 100 ? "is-done" : ""].join(" ");
  return `<button class="${cls}" data-id="${id}">
    <div class="lc-body">
      <div class="lc-icon">${ICONS[id] || ""}</div>
      <div class="lc-stop">Стајалиште ${pad(num)}${isNew && done === 0 ? ` <span class="badge-new">ново</span>` : ""}</div>
      <div class="lc-title">${l.title}</div>
      <div class="lc-lat">${l.lat}</div>
      <div class="lc-desc">${l.desc}</div>
      <div class="lc-meta"><div class="bar"><i style="width:${pct}%"></i></div><span>${done} / ${total}</span></div>
    </div>
  </button>`;
}

function renderHome() {
  let totalAll = 0, doneAll = 0;
  for (const id of ALL_IDS) { 
    const s = lessonStats(id); 
    totalAll += s.total; 
    doneAll += s.done; 
  }
  const overallPct = totalAll ? Math.round(doneAll / totalAll * 100) : 0;

  const tabMap = {
    a2: { title: "A2 Экспресс", ids: LINE_A2_IDS, class: "l-a2" },
    b1: { title: "B1 Каркас и падежи", ids: LINE_B1_IDS, class: "l-b1" },
    b2: { title: "B2 Беглая речь", ids: LINE_B2_IDS, class: "l-b2" },
    c1: { title: "C1 Мастерство", ids: LINE_C1_IDS, class: "l-c1" },
    lex: { title: "Лексика и говор", ids: LINE_LEX_IDS, class: "l-lex" }
  };
  const currentTabInfo = tabMap[activeTab] || tabMap.a2;

  let curTabDone = 0;
  currentTabInfo.ids.forEach(id => {
    const s = lessonStats(id);
    if (s.total > 0 && s.done === s.total) curTabDone++;
  });
  const curTabTotal = currentTabInfo.ids.length;

  const last = load(LAST_KEY, null);
  const contId = (last && LESSONS[last.id]) 
    ? last.id 
    : (currentTabInfo.ids.find(id => lessonStats(id).done < lessonStats(id).total) || currentTabInfo.ids[0] || ALL_IDS[0]);

  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (overallPct / 100) * circumference;

  const getTabSub = (ids) => {
    let completed = 0;
    ids.forEach(id => {
      const s = lessonStats(id);
      if (s.total > 0 && s.done === s.total) completed++;
    });
    return completed === ids.length ? "✓" : `${completed}/${ids.length}`;
  };

  homeEl.innerHTML = `
    <header class="header-bar">
      <div class="brand">Српски<span>.</span></div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="theme-toggle-btn" type="button" aria-label="Сменить тему">${curTheme === "dark" ? SUN_ICON : MOON_ICON}</button>
        <div class="header-badge">${doneAll} / ${totalAll} решено</div>
      </div>
    </header>

    <section class="progress-card">
      <div class="progress-ring-wrap">
        <svg class="progress-ring" viewBox="0 0 68 68">
          <circle class="bg" cx="34" cy="34" r="${radius}"></circle>
          <circle class="bar-ring" cx="34" cy="34" r="${radius}" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${strokeOffset}">
          </circle>
        </svg>
        <div class="progress-ring-text">${overallPct}%</div>
      </div>
      <div class="progress-info">
        <h3>${currentTabInfo.title}</h3>
        <p>Пройдено ${curTabDone} из ${curTabTotal} станций</p>
        <button class="continue-chip" data-id="${contId}">
          <span>Настави:</span> <b>${LESSONS[contId].title} →</b>
        </button>
      </div>
    </section>

    <div class="exam-hub-card">
      <div class="eh-info">
        <h3>Испитни центар 🎓</h3>
        <p>Тестирование, срез уровней и работа над ошибками</p>
      </div>
      <button class="eh-btn" id="open-exam-hub" type="button">Покрени тест</button>
    </div>

    <nav class="level-tabs" aria-label="Нивои">
      <button class="level-tab${activeTab === 'a2' ? ' active' : ''}" data-tab="a2">
        <span class="tab-title">A2</span>
        <span class="tab-sub">${getTabSub(LINE_A2_IDS)}</span>
      </button>
      <button class="level-tab${activeTab === 'b1' ? ' active' : ''}" data-tab="b1">
        <span class="tab-title">B1</span>
        <span class="tab-sub">${getTabSub(LINE_B1_IDS)}</span>
      </button>
      <button class="level-tab${activeTab === 'b2' ? ' active' : ''}" data-tab="b2">
        <span class="tab-title">B2</span>
        <span class="tab-sub">${getTabSub(LINE_B2_IDS)}</span>
      </button>
      <button class="level-tab${activeTab === 'c1' ? ' active' : ''}" data-tab="c1">
        <span class="tab-title">C1</span>
        <span class="tab-sub">${getTabSub(LINE_C1_IDS)}</span>
      </button>
      <button class="level-tab${activeTab === 'lex' ? ' active' : ''}" data-tab="lex">
        <span class="tab-title">Лексика</span>
        <span class="tab-sub">${getTabSub(LINE_LEX_IDS)}</span>
      </button>
    </nav>

    <ol class="route ${currentTabInfo.class}">
      ${currentTabInfo.ids.map(id => stop(id, ALL_IDS.indexOf(id) + 1)).join("")}
    </ol>

    <div class="home-foot">
      <div>Ответы можно вводить кириллицей или латиницей.</div>
      <div class="data-tools">
        <button class="data-btn" id="btn-export" type="button">Экспорт (скачать .json)</button>
        <button class="data-btn" id="btn-import" type="button">Импорт</button>
        <button class="data-btn" id="btn-full-reset" type="button" style="color: var(--red);">Сбросить всё</button>
      </div>
    </div>
  `;

  $("#btn-export")?.addEventListener("click", exportProgress);
  $("#btn-import")?.addEventListener("click", importProgress);
  $("#btn-full-reset")?.addEventListener("click", fullResetProgress);
  $("#open-exam-hub")?.addEventListener("click", openExamModal);

  homeEl.querySelectorAll(".route [data-id], .continue-chip[data-id]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      const sec = last && last.id === id ? last.section : null;
      openLesson(id, sec);
    });
  });

  homeEl.querySelectorAll(".level-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      store("srpski-active-tab", activeTab);
      renderHome();
    });
  });
}

/* ================= 4. ДВИЖОК УРОКОВ ================= */
let cur = { id: null, section: null, index: 0, order: [], state: {}, phase: "answer" };

const els = {
  title: $("#lt-title"),
  sections: $("#sections"),
  track: $("#track"),
  exercise: $("#exercise"),
  bar: $("#actionbar-inner"),
  sheet: $("#rule-sheet"),
  ruleBody: $("#rule-body"),
};

function getCurrentLevelInfo(lessonId) {
  if (LINE_A2_IDS.includes(lessonId)) return { name: "A2", cls: "l-a2" };
  if (LINE_B1_IDS.includes(lessonId)) return { name: "B1", cls: "l-b1" };
  if (LINE_B2_IDS.includes(lessonId)) return { name: "B2", cls: "l-b2" };
  if (LINE_C1_IDS.includes(lessonId)) return { name: "C1", cls: "l-c1" };
  if (LINE_LEX_IDS.includes(lessonId)) return { name: "LEX", cls: "l-lex" };
  return { name: "Урок", cls: "" };
}

function openLesson(id, section) {
  cur.isExam = false;
  $("#rule-btn").hidden = false;
  $("#reset").hidden = false;
  const l = LESSONS[id];
  if (!l) return;
  cur.id = id;
  cur.section = section && l.sections[section] ? section : firstUnfinished(id);
  homeEl.hidden = true;
  lessonEl.hidden = false;
  startSection();
  const num = ALL_IDS.indexOf(id) + 1;
  const lvl = getCurrentLevelInfo(id);
  els.title.innerHTML = `
    <small><span class="level-pill ${lvl.cls}">${lvl.name}</span> · Урок ${num} · ${cur.section}</small>
    <b>${l.title}</b>`;
  els.ruleBody.innerHTML = l.rule;
  window.scrollTo(0, 0);
}

function goHome() {
  cur.isExam = false;
  $("#rule-btn").hidden = false;
  $("#reset").hidden = false;
  lessonEl.hidden = true;
  homeEl.hidden = false;
  closeRule();
  renderHome();
  window.scrollTo(0, 0);
}

function section() {
  if (cur.isExam && cur.examQueue && cur.examQueue[cur.index]) {
    const q = cur.examQueue[cur.index];
    return LESSONS[q.lessonId].sections[q.secName];
  }
  return LESSONS[cur.id]?.sections[cur.section];
}

function realIndex() {
  if (cur.isExam && cur.examQueue && cur.examQueue[cur.index]) {
    return cur.examQueue[cur.index].itemIdx;
  }
  return cur.order ? cur.order[cur.index] : 0;
}

function item() {
  if (cur.isExam && cur.examQueue && cur.examQueue[cur.index]) {
    return cur.examQueue[cur.index].item;
  }
  return section()?.items[realIndex()];
}

const SESSION_LIMIT = 12;

function startSection() {
  const sec = section();
  if (!sec) return;

  const l = LESSONS[cur.id];
  const num = ALL_IDS.indexOf(cur.id) + 1;
  const lvl = getCurrentLevelInfo(cur.id);
  els.title.innerHTML = `
    <small><span class="level-pill ${lvl.cls}">${lvl.name}</span> · Урок ${num} · ${cur.section}</small>
    <b>${l.title}</b>`;
  
  const arr = progress[cur.id][cur.section];
  const idxs = sec.items.map((_, i) => i);
  const pending = idxs.filter(i => arr[i] !== true);
  const solved = idxs.filter(i => arr[i] === true);

  if (sec.shuffle === false) {
    cur.order = [...pending, ...solved].slice(0, SESSION_LIMIT);
  } else {
    cur.order = shuffle([...shuffle(pending), ...shuffle(solved)]).slice(0, SESSION_LIMIT);
  }

  cur.index = 0;
  store(LAST_KEY, { id: cur.id, section: cur.section });
  render();
}

function renderSections() {
  const secs = LESSONS[cur.id].sections;
  els.sections.innerHTML = Object.keys(secs).map(name => {
    const arr = (progress[cur.id] && progress[cur.id][name]) || [];
    const target = Math.min(SESSION_TARGET, arr.length);
    const solved = arr.filter(x => x === true).length;
    const d = Math.min(solved, target);
    return `<button class="sec-btn${name === cur.section ? " active" : ""}" data-sec="${esc(name)}">${name}<span class="done-mark">${d}/${target}</span></button>`;
  }).join("");
  els.sections.querySelectorAll(".sec-btn").forEach(b => b.addEventListener("click", () => {
    cur.section = b.dataset.sec;
    startSection();
  }));
  const active = els.sections.querySelector(".active");
  if (active) active.scrollIntoView({ inline: "center", block: "nearest" });
}

function renderTrack(finished = false) {
  const arr = progress[cur.id][cur.section];
  els.track.innerHTML = cur.order.map((ri, i) => {
    let c = arr[ri] === true ? "ok" : arr[ri] === false ? "bad" : "";
    if (!finished && i === cur.index && cur.phase === "answer") c = "cur";
    return `<i class="${c}"></i>`;
  }).join("");
}

function srLine(s) {
  return String(s).replace(/___/g, '<span class="gap"></span>');
}

function blankInput(idx) {
  return `<input class="blank" data-idx="${idx}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">`;
}

function viewChoice(it) {
  let h = videoHeaderHTML(it);
  if (it.setup) h += `<div class="ex-setup">${it.setup}</div>`;
  if (it.ru) h += `<p class="ex-ru">${it.ru}</p>`;
  if (it.sr) h += `<p class="ex-sr" lang="sr">${srLine(it.sr)} ${speakButtonHTML(it.sr)}</p>`;
  if (it.adj) h += `<p class="ex-note">Прилагательное: <b lang="sr">${it.adj}</b></p>`;
  cur.state.opts = it.opts ? shuffle(it.opts) : [];
  h += `<div class="opts">${cur.state.opts.map((o, i) =>
    `<button class="opt" data-v="${esc(o)}"><span class="key">${KEYS[i]}</span><span lang="sr">${o}</span></button>`).join("")}</div>`;
  return h;
}

function viewCase(it) {
  let h = videoHeaderHTML(it); 
  if (it.ru) h += `<p class="ex-ru">${it.ru}</p>`;
  h += `<p class="ex-sr" lang="sr">${srLine(it.sr)} ${speakButtonHTML(it.sr)}</p>`;
  if (it.adjective) h += `<p class="ex-note">Прилагательное: <b lang="sr">${it.adjective}</b></p>`;
  h += `<div class="opts cases">${CASES.map((c, i) =>
    `<button class="opt" data-v="${c}"><span class="key">${KEYS[i]}</span><span>${c}</span></button>`).join("")}</div>`;
  return h;
}

function viewFill(it) {
  let h = videoHeaderHTML(it);
  if (it.ru) h += `<p class="ex-ru">${it.ru}</p>`;
  const parts = it.sr.replace(/___/g, "{{_}}").split("{{_}}");
  h += `<div class="fill-line" lang="sr">${parts.map((p, i) => p + (i < parts.length - 1 ? blankInput(i) : "")).join("")} ${speakButtonHTML(it.sr)}</div>`;
  if (it.adj) h += `<p class="ex-note">Прилагательное: <b lang="sr">${it.adj}</b></p>`;
  if (it.blank) h += `<p class="ex-note">Впиши форму: <b lang="sr">${toCyr(it.blank)}</b></p>`;
  return h;
}

function viewFindError(it) {
  cur.state.clicked = null;
  const sentence = it.words.join(" ");
  let h = videoHeaderHTML(it); // <-- ДОБАВИТЬ ЭТУ СТРОКУ
  h += (it.ru ? `<p class="ex-ru">${it.ru}</p>` : "") + 
       `<p class="ex-hint">Нажми на слово с ошибкой. ${speakButtonHTML(sentence)}</p><div class="words" lang="sr">`;
  it.words.forEach((w, i) => {
    h += w === "…" ? `<span class="word hidden-noun">…</span>` : `<button class="word" data-i="${i}">${w}</button>`;
  });
  return h + `</div>`;
}

function viewOrder(it) {
  let chips = it.chips.slice();
  if (chips.length <= 2) {
    const extra = shuffle(CLITIC_POOL.filter(c => !chips.map(lc).includes(c) && !it.correct.map(lc).includes(c) && !normalize(it.prefix + " " + it.suffix).split(" ").includes(c)));
    chips = chips.concat(extra.slice(0, 5 - chips.length));
  }
  cur.state.chips = shuffle(chips.map(lc));
  cur.state.capFirst = !(it.prefix || "").trim();
  cur.state.placed = [];
  let h = videoHeaderHTML(it);
  h += `<p class="ex-ru">${it.ru}</p>`;
  h += `<div class="build" lang="sr">${it.prefix || ""} <span class="slot" id="slot"></span> ${it.suffix || ""}</div>`;
  h += `<p class="ex-hint">Нажимай на слова по порядку. Нажми на слово в рамке, чтобы вернуть его.</p>`;
  h += `<div class="bank" lang="sr">${cur.state.chips.map((c, i) => `<button class="chip" data-ci="${i}">${c}</button>`).join("")}</div>`;
  return h;
}

function render() {
  cur.phase = "answer";
  cur.state = {};
  renderBar(); 
  renderSections();
  renderTrack();
  const it = item();
  const fmt = section().format;
  const intro = `<p class="ex-intro">${section().intro}</p>`;
  let html = "";
  switch (fmt) {
    case "choice": case "choice-live": case "video-choice": html = viewChoice(it); break;
    case "case-ident": case "case-only": html = viewCase(it); break;
    case "fill": case "fill-form": case "video-gap": html = viewFill(it); break;
    case "find-error": html = viewFindError(it); break;
    case "order": case "video-order": html = viewOrder(it); break;
  }

  const lvl = getCurrentLevelInfo(cur.id);
  const l = LESSONS[cur.id];
  const stepCurrent = cur.index + 1;
  const stepTotal = cur.order.length;

  const metaHeader = `
    <div class="card-meta">
      <div class="card-breadcrumbs">
        <span class="level-pill ${lvl.cls}">${lvl.name}</span>
        <span class="crumb-lesson">${esc(l.title)}</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-section">${esc(cur.section)}</span>
      </div>
      <div class="card-counter">${stepCurrent} / ${stepTotal}</div>
    </div>`;

  els.exercise.className = "card";
  els.exercise.innerHTML = metaHeader + intro + html + `
    <div class="tools">
      <button class="tool" data-tool="hint">Подсказка</button>
      <button class="tool" data-tool="answer">Показать ответ</button>
    </div>
    <div id="tip"></div>`;

  bindExercise(fmt, it);
  els.exercise.querySelector('[data-tool="hint"]')?.addEventListener("click", showHint);
  els.exercise.querySelector('[data-tool="answer"]')?.addEventListener("click", showAnswer);
  renderBar();
}

function showHint() {
  const it = item();
  const tipEl = $("#tip");
  if (!tipEl) return;
  const hintText = it.hint || it.why || "Для этого задания нет отдельной подсказки.";
  tipEl.innerHTML = `
    <div class="tip">
      <div class="tip-ico">${DZEZVA}</div>
      <div><small>Подсказка</small><div>${hintText}</div></div>
    </div>`;
}

function showAnswer() {
  const it = item();
  const tipEl = $("#tip");
  if (!tipEl) return;
  const fmt = section().format;
  let ansText = "";

  if (fmt === "order" || fmt === "video-order") {
    ansText = `${it.prefix || ""} <b>${it.correct.join(" ")}</b> ${it.suffix || ""}`.trim();
  } else if (fmt === "find-error") {
    ansText = `Ошибка в слове «<b>${it.words[it.err]}</b>» → правильно: <b>${it.correct}</b>`;
  } else if (Array.isArray(it.ans)) {
    ansText = it.ans.join(" / ");
  } else {
    ansText = it.ans || "";
  }

  tipEl.innerHTML = `
    <div class="tip">
      <div class="tip-ico">${DZEZVA}</div>
      <div><small>Правильный ответ</small><div>${ansText}</div></div>
    </div>`;
}

function bindExercise(fmt, it) {
  const ex = els.exercise;
  ex.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => {
    ex.querySelectorAll(".opt").forEach(o => o.classList.remove("sel"));
    b.classList.add("sel");
    cur.state.selected = b.dataset.v;
    renderBar();
  }));
  ex.querySelectorAll(".blank").forEach(inp => {
    // Автоматический расчёт ширины при первом рендере
    inp.style.width = Math.max(7, inp.value.length + 2) + "ch";

    inp.addEventListener("focus", () => {
      showVirtualKeyboard(inp);
    });

    inp.addEventListener("blur", () => {
      // Небольшая задержка, чтобы успел сработать pointerdown по кнопкам клавиатуры
      setTimeout(() => {
        if (document.activeElement !== inp && !kbEl?.contains(document.activeElement)) {
          hideVirtualKeyboard();
        }
      }, 120);
    });
  inp.addEventListener("input", () => {
    inp.style.width = Math.max(7, inp.value.length + 2) + "ch";
    renderBar();
  });
});
  ex.querySelectorAll(".word[data-i]").forEach(w => w.addEventListener("click", () => {
    ex.querySelectorAll(".word").forEach(x => x.classList.remove("sel"));
    w.classList.add("sel");
    cur.state.clicked = +w.dataset.i;
    renderBar();
  }));
  ex.querySelectorAll(".bank .chip").forEach(c => c.addEventListener("click", () => {
    cur.state.placed.push(+c.dataset.ci);
    c.classList.add("used");
    drawSlot();
  
  }));

  const replayBtn = ex.querySelector("#vid-replay");
  if (replayBtn) replayBtn.addEventListener("click", () => replayVideo(+replayBtn.dataset.start));

  const rateBtn = ex.querySelector("#vid-rate");
  if (rateBtn) {
    rateBtn.addEventListener("click", () => {
      const curRate = +rateBtn.dataset.rate;
      const nextRate = curRate === 1 ? 0.75 : 1;
      rateBtn.dataset.rate = nextRate;
      rateBtn.querySelector("span").textContent = `⚡ ${nextRate}x`;
      setPlaybackRate(nextRate);
    });
  }
}

function drawSlot() {
  const slot = $("#slot");
  slot.innerHTML = cur.state.placed.map((ci, pos) => {
    const w = cur.state.chips[ci];
    return `<button class="chip" data-pos="${pos}">${pos === 0 && cur.state.capFirst ? cap(w) : w}</button>`;
  }).join("");
  slot.classList.toggle("filled", cur.state.placed.length > 0);
  slot.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
    const pos = +c.dataset.pos;
    const ci = cur.state.placed[pos];
    cur.state.placed.splice(pos, 1);
    els.exercise.querySelector(`.bank .chip[data-ci="${ci}"]`).classList.remove("used");
    drawSlot();
  }));
  renderBar();
}

function hasAnswer() {
  const fmt = (cur.isExam && cur.examQueue) ? cur.examQueue[cur.index].format : section()?.format;
  if (["choice","choice-live","case-ident","case-only","video-choice"].includes(fmt)) return !!cur.state.selected;
  if (fmt === "find-error") return cur.state.clicked != null;
  if (fmt === "order" || fmt === "video-order") return cur.state.placed && cur.state.placed.length > 0;
  return [...els.exercise.querySelectorAll(".blank")].every(i => i.value.trim());
}

const barObserver = new ResizeObserver(() => {
  document.documentElement.style.setProperty("--bar-h", els.bar.parentElement.offsetHeight + "px");
});
barObserver.observe(els.bar.parentElement);

function renderBar() {
  if (cur.phase === "answer") {
    els.bar.innerHTML = `<button class="primary" id="check"${hasAnswer() ? "" : " disabled"}>Проверить</button>`;
    $("#check").addEventListener("click", check);
  }
}

const EXAM_ERRORS_KEY = "srpski-exam-errors-v1";
let examErrors = load(EXAM_ERRORS_KEY, {}); // формат: { "lessonId:secName:idx": true }

function saveExamErrors() {
  store(EXAM_ERRORS_KEY, examErrors);
}

function check() {
  if (!hasAnswer()) return;
  const it = item();
  if (!it) return;

  const fmt = (cur.isExam && cur.examQueue) ? cur.examQueue[cur.index].format : section().format;
  const ex = els.exercise;
  let ok = false, user = "", right = "";

  if (["choice","choice-live","case-ident","case-only","video-choice"].includes(fmt)) {
    user = cur.state.selected; right = it.ans; ok = user === right;
    ex.querySelectorAll(".opt").forEach(o => {
      if (o.dataset.v === right) o.classList.add("right");
      else if (o.dataset.v === user) o.classList.add("wrong");
      o.classList.remove("sel");
    });
  } else if (fmt === "fill" || fmt === "fill-form" || fmt === "video-gap") {
    const answers = Array.isArray(it.ans) ? it.ans : [it.ans];
    const inputs = [...ex.querySelectorAll(".blank")];
    ok = true;
    inputs.forEach((inp, i) => {
      const accepted = [answers[i], ...(i === 0 && it.alt ? it.alt : [])];
      const userNorm = normalize(inp.value);
      const good = accepted.some(x => {
        const targetNorm = normalize(x);
        return userNorm === targetNorm || stripDiacritics(userNorm) === stripDiacritics(targetNorm);
      });
      if (!good) ok = false;
      inp.classList.add(good ? "right" : "wrong");
      inp.readOnly = true;
      if (!good) inp.insertAdjacentHTML("afterend", `<span class="fix">${answers[i]}</span>`);
    });
    right = answers.join(" / ");
  } else if (fmt === "find-error") {
    ok = cur.state.clicked === it.err;
    ex.querySelectorAll(".word[data-i]").forEach(w => {
      const i = +w.dataset.i;
      w.classList.remove("sel");
      if (i === it.err) { 
        w.classList.add(ok ? "right" : "wrong"); 
        const corrLabel = it.correct === "—" ? "(сувишно / брише се)" : it.correct;
        w.innerHTML = `<s>${it.words[i]}</s><span class="corr">${corrLabel}</span>`; 
      } else if (i === cur.state.clicked) {
        w.classList.add("wrong");
      }
    });
    right = it.correct === "—" ? `«${it.words[it.err]}» је сувишно` : `${it.words[it.err]} → ${it.correct}`;
  } else if (fmt === "order" || fmt === "video-order") {
    const got = cur.state.placed.map(ci => cur.state.chips[ci]);
    ok = got.length === it.correct.length && got.every((c, i) => c === lc(it.correct[i]));
    right = it.correct.join(" ");
    const slot = $("#slot");
    slot.classList.add(ok ? "right" : "wrong");
    if (!ok) ex.querySelector(".build").insertAdjacentHTML("afterend", `<div class="answer-line">Верно: ${it.prefix || ""} <b>${right}</b> ${it.suffix || ""}</div>`);
  }

  ex.classList.add("locked");

  if (cur.isExam) {
    const q = cur.examQueue[cur.index];
    q.result = ok;

    const errKey = `${q.lessonId}:${q.secName}:${q.itemIdx}`;
    if (!ok) {
      examErrors[errKey] = true;
    } else {
      delete examErrors[errKey];
    }
    saveExamErrors();

    // Обновляем основной прогресс ТОЛЬКО если ответ правильный (улучшаем, но не ломаем)
    if (ok && progress[q.lessonId]?.[q.secName]) {
      progress[q.lessonId][q.secName][q.itemIdx] = true;
      saveProgress();
    }
  } else {
    progress[cur.id][cur.section][realIndex()] = ok;
    saveProgress();
  }

  cur.phase = "result";
  if (cur.isExam) renderExamTrack();
  else { renderTrack(); renderSections(); }

  const why = it.why || it.hint || "";
  let fullSentenceToSpeak = it.sr ? it.sr.replace(/___|\{\{_\}\}/g, right) : right;

  els.bar.innerHTML = `
    <div class="feedback ${ok ? "ok" : "bad"}">
      <div class="fb-title">${ok ? "Браво!" : "Опасно близу!"}<span class="fb-sub">${ok ? "тачно" : "нетачно"}</span> ${speakButtonHTML(fullSentenceToSpeak)}</div>
      ${ok ? "" : `<div class="fb-ans">Тачан одговор: <b lang="sr">${right}</b></div>`}
      ${why ? `<div class="fb-why">${why}</div>` : ""}
    </div>
    <button class="primary" id="next">Даље →</button>`;
  $("#next").addEventListener("click", next);
  $("#tip").innerHTML = "";
  ex.querySelector(".tools")?.remove();
}

function next() {
  cur.phase = "answer";
  if (els.bar) els.bar.innerHTML = "";
  const totalItems = cur.isExam ? cur.examQueue.length : cur.order.length;
  if (cur.index < totalItems - 1) {
    cur.index++;
    if (cur.isExam) renderExamQuestion();
    else render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    if (cur.isExam) finishExam();
    else finish();
  }
}

function finish() {
  cur.phase = "done";
  renderTrack(true);
  const sessionTotal = cur.order.length;
  const arr = progress[cur.id][cur.section];
  const sessionSolved = cur.order.filter(ri => arr[ri] === true).length;
  const secs = Object.keys(LESSONS[cur.id].sections);
  const nextSec = secs[secs.indexOf(cur.section) + 1];

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="finish">
      <div class="stolnjak"><b>${sessionSolved === sessionTotal ? "Живели!" : sessionSolved >= sessionTotal * 0.7 ? "Браво!" : "Ајде опет!"}</b></div>
      ${sessionSolved === sessionTotal ? `<div class="rakija">${RAKIJA}</div>` : ""}
      <div class="finish-num">${sessionSolved}<span> / ${sessionTotal}</span></div>
      <p>${sessionSolved === sessionTotal ? "Блок је савладан без грешке!" : "Добар резултат! Понови задатке да утврдиш градиво."}</p>
      <div class="row">
        <button class="secondary" id="again">Понови сесију</button>
      </div>
    </div>`;
  $("#again").addEventListener("click", startSection);
  els.bar.innerHTML = nextSec
    ? `<button class="primary" id="nextsec">Следеће: ${nextSec}</button>`
    : `<button class="primary" id="tohome">Повратак на списак лекција</button>`;
  if (nextSec) $("#nextsec").addEventListener("click", () => { cur.section = nextSec; startSection(); window.scrollTo(0, 0); });
  else $("#tohome").addEventListener("click", goHome);
}

function resetSection() {
  if (!confirm(`Ресетовати напредак за део «${cur.section}»?`)) return;
  const len = section().items.length;
  progress[cur.id][cur.section] = new Array(len).fill(null);
  saveProgress();
  startSection();
}

function openRule() {
  const l = LESSONS[cur.id];
  const sec = section();
  const body = $("#rule-body");
  const sheet = $("#rule-sheet");
  if (body && l) {
    body.innerHTML = (sec && sec.rule) || l.rule || "<p>Правило ускоро стиже.</p>";
  }
  if (sheet) {
    sheet.hidden = false;
    sheet.removeAttribute("hidden");
  }
}

function closeRule() {
  const sheet = $("#rule-sheet");
  if (sheet) {
    sheet.hidden = true;
    sheet.setAttribute("hidden", "");
  }
}

$("#back").addEventListener("click", goHome);
$("#rule-btn").addEventListener("click", openRule);
$("#rule-close").addEventListener("click", closeRule);
$("#rule-bg").addEventListener("click", closeRule);
$("#reset").addEventListener("click", resetSection);

document.addEventListener("keydown", e => {
  if (lessonEl.hidden) return;
  if (e.key === "Escape" && !els.sheet.hidden) { closeRule(); return; }
  if (e.key !== "Enter") return;

  // Ищем доступную кнопку по приоритету фазы урока
  const btn = $("#next") 
           || $("#check") 
           || $("#nextsec") 
           || $("#tohome") 
           || $("#exam-to-home")
           || $("#btn-start-exam-now");

  if (btn && !btn.disabled) {
    e.preventDefault();
    btn.click();
  }
});

document.addEventListener("click", e => {
  const btn = e.target.closest(".speak-btn");
  if (btn && btn.dataset.speak) {
    e.stopPropagation();
    speak(btn.dataset.speak, btn);
  }
});

/* ================= 5. ЭКЗАМЕНАЦИОННЫЙ ЦЕНТР ================= */
let examConfig = { mode: "daily", level: "a2", count: 24 };

function getExamAvailableCounts() {
  let mistakes = 0, video = 0;
  for (const id in LESSONS) {
    for (const sec in LESSONS[id].sections) {
      const items = LESSONS[id].sections[sec].items;
      const pArr = progress[id]?.[sec] || [];
      items.forEach((it, idx) => {
        if (pArr[idx] === false) mistakes++;
        if (it.ytId) video++;
      });
    }
  }
  return { mistakes, video };
}

function buildExamQueue(cfg) {
  const allQuestions = [];
  const levelMap = { a2: LINE_A2_IDS, b1: LINE_B1_IDS, b2: LINE_B2_IDS, c1: LINE_C1_IDS, lex: LINE_LEX_IDS };

  for (const lessonId in LESSONS) {
    const l = LESSONS[lessonId];
    let lvl = "a2";
    for (const [k, ids] of Object.entries(levelMap)) {
      if (ids.includes(lessonId)) { lvl = k; break; }
    }
    for (const secName in l.sections) {
      const sec = l.sections[secName];
      sec.items.forEach((it, idx) => {
        const status = progress[lessonId]?.[secName]?.[idx] ?? null;
        allQuestions.push({ lessonId, secName, itemIdx: idx, item: it, format: sec.format, intro: sec.intro, status, lvl });
      });
    }
  }

  let finalQueue = [];
  if (cfg.mode === "mistakes") {
    finalQueue = shuffle(allQuestions.filter(q => {
      const errKey = `${q.lessonId}:${q.secName}:${q.itemIdx}`;
      return q.status === false || examErrors[errKey] === true;
    })).slice(0, cfg.count);
  } else if (cfg.mode === "video") {
    finalQueue = shuffle(allQuestions.filter(q => !!q.item.ytId)).slice(0, cfg.count);
  } else if (cfg.mode === "level") {
    finalQueue = shuffle(allQuestions.filter(q => q.lvl === cfg.level)).slice(0, cfg.count);
  } else if (cfg.mode === "placement") {
    const perLevel = Math.ceil(cfg.count / 4);
    ["a2", "b1", "b2", "c1"].forEach(lvlKey => {
      finalQueue.push(...shuffle(allQuestions.filter(q => q.lvl === lvlKey)).slice(0, perLevel));
    });
    finalQueue = finalQueue.slice(0, cfg.count);
  } else {
    const bad = shuffle(allQuestions.filter(q => q.status === false));
    const unvisited = shuffle(allQuestions.filter(q => q.status === null));
    const solved = shuffle(allQuestions.filter(q => q.status === true));
    finalQueue.push(...bad.slice(0, Math.round(cfg.count * 0.4)));
    finalQueue.push(...unvisited.slice(0, cfg.count - finalQueue.length));
    if (finalQueue.length < cfg.count) {
      finalQueue.push(...solved.slice(0, cfg.count - finalQueue.length));
    }
    finalQueue = shuffle(finalQueue).slice(0, cfg.count);
  }
  return finalQueue;
}

function startCustomExam(cfg) {
  const queue = buildExamQueue(cfg);
  if (queue.length === 0) {
    alert("Нема забележених питања за изабрани режим (нпр. тренутно немате грешака).");
    return;
  }
  cur.isExam = true;
  cur.examConfig = cfg;
  cur.examQueue = queue;
  cur.index = 0;
  cur.id = queue[0].lessonId;
  cur.section = queue[0].secName;

  homeEl.hidden = true;
  lessonEl.hidden = false;
  $("#rule-btn").hidden = true;
  $("#reset").hidden = true;

  const modeLabels = { daily: "Дневни микс", placement: "Дијагностички срез (A2-C1)", level: `Испит нивоа: ${cfg.level.toUpperCase()}`, mistakes: "Исправка грешака", video: "Видео аудирање" };
  els.title.innerHTML = `<small><span class="level-pill" style="background:var(--red);">ИСПИТ</span> · ${queue.length} питања</small><b>${modeLabels[cfg.mode]}</b>`;
  renderExamQuestion();
  window.scrollTo(0, 0);
}

function renderExamQuestion() {
  cur.phase = "answer";
  cur.state = {};
  renderExamTrack();
  const q = cur.examQueue[cur.index];
  cur.id = q.lessonId;
  cur.section = q.secName;
  els.sections.innerHTML = `<div style="font-size:12px; font-weight:600; color:var(--ink-3); padding:4px 0;">Питање ${cur.index + 1} од ${cur.examQueue.length}</div>`;

  const it = q.item;
  const fmt = q.format;
  const intro = `<p class="ex-intro">${q.intro}</p>`;
  let html = "";
  switch (fmt) {
    case "choice": case "choice-live": case "video-choice": html = viewChoice(it); break;
    case "case-ident": case "case-only": html = viewCase(it); break;
    case "fill": case "fill-form": case "video-gap": html = viewFill(it); break;
    case "find-error": html = viewFindError(it); break;
    case "order": case "video-order": html = viewOrder(it); break;
  }

  const metaHeader = `
    <div class="card-meta">
      <div class="card-breadcrumbs">
        <span class="level-pill" style="background:var(--ink);">${q.lvl.toUpperCase()}</span>
        <span class="crumb-lesson">${esc(LESSONS[q.lessonId].title)}</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-section">${esc(q.secName)}</span>
      </div>
      <div class="card-counter">${cur.index + 1} / ${cur.examQueue.length}</div>
    </div>`;

  els.exercise.className = "card";
  els.exercise.innerHTML = metaHeader + intro + html + `<div id="tip"></div>`;
  bindExercise(fmt, it);
  els.exercise.querySelector(".tools")?.remove();
  renderBar();
}

function renderExamTrack() {
  els.track.innerHTML = cur.examQueue.map((q, i) => {
    let c = "";
    if (i === cur.index && cur.phase === "answer") c = "cur";
    else if (q.result === true) c = "ok";
    else if (q.result === false) c = "bad";
    return `<i class="${c}"></i>`;
  }).join("");
}

function finishExam() {
  cur.phase = "done";
  renderExamTrack();
  els.sections.innerHTML = "";

  const total = cur.examQueue.length;
  const correct = cur.examQueue.filter(q => q.result === true).length;
  const mistakesList = cur.examQueue.filter(q => q.result === false);
  const pct = Math.round((correct / total) * 100);

  let gradeText = "";
  let isPassed = pct >= 60;
  if (pct >= 90) gradeText = "5 (Одличан) 🎓";
  else if (pct >= 75) gradeText = "4 (Врло добар) 👍";
  else if (pct >= 60) gradeText = "3 (Добар) 👌";
  else if (pct >= 50) gradeText = "2 (Довољан) ⚠️";
  else gradeText = "1 (Недовољан / Пао) ❌";

  let reviewHTML = "";
  if (mistakesList.length > 0) {
    reviewHTML = `
      <div class="exam-review-box">
        <div class="exam-review-title">Преглед грешака (${mistakesList.length}):</div>
        ${mistakesList.map(m => {
          let ans = "";
          if (m.format === "find-error") ans = `${m.item.words[m.item.err]} → ${m.item.correct}`;
          else if (Array.isArray(m.item.ans)) ans = m.item.ans.join(" / ");
          else if (m.item.correct) ans = m.item.correct.join(" ");
          else ans = m.item.ans || "";

          const qText = m.item.ru || m.item.sr?.replace(/___|\{\{_\}\}/g, "...") || "Задатак";
          return `
            <div class="exam-err-item">
              <div class="exam-err-q">${esc(qText)}</div>
              <div>Тачан одговор: <span class="exam-err-ans">${esc(ans)}</span></div>
              ${m.item.hint || m.item.why ? `<div class="exam-err-why">${esc(m.item.hint || m.item.why)}</div>` : ""}
            </div>`;
        }).join("")}
      </div>`;
  }

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="finish">
      <div class="stolnjak"><b>${isPassed ? "ИСПИТ ПОЛОЖЕН!" : "ПАЛИ СТЕ НА ИСПИТУ"}</b></div>
      <div class="finish-num">${correct}<span> / ${total}</span></div>
      <p style="font-size:18px; font-weight:700; color:var(--ink); margin: 6px 0;">Оцена: ${gradeText}</p>
      <p style="font-size:13px; color:var(--ink-2);">
        Резултати су забележени! Грешке су сачуване за даље понављање.
      </p>
      ${reviewHTML}
      <div class="row">
        <button class="secondary" id="exam-again">Понови са истим параметрима</button>
      </div>
    </div>`;

  $("#exam-again").addEventListener("click", () => startCustomExam(cur.examConfig));
  els.bar.innerHTML = `<button class="primary" id="exam-to-home">Назад на почетну страну</button>`;
  $("#exam-to-home").addEventListener("click", () => {
    cur.isExam = false;
    goHome();
  });
}

function openExamModal() {
  const counts = getExamAvailableCounts();
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "exam-modal";

  modal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-head">
        <b>Конфигурација теста</b>
        <button class="tool" id="modal-close" type="button">Затвори</button>
      </div>
      <div class="cfg-label">1. Изаберите режим:</div>
      <div class="cfg-modes">
        <button class="cfg-mode-btn${examConfig.mode === 'daily' ? ' active' : ''}" data-m="daily">
          <div><b>📅 Дневни микс</b><small>Умная смесь: ошибки + новое + повтор</small></div>
        </button>
        <div class="cfg-mode-btn${examConfig.mode === 'level' ? ' active' : ''}" data-m="level" style="flex-direction:column; align-items:stretch;">
          <div><b>📊 По нивоима</b><small>Конкретный срез уровня</small></div>
          <div class="cfg-sublevels">
            ${["a2","b1","b2","c1","lex"].map(l => `<button type="button" class="cfg-sub-btn${examConfig.level === l ? ' active' : ''}" data-lvl="${l}">${l.toUpperCase()}</button>`).join("")}
          </div>
        </div>
        <button class="cfg-mode-btn${examConfig.mode === 'mistakes' ? ' active' : ''}" data-m="mistakes">
          <div><b>🔄 Исправка грешака</b><small>Только недавние ошибки</small></div>
          <span class="cfg-badge">${counts.mistakes}</span>
        </button>
        <button class="cfg-mode-btn${examConfig.mode === 'placement' ? ' active' : ''}" data-m="placement">
          <div><b>🎯 Дијагностички срез</b><small>Срез от A2 до C1</small></div>
        </button>
        <button class="cfg-mode-btn${examConfig.mode === 'video' ? ' active' : ''}" data-m="video">
          <div><b>🎬 Видео аудирање</b><small>Живая речь из YouTube</small></div>
          <span class="cfg-badge">${counts.video}</span>
        </button>
      </div>
      <div class="cfg-label">2. Број питања:</div>
      <div class="cfg-counts">
        <button class="cfg-count-btn${examConfig.count === 12 ? ' active' : ''}" data-c="12">12</button>
        <button class="cfg-count-btn${examConfig.count === 24 ? ' active' : ''}" data-c="24">24</button>
        <button class="cfg-count-btn${examConfig.count === 48 ? ' active' : ''}" data-c="48">48</button>
      </div>
      <button class="primary" id="btn-start-exam-now" style="margin-top:20px;">Покрени испит →</button>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelectorAll(".cfg-mode-btn[data-m]").forEach(btn => {
    btn.addEventListener("click", e => {
      if (e.target.closest(".cfg-sub-btn")) return;
      modal.querySelectorAll(".cfg-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      examConfig.mode = btn.dataset.m;
    });
  });

  modal.querySelectorAll(".cfg-sub-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      modal.querySelectorAll(".cfg-sub-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      examConfig.level = btn.dataset.lvl;
      modal.querySelectorAll(".cfg-mode-btn").forEach(b => b.classList.remove("active"));
      modal.querySelector('[data-m="level"]').classList.add("active");
      examConfig.mode = "level";
    });
  });

  modal.querySelectorAll(".cfg-count-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".cfg-count-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      examConfig.count = +btn.dataset.c;
    });
  });

  $("#modal-close").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  $("#btn-start-exam-now").addEventListener("click", () => {
    modal.remove();
    startCustomExam(examConfig);
  });
}

/* ================= 6. ИМПОРТ / ЭКСПОРТ ================= */
function exportProgress() {
  const data = {
    progress: load(STORAGE_KEY, {}),
    last: load(LAST_KEY, null),
    theme: curTheme,
    tab: activeTab,
    date: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `srpski-progress-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data && data.progress) {
          store(STORAGE_KEY, data.progress);
          if (data.last) store(LAST_KEY, data.last);
          if (data.tab) store("srpski-active-tab", data.tab);
          alert("Напредак је успешно увезен!");
          location.reload();
        } else {
          alert("Неисправан формат датотеке.");
        }
      } catch (err) {
        alert("Грешка при читању датотеке: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
}

function fullResetProgress() {
  if (confirm("Да ли сте сигурни да желите да обришете сав напредак? Ова радња је неповратна.")) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_KEY);
    alert("Напредак је ресетован.");
    location.reload();
  }
}

// Запуск приложения
renderHome();