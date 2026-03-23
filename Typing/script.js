/**
 * script.js - メインアプリケーションロジック
 *
 * タイピング練習の全体フロー制御:
 * 1. ホーム画面（説明ページ）
 * 2. スペースキー → 3-2-1 カウントダウン → タイピング開始
 * 3. 結果表示画面
 * ナビバーは常時表示、ダーク/ライトテーマ切替対応
 */

// ===== グローバル状態 =====
let currentMode = "proverbs";
let questions = [];
let currentQuestionIndex = 0;
let currentPhase = "reading"; // "reading" or "meaning"
let matcher = null;
let startTime = null;
let totalCorrectChars = 0;
let totalMiss = 0;
let totalKeystrokes = 0;
let isTyping = false;
let waitingForSpace = false;
const QUESTION_COUNT = 10;
const soundManager = new SoundManager();

// ===== 初期化 =====
document.addEventListener("DOMContentLoaded", () => {
  renderKeyboard("keyboard-container");
  initTheme();
  initSoundUI();
  showHome();
  setupEventListeners();
});

// ===== テーマ管理 =====
function initTheme() {
  const saved = localStorage.getItem("typing-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("typing-theme", next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.innerHTML = theme === "dark"
    ? '<i class="fas fa-moon"></i>'
    : '<i class="fas fa-sun"></i>';
}

// ===== サウンドUI管理 =====
function initSoundUI() {
  updateSoundUI();
}

function updateSoundUI() {
  const current = soundManager.soundType;
  const info = SOUND_TYPES.find(t => t.id === current) || SOUND_TYPES[0];

  // ホーム画面のボタン
  document.querySelectorAll(".sound-type-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === current);
  });

  // タイピング中インジケーター
  const indicator = document.getElementById("sound-indicator");
  if (indicator) {
    indicator.textContent = `${info.icon} ${info.label}`;
    indicator.title = `キー音: ${info.label}（クリックで切替）`;
  }
}


function setupEventListeners() {
  // ハンバーガーメニュー
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }

  // テーマ切替（存在する場合のみ）
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

  // サウンドトグル（存在する場合のみ）
  const soundToggle = document.getElementById("sound-toggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      const enabled = soundManager.toggle();
      soundToggle.innerHTML = enabled ? '<i class="fas fa-volume-up"></i> ON' : '<i class="fas fa-volume-mute"></i> OFF';
      soundToggle.classList.toggle("sound-off", !enabled);
    });
  }

  // 音種ボタン（ホーム画面）
  document.querySelectorAll(".sound-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      soundManager.setType(btn.dataset.type);
      updateSoundUI();
      // プレビュー再生（消音以外）
      if (btn.dataset.type !== "off") soundManager.playCorrect();
    });
  });

  // タイピング中音インジケーター（クリックで次の音種へ）
  const soundIndicator = document.getElementById("sound-indicator");
  if (soundIndicator) {
    soundIndicator.addEventListener("click", () => {
      const next = soundManager.cycleType();
      updateSoundUI();
      if (next.id !== "off") soundManager.playCorrect();
    });
  }

  // キーボード入力
  document.addEventListener("keydown", handleKeyDown);

  // ナビバー: ホーム
  document.getElementById("nav-home").addEventListener("click", (e) => {
    e.preventDefault();
    showHome();
  });

  // ナビバー: ことわざモード（存在する場合のみ）
  const navProverbs = document.getElementById("nav-proverbs");
  if (navProverbs) {
    navProverbs.addEventListener("click", (e) => {
      e.preventDefault();
      prepareGame("proverbs");
    });
  }

  // ナビバー: 名言モード（存在する場合のみ）
  const navQuotes = document.getElementById("nav-quotes");
  if (navQuotes) {
    navQuotes.addEventListener("click", (e) => {
      e.preventDefault();
      prepareGame("quotes");
    });
  }

  // ホーム画面の開始ボタン（存在する場合のみ）
  const heroStartBtn = document.getElementById("hero-start-btn");
  if (heroStartBtn) {
    heroStartBtn.addEventListener("click", () => {
      prepareGame("proverbs");
    });
  }

  // モードカード
  document.getElementById("mode-card-proverbs").addEventListener("click", () => {
    prepareGame("proverbs");
  });
  document.getElementById("mode-card-quotes").addEventListener("click", () => {
    prepareGame("quotes");
  });
  document.getElementById("mode-card-yojijukugo").addEventListener("click", () => {
    prepareGame("yojijukugo");
  });
  document.getElementById("mode-card-idioms").addEventListener("click", () => {
    prepareGame("idioms");
  });

  // リトライボタン
  document.getElementById("retry-btn").addEventListener("click", () => {
    prepareGame(currentMode);
  });

  // ホームに戻るボタン
  document.getElementById("home-btn").addEventListener("click", () => {
    showHome();
  });
}

// ===== 画面切り替え =====
function showHome() {
  document.getElementById("home-screen").classList.remove("hidden");
  document.getElementById("typing-area").classList.add("hidden");
  document.getElementById("result-screen").classList.add("hidden");
  updateNavActive("nav-home");
  isTyping = false;
  waitingForSpace = false;
}

function showTypingArea() {
  document.getElementById("home-screen").classList.add("hidden");
  document.getElementById("typing-area").classList.remove("hidden");
  document.getElementById("result-screen").classList.add("hidden");
  updateNavActive(currentMode === "quotes" ? "nav-quotes" : "nav-proverbs");
}

function showResult() {
  document.getElementById("home-screen").classList.add("hidden");
  document.getElementById("typing-area").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");
  updateNavActive("");
  isTyping = false;
  waitingForSpace = false;
  soundManager.playComplete();
}

function updateNavActive(activeId) {
  document.querySelectorAll(".nav-link:not(.disabled)").forEach(link => {
    link.classList.remove("active");
  });
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el && el.classList.contains("nav-link")) {
      el.classList.add("active");
    }
  }
}

// ===== ゲーム準備（スペースキー待ち） =====
function prepareGame(mode) {
  currentMode = mode;
  questions = getQuestions(mode, QUESTION_COUNT);
  currentQuestionIndex = 0;
  currentPhase = "reading";
  totalCorrectChars = 0;
  totalMiss = 0;
  totalKeystrokes = 0;
  startTime = null;
  isTyping = false;
  waitingForSpace = true;

  showTypingArea();

  // スペースキー案内を表示、問題を隠す
  document.getElementById("space-prompt").classList.remove("hidden");
  document.getElementById("question-section").classList.add("hidden");
  document.getElementById("progress-bar-fill").style.width = "0%";
  document.getElementById("progress-text").textContent = `1 / ${questions.length}`;
}

// ===== カウントダウン =====
function startCountdown() {
  waitingForSpace = false;
  const overlay = document.getElementById("countdown-overlay");
  const numEl = document.getElementById("countdown-number");
  overlay.classList.remove("hidden");

  let count = 3;
  numEl.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numEl.textContent = count;
      // Re-trigger animation
      numEl.style.animation = "none";
      numEl.offsetHeight; // force reflow
      numEl.style.animation = "";
    } else {
      clearInterval(interval);
      overlay.classList.add("hidden");
      beginTyping();
    }
  }, 800);
}

// ===== タイピング開始 =====
function beginTyping() {
  document.getElementById("space-prompt").classList.add("hidden");
  document.getElementById("question-section").classList.remove("hidden");
  startTime = Date.now();
  isTyping = true;
  loadCurrentQuestion();
}

// ===== 問題読み込み =====
function loadCurrentQuestion() {
  if (currentQuestionIndex >= questions.length) {
    finishGame();
    return;
  }

  const q = questions[currentQuestionIndex];
  const isReading = currentPhase === "reading";

  // モード別のラベル
  if (currentMode === "quotes") {
    document.getElementById("question-label").textContent =
      isReading ? "💬 名言" : "💬 名言の人物";
  } else if (currentMode === "yojijukugo") {
    document.getElementById("question-label").textContent =
      isReading ? "🈴 四字熟語" : "🈴 四字熟語の意味";
  } else if (currentMode === "idioms") {
    document.getElementById("question-label").textContent =
      isReading ? "💡 慣用句" : "💡 慣用句の意味";
  } else {
    document.getElementById("question-label").textContent =
      isReading ? "📖 ことわざ" : "📖 ことわざの意味";
  }

  document.getElementById("question-text").textContent =
    isReading ? q.text : q.meaning;

  const typingTarget = isReading ? q.reading : q.meaningReading;
  document.getElementById("kana-display").textContent = typingTarget;

  // マッチャー初期化
  matcher = new RomajiMatcher(typingTarget);

  // ローマ字表示を更新
  updateRomajiDisplay();
  updateProgress();

  // 最初のキーハイライト
  const displayRomaji = matcher.getDynamicDisplayRomaji();
  if (displayRomaji.length > 0) {
    highlightKey(displayRomaji[0]);
  }
}

// ===== ローマ字表示更新 =====
function updateRomajiDisplay() {
  const container = document.getElementById("romaji-display");
  container.innerHTML = "";

  const displayRomaji = matcher.getDynamicDisplayRomaji();
  const completedLen = matcher.getCompletedLength();

  for (let i = 0; i < displayRomaji.length; i++) {
    const span = document.createElement("span");
    span.textContent = displayRomaji[i];

    if (i < completedLen) {
      span.className = "char-correct";
    } else if (i === completedLen) {
      span.className = "char-current";
    } else {
      span.className = "char-pending";
    }

    container.appendChild(span);
  }
}

// ===== キー入力処理 =====
function handleKeyDown(e) {
  // スペースキーでカウントダウン開始
  if (waitingForSpace && e.key === " ") {
    e.preventDefault();
    startCountdown();
    return;
  }

  if (!isTyping || !matcher) return;

  // 特殊キーは無視
  if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" ||
      e.key === "Meta" || e.key === "Tab" || e.key === "Escape" ||
      e.key === "CapsLock" || e.key === "Enter" || e.key === "Backspace" ||
      e.key === "ArrowUp" || e.key === "ArrowDown" ||
      e.key === "ArrowLeft" || e.key === "ArrowRight" ||
      e.key === " ") {
    return;
  }

  e.preventDefault();

  const key = e.key;
  const result = matcher.processKey(key);

  totalKeystrokes++;

  if (result.correct) {
    soundManager.playCorrect();

    if (result.allCompleted) {
      totalCorrectChars += matcher.completedRomaji.length;
      totalMiss += matcher.missCount;
      advancePhase();
    } else {
      updateRomajiDisplay();
      const displayRomaji = matcher.getDynamicDisplayRomaji();
      const nextIdx = matcher.getCompletedLength();
      if (nextIdx < displayRomaji.length) {
        highlightKey(displayRomaji[nextIdx]);
      }
    }
  } else {
    soundManager.playMiss();
  }
}

// ===== フェーズ進行 =====
function advancePhase() {
  if (currentPhase === "reading") {
    currentPhase = "meaning";
    loadCurrentQuestion();
  } else {
    currentPhase = "reading";
    currentQuestionIndex++;
    updateProgress();
    loadCurrentQuestion();
  }
}

// ===== ゲーム終了 =====
function finishGame() {
  const elapsed = (Date.now() - startTime) / 1000;
  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round(totalCorrectChars / 5 / minutes) : 0;
  const accuracy = totalKeystrokes > 0
    ? Math.round(((totalKeystrokes - totalMiss) / totalKeystrokes) * 100)
    : 100;

  document.getElementById("result-wpm").textContent = wpm;
  document.getElementById("result-accuracy").textContent = accuracy + "%";
  document.getElementById("result-miss").textContent = totalMiss;
  document.getElementById("result-time").textContent = formatTime(elapsed);
  document.getElementById("result-chars").textContent = totalCorrectChars;

  const rating = getRating(wpm, accuracy);
  document.getElementById("result-rating").textContent = rating.emoji;
  document.getElementById("result-comment").textContent = rating.comment;

  showResult();
}

function getRating(wpm, accuracy) {
  if (wpm >= 60 && accuracy >= 95) return { emoji: "🏆", comment: "素晴らしい！マスタータイピスト！" };
  if (wpm >= 40 && accuracy >= 90) return { emoji: "🥇", comment: "とても上手です！" };
  if (wpm >= 25 && accuracy >= 85) return { emoji: "🥈", comment: "いい調子です！もう少し練習しよう！" };
  if (wpm >= 15 && accuracy >= 75) return { emoji: "🥉", comment: "がんばっています！続けましょう！" };
  return { emoji: "💪", comment: "練習あるのみ！毎日続けよう！" };
}

// ===== 表示ユーティリティ =====
function updateProgress() {
  const total = questions.length * 2;
  const current = currentQuestionIndex * 2 + (currentPhase === "meaning" ? 1 : 0);
  const percent = Math.round((current / total) * 100);

  document.getElementById("progress-bar-fill").style.width = percent + "%";
  document.getElementById("progress-text").textContent =
    `${currentQuestionIndex + 1} / ${questions.length}`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
