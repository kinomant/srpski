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
  if (cur.isListen) return ""; 
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

const MOD_ICONS = {
  lex: `<svg viewBox="0 0 24 24"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"></path><path d="M9 3v15M15 6v15"></path></svg>`,
  listen: `<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0118 0v6"></path><path d="M21 19a2 2 0 01-2 2h-1v-6h3v4zM3 19a2 2 0 002 2h1v-6H3v4z"></path></svg>`,
  quiz: `<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`,
  exam: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 3v3M12 18v3M3 12h3M18 12h3"></path></svg>`,
  read: `<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"></path><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"></path></svg>`,
  words: `<svg viewBox="0 0 24 24"><path d="M21 16.5l-9 4.5-9-4.5"></path><path d="M21 12l-9 4.5-9-4.5"></path><path d="M12 3l9 4.5-9 4.5-9-4.5z"></path></svg>`
};


/* ================= ХРАНИЛИЩА ПРОГРЕССА ДЛЯ НОВЫХ МОДУЛЕЙ ================= */
const listenProgress = load("srpski-listen-v1", {}); 
const quizProgress   = load("srpski-quiz-v1", {});   
const readProgress   = load("srpski-read-v1", {});   
const vocabProgress  = load("srpski-vocab-v1", {});  

let examStats = load("srpski-exam-stats-v1", { totalAnswers: 0, correctAnswers: 0 });
function saveExamStats() { store("srpski-exam-stats-v1", examStats); }

// БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ (сработает, только если listen.js подключен)
if (typeof LISTEN_DB !== "undefined") {
  for (const id in LISTEN_DB) {
    const qCount = LISTEN_DB[id].questions ? LISTEN_DB[id].questions.length : 0;
    if (qCount > 0) {
      if (!Array.isArray(listenProgress[id])) {
        listenProgress[id] = listenProgress[id] === true ? new Array(qCount).fill(true) : new Array(qCount).fill(null);
      } else if (listenProgress[id].length < qCount) {
        listenProgress[id] = listenProgress[id].concat(new Array(qCount - listenProgress[id].length).fill(null));
      }
    }
  }
}
const saveListenProgress = () => store("srpski-listen-v1", listenProgress);


/* ================= ФУНКЦИИ РАСЧЕТА ПРОГРЕССА ================= */

function getListenStats() {
  if (typeof LISTEN_DB === "undefined") return { pct: 0, doneMins: 0, totalMins: 0 };
  let totalMins = 0, doneMins = 0;
  for (const [id, data] of Object.entries(LISTEN_DB)) {
    totalMins += data.durationMins;
    if (Array.isArray(listenProgress[id])) {
      if (listenProgress[id].filter(x => x === true).length >= 10) doneMins += data.durationMins;
    }
  }
  return { pct: totalMins > 0 ? Math.round((doneMins / totalMins) * 100) : 0, doneMins, totalMins }; 
}

function getQuizStats() {
  if (typeof QUIZ_DB === "undefined") return { pct: 0, points: 0 };
  let maxTotal = 0, userTotal = 0;
  for (const [id, data] of Object.entries(QUIZ_DB)) {
    maxTotal += data.format === "fill" ? 2 : 1;
    if (quizProgress[id] === true) {
      userTotal += data.format === "fill" ? 2 : 1;
    }
  }
  const pct = maxTotal > 0 ? Math.round((userTotal / maxTotal) * 100) : 0;
  return { pct: pct, points: userTotal };
}

function getReadStats() {
  if (typeof READ_DB === "undefined") return { pct: 0, texts: 0 };
  const totalTexts = Object.keys(READ_DB).length;
  let readTexts = 0;
  for (const [id, data] of Object.entries(READ_DB)) {
    if (readProgress[id] === true) readTexts++;
  }
  const pct = totalTexts > 0 ? Math.round((readTexts / totalTexts) * 100) : 0;
  return { pct: pct, texts: readTexts };
}

function getVocabPct() { return 0; }

function getExamWinRate() {
  if (examStats.totalAnswers === 0) return 0;
  return Math.round((examStats.correctAnswers / examStats.totalAnswers) * 100);
}

function getUserLevelInfo() {
  const THRESHOLD = 0.8; // 80% заданий уровня пройдено верно
  
  const levels = [
    { name: "A2", ids: LINE_A2_IDS },
    { name: "B1", ids: LINE_B1_IDS },
    { name: "B2", ids: LINE_B2_IDS },
    { name: "C1", ids: LINE_C1_IDS },
    { name: "LEX", ids: LINE_LEX_IDS }
  ];
  
  let currentLevel = levels[0];
  let currentPct = 0;

  for (const lvl of levels) {
    let t = 0, d = 0;
    for (const id of lvl.ids) {
      const s = lessonStats(id);
      t += s.total;
      d += s.done;
    }
    const pct = t > 0 ? d / t : 0;
    
    currentLevel = lvl;
    currentPct = Math.round(pct * 100);
    
    // Если уровень не пройден на 80%, останавливаемся на нем (это наш текущий уровень)
    if (pct < THRESHOLD) break; 
  }
  
  return { name: currentLevel.name, pct: currentPct }; 
}

function renderDashboard() {
  // 1. Считаем лекции
  let totalAll = 0, doneAll = 0;
  for (const id of ALL_IDS) { 
    const s = lessonStats(id); 
    totalAll += s.total; 
    doneAll += s.done; 
  }
  const lexPct = totalAll ? Math.round(doneAll / totalAll * 100) : 0;

  // 2. Получаем статистику всех модулей
  const listenStats = getListenStats(); 
  const quizStats = getQuizStats(); 
  const readStats = getReadStats(); 
  const wordsPct = getVocabPct();
  const levelInfo = getUserLevelInfo(); 

  // Функция для рисования карточки с кружком
  const r = 32; 
  const circ = 2 * Math.PI * r; 

  const buildCard = (id, title, desc, pct, cls, centerHTML) => {
    const offset = circ - (pct / 100) * circ;
    return `
      <button class="mod-card ${cls}" id="${id}">
        <div class="mod-ring-wrap">
          <!-- Увеличили viewBox и координаты центра (cx, cy) до 36 -->
          <svg class="mod-ring" viewBox="0 0 72 72">
            <circle class="bg" cx="36" cy="36" r="${r}"></circle>
            <circle class="bar" cx="36" cy="36" r="${r}" 
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
          </svg>
          <div class="mod-ring-text" style="display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1;">
            ${centerHTML}
          </div>
        </div>
        <div class="mod-info">
          <h3 class="mod-title">${title}</h3>
          <p class="mod-desc">${desc}</p>
        </div>
      </button>
    `;
  };
  homeEl.innerHTML = `
    <!-- Новая шапка: Заголовок в стиле страницы лекций -->
    <header class="header-bar" style="position: sticky; top: 0; background: var(--bg); z-index: 10; padding: 16px 0 10px; margin-bottom: 8px;">
      <h2 style="margin: 0; font-family: var(--display); font-size: 24px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em;">
        Српски<span style="color: var(--flag-red);">.</span>
      </h2>
      <button class="theme-toggle-btn" type="button" aria-label="Смени тему" style="margin-left: auto;">
        ${curTheme === "dark" ? SUN_ICON : MOON_ICON}
      </button>
    </header>

    <!-- Красивый, стильный баннер уровня (БЕЗ скучного текста с процентами) -->
    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1.5px solid var(--line); border-radius: 20px; padding: 18px 20px; margin-bottom: 22px; box-shadow: 0 4px 16px rgba(0,0,0,0.02);">
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); margin-bottom: 4px;">Ваш тренутни ниво</div>
        <div style="font-family: var(--display); font-size: 18px; font-weight: 700; color: var(--ink); letter-spacing: -0.01em;">Српски језик</div>
      </div>
      
      <!-- Значок уровня с обводкой в цвет уровня -->
      <div style="display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 16px; border: 2.5px solid ${levelInfo.color}; background: var(--surface-2);">
        <b style="font-family: var(--display); font-size: 22px; color: ${levelInfo.color}; line-height: 1;">${levelInfo.name}</b>
      </div>
    </div>

    <!-- Сетка карточек -->
    <div class="modules-grid">
      <!-- ЛЕКЦИИ -->
      ${buildCard('mod-btn-lex', 'Лекције', 'Основе и граматика', lexPct, 'm-lex', 
        `<span style="font-size:16px">${lexPct}%</span>`
      )}
      <!-- СЛУШАЊЕ -->
      ${buildCard('mod-btn-listen', 'Слушање', 'Живи говор и подкасти', listenStats.pct, 'm-listen', 
        `<span style="font-size:16px">${listenStats.doneMins}</span>
         <span style="font-size:10px; color:var(--ink-3); font-weight:600; margin-top:2px;">мин</span>`
      )}
      <!-- КВИЗЫ -->
      ${buildCard('mod-btn-quiz', 'Квизови', 'Култура, спорт, друштво', quizStats.pct, 'm-quiz', 
        `<span style="font-size:15px">${quizStats.points}</span>
         <span style="font-size:9.5px; color:var(--ink-3); font-weight:600; margin-top:2px;">бодова</span>`
      )}
      <!-- ЭКЗАМЕН -->
      ${buildCard('mod-btn-exam', 'Испит', 'Срез знања и грешке', levelInfo.pct, 'm-exam', 
        `<span style="font-size:20px; color:var(--red);">${levelInfo.name}</span>`
      )}
      <!-- СЛОВАРЬ -->
      ${buildCard('mod-btn-words', 'Картице', 'Памћење речи', wordsPct, 'm-words', 
        `<span style="font-size:15px">0</span>
         <span style="font-size:9.5px; color:var(--ink-3); font-weight:600; margin-top:2px;">речи</span>`
      )}
      <!-- ЧТЕНИЕ -->
      ${buildCard('mod-btn-read', 'Читање', 'Текстови и превод', readStats.pct, 'm-read', 
        `<span style="font-size:16px">${readStats.texts}</span>
         <span style="font-size:9.5px; color:var(--ink-3); font-weight:600; margin-top:2px;">текстова</span>`
      )}
    </div>

    <div class="home-foot">
      <div>Одговори се могу уносити ћирилицом или латиницом.</div>
      <div class="data-tools">
        <button class="data-btn" id="btn-export" type="button">Експорт</button>
        <button class="data-btn" id="btn-import" type="button">Импорт</button>
        <button class="data-btn" id="btn-full-reset" type="button" style="color: var(--red);">Ресетуј све</button>
      </div>
    </div>
  `;

  // Привязка событий
  $("#mod-btn-lex").addEventListener("click", renderLessonsMap);
  $("#mod-btn-exam").addEventListener("click", openExamModal);
  $("#mod-btn-listen").addEventListener("click", renderListenMap);
  $("#mod-btn-words").addEventListener("click", openVocabModal);
  $("#mod-btn-quiz").addEventListener("click", openQuizMenu);   
  $("#mod-btn-read").addEventListener("click", openReadCatalog);


  $("#btn-export")?.addEventListener("click", exportProgress);
  $("#btn-import")?.addEventListener("click", importProgress);
  $("#btn-full-reset")?.addEventListener("click", fullResetProgress);
}

function renderLessonsMap() {
  let totalAll = 0, doneAll = 0;
  for (const id of ALL_IDS) { 
    const s = lessonStats(id); 
    totalAll += s.total; 
    doneAll += s.done; 
  }
  const overallPct = totalAll ? Math.round(doneAll / totalAll * 100) : 0;

  const tabMap = {
    a2: { title: "A2 Экспресс", ids: LINE_A2_IDS, class: "l-a2" },
    b1: { title: "B1 Каркас", ids: LINE_B1_IDS, class: "l-b1" },
    b2: { title: "B2 Беглая речь", ids: LINE_B2_IDS, class: "l-b2" },
    c1: { title: "C1 Мастерство", ids: LINE_C1_IDS, class: "l-c1" },
    lex: { title: "Лексика", ids: LINE_LEX_IDS, class: "l-lex" }
  };
  const currentTabInfo = tabMap[activeTab] || tabMap.a2;

  const getTabSub = (ids) => {
    let completed = 0;
    ids.forEach(id => {
      const s = lessonStats(id);
      if (s.total > 0 && s.done === s.total) completed++;
    });
    return completed === ids.length ? "✓" : `${completed}/${ids.length}`;
  };

  homeEl.innerHTML = `
    <!-- Липкая шапка с кнопкой Назад, прогрессом и сменой темы -->
    <header class="header-bar" style="position: sticky; top: 0; background: var(--bg); z-index: 10; padding: 16px 0 10px; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="icon-btn" id="btn-dash-back" aria-label="Назад">
          <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2 2 8l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 style="margin: 0; font-family: var(--display); font-size: 22px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em;">Лекције</h2>
      </div>
      
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="header-badge">
          <div class="hb-bar"><i style="width:${overallPct}%"></i></div>
          <span>${doneAll} / ${totalAll}</span>
        </div>
        <button class="theme-toggle-btn" type="button" aria-label="Смени тему">
          ${curTheme === "dark" ? SUN_ICON : MOON_ICON}
        </button>
      </div>
    </header>

    <nav class="level-tabs" aria-label="Нивои">
      ${Object.keys(tabMap).map(k => `
        <button class="level-tab${activeTab === k ? ' active' : ''}" data-tab="${k}">
          <span class="tab-title">${k.toUpperCase()}</span>
          <span class="tab-sub">${getTabSub(tabMap[k].ids)}</span>
        </button>
      `).join("")}
    </nav>

    <ol class="route ${currentTabInfo.class}">
      ${currentTabInfo.ids.map(id => stop(id, ALL_IDS.indexOf(id) + 1)).join("")}
    </ol>
  `;

  // Кнопка возврата в Дашборд
  $("#btn-dash-back").addEventListener("click", renderDashboard);

  // Переключение табов
  homeEl.querySelectorAll(".level-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      store("srpski-active-tab", activeTab);
      renderLessonsMap();
    });
  });

  // Открытие урока
  homeEl.querySelectorAll(".route [data-id]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      const last = load(LAST_KEY, null);
      const sec = last && last.id === id ? last.section : null;
      openLesson(id, sec);
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
  const isListen = cur.isListen;
  const isExam = cur.isExam;
  const isVocab = cur.isVocab; // Добавили
  
  cur.isExam = false;
  cur.isListen = false;
  cur.isVocab = false; // Добавили
  
  const svb = $("#sticky-video-box");
  if (svb) { svb.innerHTML = ""; svb.hidden = true; }

  $("#rule-btn").hidden = false;
  $("#reset").hidden = false;
  lessonEl.hidden = false; // вопсрос, но лучше оставлять как было
  lessonEl.hidden = true;
  homeEl.hidden = false;
  closeRule();
  
  if (isListen) renderListenMap();
  else if (isExam || isVocab) renderDashboard(); // Возвращаем на дашборд
  else renderLessonsMap();
  
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
  const fmt = (cur.isExam && cur.examQueue) ? cur.examQueue[cur.index].format 
            : (cur.isListen && cur.queue) ? cur.queue[cur.index].format 
            : (cur.isQuiz && cur.quizQueue) ? cur.quizQueue[cur.index].item.format
            : section()?.format;
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
  // Проверяем, дал ли пользователь ответ
  if (!hasAnswer()) return;

  // 1. Берем правильный вопрос в зависимости от текущего режима
  const it = (cur.isExam && cur.examQueue) ? cur.examQueue[cur.index].item 
           : (cur.isListen && cur.queue) ? cur.queue[cur.index] 
           : (cur.isQuiz && cur.quizQueue) ? cur.quizQueue[cur.index].item 
           : (cur.isRead && cur.queue) ? cur.queue[cur.index] 
           : item();
  if (!it) return;

  // 2. Определяем формат вопроса
  const fmt = (cur.isExam && cur.examQueue) ? cur.examQueue[cur.index].format 
            : (cur.isListen && cur.queue) ? cur.queue[cur.index].format 
            : (cur.isQuiz && cur.quizQueue) ? cur.quizQueue[cur.index].item.format 
            : (cur.isRead && cur.queue) ? cur.queue[cur.index].format 
            : section().format;
            
  const ex = els.exercise;
  let ok = false, user = "", right = "";

  // ================= ЛОГИКА ПРОВЕРКИ =================
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

  // Блокируем интерфейс после ответа
  ex.classList.add("locked");

  // ================= СОХРАНЕНИЕ ПРОГРЕССА (ПО РЕЖИМАМ) =================
  if (cur.isExam) {
    const q = cur.examQueue[cur.index];
    q.result = ok;

    examStats.totalAnswers += 1;
    if (ok) examStats.correctAnswers += 1;
    saveExamStats();

    const errKey = `${q.lessonId}:${q.secName}:${q.itemIdx}`;
    if (!ok) {
      examErrors[errKey] = true;
    } else {
      delete examErrors[errKey];
    }
    saveExamErrors();

    if (ok && progress[q.lessonId]?.[q.secName]) {
      progress[q.lessonId][q.secName][q.itemIdx] = true;
      saveProgress();
    }
    
  } else if (cur.isListen) {
    const q = cur.queue[cur.index];
    q.result = ok; 
    listenProgress[cur.id][cur.index] = ok;
    saveListenProgress();
    
  } else if (cur.isQuiz) {
    const q = cur.quizQueue[cur.index];
    q.result = ok; 
    
    if (ok || quizProgress[cur.id] !== true) {
      quizProgress[cur.id] = ok;
      store("srpski-quiz-v1", quizProgress);
    }
  } else if (cur.isRead) {
    // Сохранение ответа для режима "Читање"
    const q = cur.queue[cur.index];
    q.result = ok;
  } else {
    // Обычные уроки (Лекције)
    progress[cur.id][cur.section][realIndex()] = ok;
    saveProgress();
  }

  // ================= ОБНОВЛЕНИЕ ТРЕКА И ВЫВОД ФИДБЕКА =================
  cur.phase = "result";
  
  // Обновляем индикаторы сверху в зависимости от режима
  if (cur.isExam) renderExamTrack();
  else if (cur.isListen) renderListenTrack();
  else if (cur.isQuiz) renderQuizTrack();
  else if (cur.isRead) {
    // Рендерим трек для чтения
    els.track.innerHTML = cur.queue.map((q, i) => {
      let c = (i === cur.index && cur.phase === "answer") ? "cur" 
            : (q.result === true) ? "ok" 
            : (q.result === false) ? "bad" : "";
      return `<i class="${c}"></i>`;
    }).join("");
  }
  else { renderTrack(); renderSections(); }

  const why = it.why || it.hint || "";
  let fullSentenceToSpeak = it.sr ? it.sr.replace(/___|\{\{_\}\}/g, right) : right;

  // Рисуем плашку фидбека внизу
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
  
  const totalItems = cur.isExam ? cur.examQueue.length 
                   : cur.isListen ? cur.queue.length 
                   : cur.isQuiz ? cur.quizQueue.length 
                   : cur.isRead ? cur.queue.length // <-- Добавлено для Чтения
                   : cur.order.length;
                   
  if (cur.index < totalItems - 1) {
    cur.index++;
    if (cur.isExam) renderExamQuestion();
    else if (cur.isListen) renderListenQuestion();
    else if (cur.isQuiz) renderQuizQuestion();
    else if (cur.isRead) renderReadQuestion(); // <-- Добавлено для Чтения
    else render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    if (cur.isExam) finishExam();
    else if (cur.isListen) finishListen();
    else if (cur.isQuiz) finishQuiz();
    else if (cur.isRead) finishRead(); // <-- Добавлено для Чтения
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
  if (cur.isListen) {
    if (!confirm(`Ресетовати напредак за овај видео?`)) return;
    listenProgress[cur.id] = new Array(cur.queue.length).fill(null);
    saveListenProgress();
    startListenSession(cur.id);
  } else {
    if (!confirm(`Ресетовати напредак за део «${cur.section}»?`)) return;
    const len = section().items.length;
    progress[cur.id][cur.section] = new Array(len).fill(null);
    saveProgress();
    startSection();
  }
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

/* ================================================================= */
/* ДВИЖОК РАЗДЕЛА "СЛУШАЊЕ" (Длинные видео с липким плеером) */
/* ================================================================= */

function renderListenMap() {
  // 1. Создаем словарь для объединения мелких тегов в 4 крупные категории
  const categoryMap = {
    "Друштво": "Друштво и живот", "Село": "Друштво и живот", "Услуге": "Друштво и живот", 
    "Урбанизам": "Друштво и живот", "Пољопривреда": "Друштво и живот", "Град": "Друштво и живот", 
    "Некретнине": "Друштво и живот",
    
    "Филм и друштво": "Култура и медији", "Интернет": "Култура и медији", "Медији": "Култура и медији", 
    "Телевизија": "Култура и медији", "Култура": "Култура и медији", "Хумор": "Култура и медији", 
    "Музика": "Култура и медији",
    
    "Историја": "Историја и политика", "Свет": "Историја и политика", "Политика": "Историја и политика",
    
    "Наука": "Наука и технологије", "Архитектура": "Наука и технологије", "ИТ": "Наука и технологије"
  };

  // 2. Раскидываем базу по новым 4 категориям
  const categories = {};
  for (const [id, data] of Object.entries(LISTEN_DB)) {
    // Разделяем "Историја: Атомска бомба" на тег и название
    const parts = data.title.split(": ");
    const originalTag = parts.length > 1 ? parts[0] : "Остало";
    const name = parts.length > 1 ? parts[1] : data.title;
    
    // Ищем, к какой из 4 главных групп относится видео
    const broadCat = categoryMap[originalTag] || "Остало";
    
    if (!categories[broadCat]) categories[broadCat] = [];
    categories[broadCat].push({ id, name, originalTag, ...data });
  }

  let html = `
    <!-- Липкая шапка -->
    <header class="header-bar" style="position: sticky; top: 0; background: var(--bg); z-index: 10; padding: 16px 0 10px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="icon-btn" id="btn-dash-back" aria-label="Назад">
          <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2 2 8l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 style="margin: 0; font-family: var(--display); font-size: 22px; font-weight: 700; color: var(--ink); letter-spacing: -0.02em;">Слушање</h2>
      </div>
      <button class="theme-toggle-btn" type="button" aria-label="Смени тему" style="margin-left: auto;">
        ${curTheme === "dark" ? SUN_ICON : MOON_ICON}
      </button>
    </header>
    
    <div style="padding-bottom: 24px;">
  `;

  // 3. Задаем жесткий порядок вывода этих 4 категорий на экран
  const ROW_ORDER = [
    "Друштво и живот", 
    "Култура и медији", 
    "Историја и политика", 
    "Наука и технологије", 
    "Остало"
  ];

  // 4. Рендерим категории в виде горизонтальных рядов
  for (const cat of ROW_ORDER) {
    if (!categories[cat] || categories[cat].length === 0) continue;
    
    html += `<div class="listen-category"><h3 class="listen-category-title">${cat}</h3><div class="listen-row">`;
    
    for (const v of categories[cat]) {
      const arr = listenProgress[v.id];
      const qCount = v.questions ? v.questions.length : 0;
      const correct = Array.isArray(arr) ? arr.filter(x => x === true).length : 0;
      const isDone = correct >= 10;
      const disabled = qCount < 12 ? ' disabled' : '';
      
      const thumbUrl = `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
      
      html += `
        <button class="vid-card${disabled}" data-vid="${v.id}">
          <div class="vid-thumb">
            <img src="${thumbUrl}" alt="thumbnail" loading="lazy">
            <div class="vid-overlay">
              <div class="vid-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
            </div>
            <div class="vid-badges">
              <span class="vid-badge">${v.durationMins} мин</span>
              <span class="vid-badge ${isDone ? 'done' : ''}">${isDone ? '✅ Завршено' : `${correct}/${qCount} тачно`}</span>
            </div>
          </div>
          <div class="vid-info">
            <h4>${v.name}</h4>
            <!-- Здесь мы выводим оригинальный узкий тег (например: Хумор, Архитектура) -->
            ${disabled ? `<p>${v.originalTag} · У припреми...</p>` : `<p>${v.originalTag} · ${qCount} питања</p>`}
          </div>
        </button>
      `;
    }
    html += `</div></div>`;
  }
  
  html += `</div>`;
  homeEl.innerHTML = html;
  
  // Привязка событий
  $("#btn-dash-back").addEventListener("click", renderDashboard);
  
  homeEl.querySelectorAll(".vid-card:not(.disabled)").forEach(b => {
    b.addEventListener("click", () => {
      startListenSession(b.dataset.vid);
    });
  });
  
  window.scrollTo(0, 0);
}

function startListenSession(videoId) {
  cur = { isListen: true, id: videoId, state: {}, phase: "answer" };
  cur.queue = LISTEN_DB[videoId].questions;
  
  // НАХОДИМ ПЕРВЫЙ ВОПРОС БЕЗ ОТВЕТА (чтобы продолжить с того же места)
  const arr = listenProgress[videoId];
  const firstNull = arr.indexOf(null);
  
  // Если все вопросы уже как-то отвечены (нет null), начинаем с 0
  cur.index = firstNull !== -1 ? firstNull : 0; 

  homeEl.hidden = true;
  lessonEl.hidden = false;
  $("#rule-btn").hidden = true;
  $("#reset").hidden = false; // Показываем кнопку сброса в подвале!

  els.title.innerHTML = `<small><span class="level-pill" style="background:var(--blue);">СЛУШАЊЕ</span> · ${LISTEN_DB[videoId].durationMins} мин</small><b>${LISTEN_DB[videoId].title}</b>`;

  renderListenTrack();

  // Рендерим липкий плеер
  const svb = $("#sticky-video-box");
  svb.hidden = false;
  svb.innerHTML = `
    <div class="video-wrap">
      <iframe id="yt-iframe" src="https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1&modestbranding=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    </div>
  `;

  renderListenQuestion();
  window.scrollTo(0, 0);
}

function renderListenTrack() {
  const arr = listenProgress[cur.id];
  els.track.innerHTML = cur.queue.map((q, i) => {
    let c = "";
    if (i === cur.index && cur.phase === "answer") c = "cur";
    else if (arr[i] === true) c = "ok";
    else if (arr[i] === false) c = "bad";
    return `<i class="${c}"></i>`;
  }).join("");
}

function renderListenQuestion() {
  cur.phase = "answer";
  cur.state = {};
  renderListenTrack();
  
  els.sections.innerHTML = `<div style="font-size:12px; font-weight:600; color:var(--ink-3); padding:4px 0;">Питање ${cur.index + 1} од ${cur.queue.length}</div>`;

  const q = cur.queue[cur.index];
  
  let html = "";
  if (q.format === "choice") html = viewChoice(q);
  else if (q.format === "fill") html = viewFill(q);

  const metaHeader = `
    <div class="card-meta">
      <div class="card-breadcrumbs">
        <span class="level-pill" style="background:var(--blue);">ПИТАЊЕ</span>
        <span class="crumb-lesson">Слушање са разумевањем</span>
      </div>
      <div class="card-counter">${cur.index + 1} / ${cur.queue.length}</div>
    </div>`;

  const min = q.hintTime ? Math.floor(q.hintTime / 60) : 0;
  const sec = q.hintTime ? pad(q.hintTime % 60) : 0;
  const hintBtnHTML = q.hintTime ? `<button class="listen-hint-btn" id="listen-hint" type="button">⏳ Помоћ (премотај на ${min}:${sec})</button>` : '';

  els.exercise.className = "card";
  els.exercise.innerHTML = metaHeader + hintBtnHTML + html + `<div id="tip"></div>`;
  
  bindExercise(q.format, q);
  els.exercise.querySelector(".tools")?.remove();
  
  if(q.hintTime) {
    $("#listen-hint").addEventListener("click", () => replayVideo(q.hintTime));
  }

  renderBar();
}

function finishListen() {
  cur.phase = "done";
  renderListenTrack();
  els.sections.innerHTML = "";
  
  const svb = $("#sticky-video-box");
  svb.innerHTML = "";
  svb.hidden = true;

  // Берем результаты из массива!
  const arr = listenProgress[cur.id];
  const total = cur.queue.length;
  const correct = arr.filter(x => x === true).length;
  const isPassed = correct >= 10;

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="finish">
      <div class="stolnjak"><b>${isPassed ? "Свака част!" : "Може то и боље!"}</b></div>
      <div class="finish-num">${correct}<span> / ${total}</span></div>
      <p style="font-size:16px; font-weight:600; color:var(--ink); margin: 6px 0 20px;">
        ${isPassed ? `Браво! Зарадили сте ${LISTEN_DB[cur.id].durationMins} мин. слушања.` : "Потребно је 10 тачних одговора да бисте завршили видео. Покушајте поново!"}
      </p>
      <div class="row">
        <button class="secondary" id="listen-again">Ресетуј и покушај поново</button>
      </div>
    </div>`;

  $("#listen-again").addEventListener("click", () => {
    // При повторе очищаем прогресс видео
    listenProgress[cur.id] = new Array(total).fill(null);
    saveListenProgress();
    startListenSession(cur.id);
  });
  
  els.bar.innerHTML = `<button class="primary" id="listen-to-home">Назад на почетну страну</button>`;
  $("#listen-to-home").addEventListener("click", () => {
    cur.isListen = false;
    lessonEl.hidden = true;
    homeEl.hidden = false;
    renderListenMap();
    window.scrollTo(0, 0);
  });
}

/* ================================================================= */
/* ДВИЖОК РАЗДЕЛА "КВИЗОВИ" (Эрудиция и культура) */
/* ================================================================= */

function openQuizMenu() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "quiz-modal";

  modal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-head">
        <b>Паб Квиз: Ерудиција</b>
        <button class="tool" id="modal-close" type="button">Затвори</button>
      </div>
      <div class="cfg-label">1. Изаберите тему:</div>
      <div class="cfg-modes">
        <button class="cfg-mode-btn active" data-qtheme="Све теме">
          <div><b>Све теме</b><small>Микс питања из свих области</small></div>
        </button>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:6px;">
          ${["Филм и ТВ", "Музика", "Географија", "Спорт", "Историја", "Опште знање"].map(t => 
            `<button class="cfg-sub-btn" data-qtheme="${t}">${t}</button>`
          ).join("")}
        </div>
      </div>
      <div class="cfg-label" style="margin-top:16px;">2. Број питања:</div>
      <div class="cfg-counts">
        <button class="cfg-count-btn active" data-c="12">12</button>
        <button class="cfg-count-btn" data-c="24">24</button>
        <button class="cfg-count-btn" data-c="48">48</button>
      </div>
      <button class="primary" id="btn-start-quiz" style="margin-top:20px;">Покрени квиз →</button>
    </div>`;

  document.body.appendChild(modal);

  let selectedTheme = "Све теме";
  let selectedCount = 12;

  // Выбор темы
  modal.querySelectorAll("[data-qtheme]").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll("[data-qtheme]").forEach(b => b.classList.remove("active", "selected-theme"));
      btn.classList.add("active");
      if(btn.classList.contains("cfg-sub-btn")) btn.classList.add("selected-theme"); // Подсветка мелких кнопок
      selectedTheme = btn.dataset.qtheme;
    });
  });

  // Выбор количества
  modal.querySelectorAll(".cfg-count-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".cfg-count-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCount = +btn.dataset.c;
    });
  });

  $("#modal-close").addEventListener("click", () => modal.remove());
  
  $("#btn-start-quiz").addEventListener("click", () => {
    modal.remove();
    startQuizSession(selectedTheme, selectedCount);
  });
}

function startQuizSession(theme, count) {
  let pool = Object.keys(QUIZ_DB);
  if (theme !== "Све теме") {
    pool = pool.filter(id => QUIZ_DB[id].theme === theme);
  }

  if (pool.length === 0) {
    alert("Тренутно нема питања у овој категорији."); return;
  }

  // АЛГОРИТМ БЕЗ ПОВТОРЕНИЙ: Отделяем нерешенные (null или false) от решенных (true)
  const unsolved = shuffle(pool.filter(id => quizProgress[id] !== true));
  const solved = shuffle(pool.filter(id => quizProgress[id] === true));

  let finalQueue = [];
  // Берем в первую очередь те, что человек еще не решил правильно
  finalQueue.push(...unsolved.slice(0, count));
  
  // Если нерешенных не хватило (база закончилась), добиваем старыми для тренировки
  if (finalQueue.length < count) {
    finalQueue.push(...solved.slice(0, count - finalQueue.length));
  }

  cur = { isQuiz: true, index: 0, phase: "answer" };
  cur.quizQueue = finalQueue.map(id => ({ id: id, item: QUIZ_DB[id] }));

  homeEl.hidden = true;
  lessonEl.hidden = false;
  $("#rule-btn").hidden = true;
  $("#reset").hidden = true;

  els.title.innerHTML = `<small><span class="level-pill" style="background:#d06015;">КВИЗ</span> · ${cur.quizQueue.length} питања</small><b>${theme}</b>`;

  renderQuizQuestion();
  window.scrollTo(0, 0);
}

function renderQuizTrack() {
  els.track.innerHTML = cur.quizQueue.map((q, i) => {
    let c = (i === cur.index && cur.phase === "answer") ? "cur" 
          : (q.result === true) ? "ok" 
          : (q.result === false) ? "bad" : "";
    return `<i class="${c}"></i>`;
  }).join("");
}

function renderQuizQuestion() {
  cur.phase = "answer";
  cur.state = {};
  renderQuizTrack();
  
  const qData = cur.quizQueue[cur.index];
  const it = qData.item;
  cur.id = qData.id; // Передаем ID для сохранения в check()

  els.sections.innerHTML = `<div style="font-size:12px; font-weight:600; color:var(--ink-3); padding:4px 0;">Питање ${cur.index + 1} од ${cur.quizQueue.length}</div>`;

  let html = "";
  if (it.format === "choice") html = viewChoice(it);
  else if (it.format === "fill") html = viewFill(it);

  const pts = it.format === "fill" ? 2 : 1;
  const metaHeader = `
    <div class="card-meta">
      <div class="card-breadcrumbs">
        <span class="level-pill" style="background:#d06015;">${it.theme.toUpperCase()}</span>
        <span class="crumb-lesson">Вреди ${pts} ${pts === 1 ? 'бод' : 'бода'}</span>
      </div>
      <div class="card-counter">${cur.index + 1} / ${cur.quizQueue.length}</div>
    </div>`;

  els.exercise.className = "card";
  els.exercise.innerHTML = metaHeader + html + `<div id="tip"></div>`;
  
  bindExercise(it.format, it);
  els.exercise.querySelector(".tools")?.remove();
  renderBar();
}

function finishQuiz() {
  cur.phase = "done";
  renderQuizTrack();
  els.sections.innerHTML = "";

  const total = cur.quizQueue.length;
  const correct = cur.quizQueue.filter(q => q.result === true).length;
  
  let earnedPoints = 0;
  cur.quizQueue.forEach(q => {
    if (q.result === true) earnedPoints += (q.item.format === "fill" ? 2 : 1);
  });

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="finish">
      <div class="stolnjak"><b>${correct >= total * 0.7 ? "Браво мајсторе!" : "Солидно!"}</b></div>
      <div class="finish-num">${correct}<span> / ${total}</span></div>
      <p style="font-size:16px; font-weight:600; color:var(--ink); margin: 6px 0 20px;">
        Освојили сте око <b>${earnedPoints} бодова</b> у овој сесији!
      </p>
      <div class="row">
        <button class="secondary" id="quiz-to-home">Назад на почетну страну</button>
      </div>
    </div>`;

  $("#quiz-to-home").addEventListener("click", () => {
    cur.isQuiz = false;
    lessonEl.hidden = true;
    homeEl.hidden = false;
    renderDashboard();
    window.scrollTo(0, 0);
  });
}

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

/* ================================================================= */
/* ДВИЖОК РАЗДЕЛА "КАРТИЦЕ" (Flashcards & SRS) */
/* ================================================================= */

const vocabLevels = load("srpski-vocab-levels-v1", {});

function getVocabStats() {
  if (typeof VOCAB_DB === "undefined" || VOCAB_DB.length === 0) return { pct: 0, learned: 0, total: 0 };
  
  let total = VOCAB_DB.length;
  let scoreSum = 0; // Сумма набранных уровней по всем словам
  let maxPossibleScore = total * 4; // Если бы каждое слово было на уровне 4

  for (const card of VOCAB_DB) {
    const lvl = vocabLevels[card.id] || 0;
    scoreSum += lvl; 
  }
  
  // Сколько слов хотя бы начаты (уровень > 0)
  let startedCount = VOCAB_DB.filter(card => (vocabLevels[card.id] || 0) > 0).length;

  // Процент заполнения шкалы (сумма текущих уровней / максимально возможных)
  const pct = maxPossibleScore > 0 ? Math.round((scoreSum / maxPossibleScore) * 100) : 0;
  
  return { 
    pct: pct, 
    learned: startedCount, // Теперь здесь пишется сколько слов вы уже «трогали»
    total: total 
  };
}

function openVocabModal() {
  if (typeof VOCAB_DB === "undefined" || VOCAB_DB.length === 0) {
    alert("Речник је тренутно празан.");
    return;
  }

  let sessionQueue = VOCAB_DB.filter(card => {
    const lvl = vocabLevels[card.id] || 0;
    return lvl < 4;
  });

  if (sessionQueue.length === 0) {
    if (confirm("Све речи су савладане! Желите ли да ресетујете и поновите градиво?")) {
      for(const id in vocabLevels) vocabLevels[id] = 0;
      store("srpski-vocab-levels-v1", vocabLevels);
      sessionQueue = [...VOCAB_DB];
    } else {
      return;
    }
  }

  sessionQueue = shuffle(sessionQueue).slice(0, 12);
  startVocabSession(sessionQueue);
}

function startVocabSession(queue) {
  cur = { isVocab: true, queue: queue, index: 0, phase: "question" };

  homeEl.hidden = true;
  lessonEl.hidden = false;
  $("#rule-btn").hidden = true;
  $("#reset").hidden = true;

  els.title.innerHTML = `<small><span class="level-pill" style="background:#0284c7;">КАРТИЦЕ</span> · Речник</small><b>Интервално понављање</b>`;
  els.sections.innerHTML = "";
  els.track.innerHTML = "";

  renderVocabCard();
  window.scrollTo(0, 0);
}

function renderVocabCard() {
  const card = cur.queue[cur.index];
  const currentLvl = vocabLevels[card.id] || 0;

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="card-meta">
      <div class="card-breadcrumbs">
        <span class="level-pill" style="background:#0284c7;">НИВО ${currentLvl}/4</span>
        <span class="crumb-lesson">Картица ${cur.index + 1} од ${cur.queue.length}</span>
      </div>
    </div>
    
    <div style="text-align: center; padding: 30px 10px;">
      <div style="font-size: 28px; font-weight: 700; font-family: var(--display); margin-bottom: 12px;" lang="sr">
        ${card.sr} ${speakButtonHTML(card.sr)}
      </div>
      <div id="vocab-answer-box" style="margin-top: 20px; min-height: 60px;">
        <button class="secondary" id="vocab-show-btn" style="max-width: 200px; margin: 0 auto;">Прикажи превод</button>
      </div>
    </div>
  `;

  $("#vocab-show-btn").addEventListener("click", () => {
    const ansBox = $("#vocab-answer-box");
    ansBox.innerHTML = `
      <div style="font-size: 20px; color: var(--green); font-weight: 600; margin-bottom: 8px;">${card.ru}</div>
      ${card.example ? `<div style="font-size: 13.5px; color: var(--ink-2); font-style: italic; margin-bottom: 20px;" lang="sr">"${card.example}"</div>` : ''}
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 320px; margin: 0 auto;">
        <button class="primary" id="vocab-bad" style="background: var(--red); color: #fff; height: 44px; font-size: 15px;">Заборавио сам</button>
        <button class="primary" id="vocab-good" style="background: var(--green); color: #fff; height: 44px; font-size: 15px;">Знао сам</button>
      </div>
    `;

    $("#vocab-bad").addEventListener("click", () => handleVocabAnswer(card.id, false));
    $("#vocab-good").addEventListener("click", () => handleVocabAnswer(card.id, true));
  });

  els.bar.innerHTML = "";
}

function handleVocabAnswer(cardId, remembered) {
  let lvl = vocabLevels[cardId] || 0;
  if (remembered) {
    if (lvl < 4) lvl++;
  } else {
    lvl = 0; // Сбрасываем на ноль при забывании
  }
  vocabLevels[cardId] = lvl;
  store("srpski-vocab-levels-v1", vocabLevels);

  // Переходим к следующей карточке или завершаем сессию
  if (cur.index < cur.queue.length - 1) {
    cur.index++;
    renderVocabCard();
  } else {
    // КРАСИВЫЙ ЭКРАН ФИНАЛА (вместо алярма и резкого выхода)
    cur.phase = "done";
    els.sections.innerHTML = "";
    els.track.innerHTML = "";

    const total = cur.queue.length;

    els.exercise.className = "card";
    els.exercise.innerHTML = `
      <div class="finish">
        <div class="stolnjak"><b>Одлично!</b></div>
        <div class="rakija">${RAKIJA}</div>
        <div class="finish-num">${total}<span> / ${total}</span></div>
        <p>Картице су успешно поновљене! Меморија је ојачана.</p>
        <div class="row">
          <button class="secondary" id="vocab-again">Понови још једном</button>
        </div>
      </div>`;

    // Кнопка повтора запускает сессию заново
    $("#vocab-again").addEventListener("click", openVocabModal);

    // Кнопка возврата на главную в нижнем фиксированном баре
    els.bar.innerHTML = `<button class="primary" id="vocab-to-home">Назад на почетну страну</button>`;
    $("#vocab-to-home").addEventListener("click", () => {
      cur.isVocab = false;
      lessonEl.hidden = true;
      homeEl.hidden = false;
      renderDashboard();
      window.scrollTo(0, 0);
    });
  }
}

/* ================================================================= */
/* ДВИЖОК РАЗДЕЛА "ЧИТАЊЕ" (Антологија српске књижевности) */
/* ================================================================= */

function getReadStats() {
  if (typeof READ_DB === "undefined") return { pct: 0, texts: 0 };
  const totalTexts = Object.keys(READ_DB).length;
  let readTexts = 0;
  for (const id in READ_DB) {
    if (readProgress[id] === true) readTexts++;
  }
  const pct = totalTexts > 0 ? Math.round((readTexts / totalTexts) * 100) : 0;
  return { pct, texts: readTexts };
}

function openReadCatalog() {
  if (typeof READ_DB === "undefined" || Object.keys(READ_DB).length === 0) {
    alert("Библиотека је тренутно празна.");
    return;
  }

  let html = `
    <header class="header-bar" style="position: sticky; top: 0; background: var(--bg); z-index: 10; padding: 16px 0 10px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="icon-btn" id="btn-dash-back" aria-label="Назад">
          <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2 2 8l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 style="margin: 0; font-family: var(--display); font-size: 22px; font-weight: 700; color: var(--ink);">Читање</h2>
      </div>
      <button class="theme-toggle-btn" type="button" aria-label="Смени тему" style="margin-left: auto;">
        ${curTheme === "dark" ? SUN_ICON : MOON_ICON}
      </button>
    </header>
    <div style="padding-bottom: 24px;">
  `;

  for (const [id, data] of Object.entries(READ_DB)) {
    const isDone = readProgress[id] === true;
    
    // Генерация красивой аватарки с инициалами автора на случай, если фото с Вики не загрузилось
    const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author)}&background=7b2cbf&color=fff&size=128`;

    html += `
      <button class="read-card" data-read="${id}">
        <img class="read-avatar" src="${data.authorImg}" alt="${data.author}" onerror="this.src='${fallbackImg}'">
        <div class="read-info">
          <h3>${data.title}</h3>
          <p>${data.author} · ⏱️ ${data.readTimeMins} мин (${data.wordCount} речи)</p>
          <div><span class="read-meta-tag">${isDone ? '✅ Прочитано' : '📖 Текст за читанку'}</span></div>
        </div>
      </button>
    `;
  }

  html += `</div>`;
  homeEl.innerHTML = html;

  $("#btn-dash-back").addEventListener("click", renderDashboard);
  homeEl.querySelectorAll(".read-card").forEach(b => {
    b.addEventListener("click", () => startReadSession(b.dataset.read));
  });
  window.scrollTo(0, 0);
}

function startReadSession(readId) {
  const data = READ_DB[readId];
  cur = { isRead: true, readId: readId, data: data, index: 0, phase: "reading" };

  homeEl.hidden = true;
  lessonEl.hidden = false;
  $("#rule-btn").hidden = true;
  $("#reset").hidden = true;

  els.title.innerHTML = `<small><span class="level-pill" style="background:#7b2cbf;">ЧИТАЊЕ</span> · ${data.author}</small><b>${data.title}</b>`;
  els.sections.innerHTML = "";
  els.track.innerHTML = "";

  renderReadTextView();
  window.scrollTo(0, 0);
}

// 1. Экзаменационный шаг: Пользователь читает текст
function renderReadTextView() {
  cur.phase = "reading";
  els.sections.innerHTML = `<div style="font-size:13px; font-weight:600; color:var(--ink-3); padding:4px 0;">Корак 1 од 2: Прочитајте текст пажљиво</div>`;
  els.track.innerHTML = "";

  const data = cur.data;
  const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author)}&background=7b2cbf&color=fff&size=128`;

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="reading-container">
      <div class="reading-header">
        <img class="reading-author-img" src="${data.authorImg}" alt="${data.author}" onerror="this.src='${fallbackImg}'">
        <div class="reading-title">
          <h2>${data.title}</h2>
          <p>${data.author}</p>
        </div>
      </div>
      <div class="reading-body" lang="sr">${data.text}</div>
    </div>
  `;

  els.bar.innerHTML = `<button class="primary" id="btn-to-questions">Прочитао сам, пређи на питања →</button>`;
  $("#btn-to-questions").addEventListener("click", () => {
    cur.phase = "answer";
    cur.queue = cur.data.questions;
    cur.index = 0;
    renderReadQuestion();
  });
}

// 2. Шаг вопросов по тексту
function renderReadQuestion() {
  cur.phase = "answer";
  cur.state = {};
  
  // Рендерим трек точек для вопросов
  els.track.innerHTML = cur.queue.map((q, i) => {
    let c = (i === cur.index && cur.phase === "answer") ? "cur" 
          : (q.result === true) ? "ok" 
          : (q.result === false) ? "bad" : "";
    return `<i class="${c}"></i>`;
  }).join("");

  els.sections.innerHTML = `<div style="font-size:12px; font-weight:600; color:var(--ink-3); padding:4px 0;">Питање ${cur.index + 1} од ${cur.queue.length}</div>`;

  const q = cur.queue[cur.index];
  let html = "";
  if (q.format === "choice") html = viewChoice(q);
  else if (q.format === "fill") html = viewFill(q);

  const metaHeader = `
    <div class="card-meta">
      <div class="card-breadcrumbs">
        <span class="level-pill" style="background:#7b2cbf;">ПРОВЕРА</span>
        <span class="crumb-lesson">${esc(cur.data.title)}</span>
      </div>
      <div class="card-counter">${cur.index + 1} / ${cur.queue.length}</div>
    </div>`;

  els.exercise.className = "card";
  els.exercise.innerHTML = metaHeader + html + `<div id="tip"></div>`;
  
  bindExercise(q.format, q);
  els.exercise.querySelector(".tools")?.remove();
  renderBar();
}

function finishRead() {
  cur.phase = "done";
  els.sections.innerHTML = "";
  els.track.innerHTML = "";

  const total = cur.queue.length;
  const correct = cur.queue.filter(q => q.result === true).length;
  const isPassed = correct >= Math.ceil(total * 0.7); // Порог: 70% правильных

  if (isPassed) {
    readProgress[cur.readId] = true;
    store("srpski-read-v1", readProgress);
  }

  els.exercise.className = "card";
  els.exercise.innerHTML = `
    <div class="finish">
      <div class="stolnjak"><b>${isPassed ? "Браво!" : "Покушајте поново!"}</b></div>
      <div class="finish-num">${correct}<span> / ${total}</span></div>
      <p style="font-size:16px; font-weight:600; color:var(--ink); margin: 6px 0 20px;">
        ${isPassed ? "Успешно сте прочитали и савладали овај текст!" : "Нисте скупили довољно тачних одговора. Прочитајте текст пажљивије."}
      </p>
      <div class="row">
        <button class="secondary" id="read-again">Прочитај поново</button>
      </div>
    </div>`;

  $("#read-again").addEventListener("click", () => startReadSession(cur.readId));
  
  els.bar.innerHTML = `<button class="primary" id="read-to-home">Назад на списак текстова</button>`;
  $("#read-to-home").addEventListener("click", () => {
    cur.isRead = false;
    openReadCatalog();
  });
}

// Запуск приложения
renderDashboard();
