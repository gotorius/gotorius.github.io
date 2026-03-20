/**
 * romaji.js - ひらがな→ローマ字変換エンジン
 *
 * ひらがな文字列を受け取り、ローマ字入力の全パターンを管理する。
 * 複数のローマ字入力方式（shi/si, chi/ti, tsu/tu 等）に対応。
 */

// ===== ひらがな → ローマ字変換テーブル =====
const ROMAJI_MAP = {
  // 基本母音
  "あ": ["a"], "い": ["i"], "う": ["u"], "え": ["e"], "お": ["o"],

  // か行
  "か": ["ka"], "き": ["ki"], "く": ["ku"], "け": ["ke"], "こ": ["ko"],

  // さ行
  "さ": ["sa"], "し": ["si", "shi", "ci"], "す": ["su"], "せ": ["se"], "そ": ["so"],

  // た行
  "た": ["ta"], "ち": ["ti", "chi"], "つ": ["tu", "tsu"], "て": ["te"], "と": ["to"],

  // な行
  "な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],

  // は行
  "は": ["ha"], "ひ": ["hi"], "ふ": ["hu", "fu"], "へ": ["he"], "ほ": ["ho"],

  // ま行
  "ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],

  // や行
  "や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],

  // ら行
  "ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],

  // わ行
  "わ": ["wa"], "を": ["wo"], "ん": ["nn", "n'", "xn"],

  // が行
  "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],

  // ざ行
  "ざ": ["za"], "じ": ["zi", "ji"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],

  // だ行
  "だ": ["da"], "ぢ": ["di"], "づ": ["du", "dzu"], "で": ["de"], "ど": ["do"],

  // ば行
  "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],

  // ぱ行
  "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],

  // 拗音 - きゃ行
  "きゃ": ["kya"], "きゅ": ["kyu"], "きょ": ["kyo"],

  // 拗音 - しゃ行
  "しゃ": ["sya", "sha"], "しゅ": ["syu", "shu"], "しょ": ["syo", "sho"],

  // 拗音 - ちゃ行
  "ちゃ": ["tya", "cha", "cya"], "ちゅ": ["tyu", "chu", "cyu"], "ちょ": ["tyo", "cho", "cyo"],

  // 拗音 - にゃ行
  "にゃ": ["nya"], "にゅ": ["nyu"], "にょ": ["nyo"],

  // 拗音 - ひゃ行
  "ひゃ": ["hya"], "ひゅ": ["hyu"], "ひょ": ["hyo"],

  // 拗音 - みゃ行
  "みゃ": ["mya"], "みゅ": ["myu"], "みょ": ["myo"],

  // 拗音 - りゃ行
  "りゃ": ["rya"], "りゅ": ["ryu"], "りょ": ["ryo"],

  // 拗音 - ぎゃ行
  "ぎゃ": ["gya"], "ぎゅ": ["gyu"], "ぎょ": ["gyo"],

  // 拗音 - じゃ行
  "じゃ": ["ja", "zya", "jya"], "じゅ": ["ju", "zyu", "jyu"], "じょ": ["jo", "zyo", "jyo"],

  // 拗音 - びゃ行
  "びゃ": ["bya"], "びゅ": ["byu"], "びょ": ["byo"],

  // 拗音 - ぴゃ行
  "ぴゃ": ["pya"], "ぴゅ": ["pyu"], "ぴょ": ["pyo"],

  // 拗音 - でぃ等
  "でぃ": ["dhi"], "てぃ": ["thi"],

  // 小文字
  "ぁ": ["xa", "la"], "ぃ": ["xi", "li"], "ぅ": ["xu", "lu"],
  "ぇ": ["xe", "le"], "ぉ": ["xo", "lo"],
  "ゃ": ["xya", "lya"], "ゅ": ["xyu", "lyu"], "ょ": ["xyo", "lyo"],
  "っ": ["xtu", "ltu", "xtsu", "ltsu"],

  // 記号
  "ー": ["-"], "、": [","], "。": ["."],
  "？": ["?"], "！": ["!"],
};

/**
 * ひらがな文字列をチャンク（入力単位）に分割する
 *
 * @param {string} hiragana - ひらがな文字列
 * @returns {Array<{kana: string, romajiOptions: string[]}>}
 *   各チャンクの「かな」と「可能なローマ字入力パターン」の配列
 */
function parseHiraganaToChunks(hiragana) {
  const chunks = [];
  let i = 0;

  while (i < hiragana.length) {
    // 促音「っ」の処理
    if (hiragana[i] === "っ") {
      // 次の文字の子音を重ねる方式にも対応
      if (i + 1 < hiragana.length) {
        // 次のチャンクを先読み（2文字拗音 or 1文字）
        let nextKana = "";
        let nextRomajis = [];
        if (i + 2 < hiragana.length && ROMAJI_MAP[hiragana.substring(i + 1, i + 3)]) {
          nextKana = hiragana.substring(i + 1, i + 3);
          nextRomajis = ROMAJI_MAP[nextKana];
        } else if (ROMAJI_MAP[hiragana[i + 1]]) {
          nextKana = hiragana[i + 1];
          nextRomajis = ROMAJI_MAP[nextKana];
        }

        if (nextRomajis.length > 0) {
          // 「っ」+次のかなをまとめて1チャンクにする
          const combinedOptions = [];
          for (const romaji of nextRomajis) {
            // 子音を重ねるパターン（例: "kka", "tti"）
            const firstConsonant = romaji[0];
            combinedOptions.push(firstConsonant + romaji);
          }
          // 「xtu」「ltu」等 + 次のかなの独立入力パターン
          const tsuOptions = ROMAJI_MAP["っ"];
          for (const tsuRomaji of tsuOptions) {
            for (const nextRomaji of nextRomajis) {
              combinedOptions.push(tsuRomaji + nextRomaji);
            }
          }

          chunks.push({
            kana: "っ" + nextKana,
            romajiOptions: combinedOptions
          });
          i += 1 + nextKana.length;
          continue;
        }
      }
      // 次の文字がないか、マッピングがない場合
      chunks.push({
        kana: "っ",
        romajiOptions: ROMAJI_MAP["っ"]
      });
      i++;
      continue;
    }

    // 「ん」の処理
    if (hiragana[i] === "ん") {
      // 次の文字が母音・な行・や行でなければ "n" 単体もOK
      const nextChar = hiragana[i + 1] || "";
      const needsDouble = "あいうえおなにぬねのにゃにゅにょやゆよ".includes(nextChar) || nextChar === "";

      if (i + 1 < hiragana.length) {
        // 次のチャンクを先読み
        let nextKana = "";
        let nextRomajis = [];
        if (i + 2 < hiragana.length && ROMAJI_MAP[hiragana.substring(i + 1, i + 3)]) {
          nextKana = hiragana.substring(i + 1, i + 3);
          nextRomajis = ROMAJI_MAP[nextKana];
        } else if (ROMAJI_MAP[hiragana[i + 1]]) {
          nextKana = hiragana[i + 1];
          nextRomajis = ROMAJI_MAP[nextKana];
        }

        if (nextRomajis.length > 0 && !needsDouble) {
          // 「ん」+次の文字をまとめて、 "n" + 次のローマ字 を許可
          const combinedOptions = [];
          // n + 次のかな（次がna行以外なら可）
          for (const nr of nextRomajis) {
            combinedOptions.push("n" + nr);
          }
          // nn / n' / xn + 次のかな
          for (const nRomaji of ROMAJI_MAP["ん"]) {
            for (const nr of nextRomajis) {
              combinedOptions.push(nRomaji + nr);
            }
          }
          chunks.push({
            kana: "ん" + nextKana,
            romajiOptions: combinedOptions
          });
          i += 1 + nextKana.length;
          continue;
        }
      }

      // 文末の「ん」 or 次が母音/な行の場合
      if (nextChar === "") {
        // 文末の「ん」は n 単体でもOK
        chunks.push({ kana: "ん", romajiOptions: ["n", ...ROMAJI_MAP["ん"]] });
      } else if (needsDouble) {
        // 次が母音・な行・や行の場合は nn 等が必要
        chunks.push({ kana: "ん", romajiOptions: ROMAJI_MAP["ん"] });
      } else {
        // 単独 n も可
        chunks.push({ kana: "ん", romajiOptions: ["n", ...ROMAJI_MAP["ん"]] });
      }
      i++;
      continue;
    }

    // 2文字拗音チェック
    if (i + 1 < hiragana.length) {
      const twoChar = hiragana.substring(i, i + 2);
      if (ROMAJI_MAP[twoChar]) {
        chunks.push({
          kana: twoChar,
          romajiOptions: ROMAJI_MAP[twoChar]
        });
        i += 2;
        continue;
      }
    }

    // 1文字
    const oneChar = hiragana[i];
    if (ROMAJI_MAP[oneChar]) {
      chunks.push({
        kana: oneChar,
        romajiOptions: ROMAJI_MAP[oneChar]
      });
    } else {
      // マッピングにない文字（スペース等）はそのまま
      chunks.push({
        kana: oneChar,
        romajiOptions: [oneChar]
      });
    }
    i++;
  }

  return chunks;
}

/**
 * チャンクベースの入力判定クラス
 *
 * ひらがな文字列を受け取り、キー入力をリアルタイムに判定する。
 */
class RomajiMatcher {
  constructor(hiragana) {
    this.chunks = parseHiraganaToChunks(hiragana);
    this.currentChunkIndex = 0;
    this.currentInput = "";       // 現在のチャンクへの入力途中文字列
    this.completedRomaji = "";    // 完了したローマ字全体
    this.totalKeystrokes = 0;
    this.missCount = 0;
  }

  /**
   * キー入力を処理する
   * @param {string} key - 入力されたキー（1文字）
   * @returns {{correct: boolean, chunkCompleted: boolean, allCompleted: boolean}}
   */
  processKey(key) {
    if (this.isCompleted()) {
      return { correct: false, chunkCompleted: false, allCompleted: true };
    }

    this.totalKeystrokes++;
    const chunk = this.chunks[this.currentChunkIndex];
    const testInput = this.currentInput + key;

    // 現在のチャンクの候補から、testInputで始まるものがあるか確認
    const matchingOptions = chunk.romajiOptions.filter(opt => opt.startsWith(testInput));

    if (matchingOptions.length > 0) {
      // 正しい入力
      this.currentInput = testInput;

      // 完全一致する候補があればチャンク完了
      const exactMatch = matchingOptions.find(opt => opt === testInput);
      if (exactMatch) {
        this.completedRomaji += exactMatch;
        this.currentInput = "";
        this.currentChunkIndex++;

        return {
          correct: true,
          chunkCompleted: true,
          allCompleted: this.currentChunkIndex >= this.chunks.length
        };
      }

      return { correct: true, chunkCompleted: false, allCompleted: false };
    } else {
      // ミス
      this.missCount++;
      return { correct: false, chunkCompleted: false, allCompleted: false };
    }
  }

  /**
   * 表示用のローマ字文字列を取得（最短のパターン）
   */
  getDisplayRomaji() {
    return this.chunks.map(chunk => chunk.romajiOptions[0]).join("");
  }

  /**
   * 現在入力済みのローマ字文字数を取得
   */
  getCompletedLength() {
    let len = this.completedRomaji.length + this.currentInput.length;
    return len;
  }

  /**
   * 現在のチャンクで次に期待されるローマ字表示を取得
   */
  getCurrentExpectedDisplay() {
    if (this.isCompleted()) return "";
    const chunk = this.chunks[this.currentChunkIndex];
    // 現在の入力に合致する候補の中で最短のものを表示
    const matching = chunk.romajiOptions.filter(opt => opt.startsWith(this.currentInput));
    if (matching.length > 0) {
      matching.sort((a, b) => a.length - b.length);
      return matching[0];
    }
    return chunk.romajiOptions[0];
  }

  /**
   * 表示用ローマ字（動的：入力途中の分岐を反映）
   */
  getDynamicDisplayRomaji() {
    let result = this.completedRomaji;

    for (let i = this.currentChunkIndex; i < this.chunks.length; i++) {
      if (i === this.currentChunkIndex) {
        // 現在のチャンク：入力に合致する最短候補
        const matching = this.chunks[i].romajiOptions.filter(opt =>
          opt.startsWith(this.currentInput)
        );
        if (matching.length > 0) {
          matching.sort((a, b) => a.length - b.length);
          result += matching[0];
        } else {
          result += this.chunks[i].romajiOptions[0];
        }
      } else {
        result += this.chunks[i].romajiOptions[0];
      }
    }
    return result;
  }

  isCompleted() {
    return this.currentChunkIndex >= this.chunks.length;
  }

  getAccuracy() {
    if (this.totalKeystrokes === 0) return 100;
    return Math.round(((this.totalKeystrokes - this.missCount) / this.totalKeystrokes) * 100);
  }
}
