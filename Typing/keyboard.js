/**
 * keyboard.js - キーボードガイドUI
 *
 * 画面上に仮想キーボードを表示し、次に押すべきキーをハイライトする。
 * 各キーに担当する指の情報を持ち、指ごとに色分けする。
 */

// キーボードレイアウト定義
// finger: 0=左小指, 1=左薬指, 2=左中指, 3=左人差指, 4=左親指,
//         5=右親指, 6=右人差指, 7=右中指, 8=右薬指, 9=右小指
const KEYBOARD_LAYOUT = [
  // 数字行
  [
    { key: "1", finger: 0, width: 1 }, { key: "2", finger: 1, width: 1 },
    { key: "3", finger: 2, width: 1 }, { key: "4", finger: 3, width: 1 },
    { key: "5", finger: 3, width: 1 }, { key: "6", finger: 6, width: 1 },
    { key: "7", finger: 6, width: 1 }, { key: "8", finger: 7, width: 1 },
    { key: "9", finger: 8, width: 1 }, { key: "0", finger: 9, width: 1 },
    { key: "-", finger: 9, width: 1 },
  ],
  // 上段
  [
    { key: "q", finger: 0, width: 1 }, { key: "w", finger: 1, width: 1 },
    { key: "e", finger: 2, width: 1 }, { key: "r", finger: 3, width: 1 },
    { key: "t", finger: 3, width: 1 }, { key: "y", finger: 6, width: 1 },
    { key: "u", finger: 6, width: 1 }, { key: "i", finger: 7, width: 1 },
    { key: "o", finger: 8, width: 1 }, { key: "p", finger: 9, width: 1 },
  ],
  // ホームポジション
  [
    { key: "a", finger: 0, width: 1 }, { key: "s", finger: 1, width: 1 },
    { key: "d", finger: 2, width: 1 }, { key: "f", finger: 3, width: 1 },
    { key: "g", finger: 3, width: 1 }, { key: "h", finger: 6, width: 1 },
    { key: "j", finger: 6, width: 1 }, { key: "k", finger: 7, width: 1 },
    { key: "l", finger: 8, width: 1 }, { key: ";", finger: 9, width: 1 },
  ],
  // 下段
  [
    { key: "z", finger: 0, width: 1 }, { key: "x", finger: 1, width: 1 },
    { key: "c", finger: 2, width: 1 }, { key: "v", finger: 3, width: 1 },
    { key: "b", finger: 3, width: 1 }, { key: "n", finger: 6, width: 1 },
    { key: "m", finger: 6, width: 1 }, { key: ",", finger: 7, width: 1 },
    { key: ".", finger: 8, width: 1 }, { key: "/", finger: 9, width: 1 },
  ],
  // スペースバー
  [
    { key: "Space", finger: 4, width: 6, code: " " },
  ]
];

// 指ごとのカラー
const FINGER_COLORS = [
  "#FF6B6B", // 0: 左小指 - 赤
  "#FFA94D", // 1: 左薬指 - オレンジ
  "#FFD93D", // 2: 左中指 - 黄
  "#69DB7C", // 3: 左人差指 - 緑
  "#748FFC", // 4: 左親指 - 青
  "#748FFC", // 5: 右親指 - 青
  "#69DB7C", // 6: 右人差指 - 緑
  "#FFD93D", // 7: 右中指 - 黄
  "#FFA94D", // 8: 右薬指 - オレンジ
  "#FF6B6B", // 9: 右小指 - 赤
];

const FINGER_NAMES = [
  "左小指", "左薬指", "左中指", "左人差指", "左親指",
  "右親指", "右人差指", "右中指", "右薬指", "右小指"
];

/**
 * キーボードUIを生成して指定要素に挿入する
 */
function renderKeyboard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  KEYBOARD_LAYOUT.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "keyboard-row";

    row.forEach(keyDef => {
      const keyEl = document.createElement("div");
      keyEl.className = "key";
      keyEl.dataset.key = keyDef.code || keyDef.key;
      keyEl.dataset.finger = keyDef.finger;
      keyEl.textContent = keyDef.key.toUpperCase();

      if (keyDef.width > 1) {
        keyEl.style.flex = keyDef.width;
      }

      rowDiv.appendChild(keyEl);
    });

    container.appendChild(rowDiv);
  });
}

/**
 * 指定キーをハイライトする
 */
function highlightKey(key) {
  // まず全ハイライトを解除
  document.querySelectorAll(".key").forEach(el => {
    el.classList.remove("key-active");
    el.style.backgroundColor = "";
    el.style.color = "";
  });

  if (!key) return;

  const normalizedKey = key.toLowerCase();
  const keyEl = document.querySelector(`.key[data-key="${normalizedKey}"]`);

  if (keyEl) {
    const finger = parseInt(keyEl.dataset.finger);
    keyEl.classList.add("key-active");
    keyEl.style.backgroundColor = FINGER_COLORS[finger];
    keyEl.style.color = "#1a1a2e";

    // 指名表示を更新
    const fingerLabel = document.getElementById("finger-label");
    if (fingerLabel) {
      fingerLabel.textContent = `${FINGER_NAMES[finger]}で「${key.toUpperCase()}」`;
    }
  }
}

/**
 * 「'」(アポストロフィ)キーをハイライトする特別処理
 */
function highlightSpecialKey(key) {
  highlightKey(key);
}
