// 2048 ゲームロジック

// ゲーム状態
let gameState = {
    grid: [],
    score: 0,
    bestScore: 0,
    maxTile: 0,
    gameOver: false,
    won: false,
    size: 4,
    tileSize: 0,
    gap: 10,
    isMoving: false,
    // タイマー関連
    timerInterval: null,
    startTime: null,
    elapsedTime: 0,
    // 背景テーマ
    backgrounds: [
        { name: 'ダークブルー', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
        { name: 'グリーン', gradient: 'linear-gradient(135deg, #1a3d28 0%, #0d2818 100%)' },
        { name: 'パープル', gradient: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%)' },
        { name: 'レッド', gradient: 'linear-gradient(135deg, #b71c1c 0%, #c62828 100%)' },
        { name: 'ダーク', gradient: 'linear-gradient(135deg, #212121 0%, #424242 100%)' },
        { name: 'オレンジ', gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)' },
        { name: 'ティール', gradient: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)' }
    ],
    currentBgIndex: 0,
    // タイル管理（アニメーション用）
    tiles: []
};

// DOM要素
const boardElement = document.getElementById('board');
const tileContainer = document.getElementById('tile-container');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const maxTileElement = document.getElementById('max-tile');
const timerElement = document.getElementById('timer');
const gameStatus = document.getElementById('game-status');
const statusText = document.getElementById('status-text');

// モーダル
const resultModal = document.getElementById('result-modal');
const rankingModal = document.getElementById('ranking-modal');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadBestScore();
    loadBackgroundIndex();
    applyBackground();
    calculateTileSize();
    setupEventListeners();
    startNewGame();
});

// タイルサイズを計算
function calculateTileSize() {
    const boardRect = boardElement.getBoundingClientRect();
    const boardSize = boardRect.width - 20; // パディング分を引く
    gameState.gap = boardSize > 350 ? 10 : 8;
    gameState.tileSize = (boardSize - (gameState.size + 1) * gameState.gap) / gameState.size;
}

// イベントリスナー設定
function setupEventListeners() {
    // キーボード操作
    document.addEventListener('keydown', handleKeyDown);

    // 新しいゲームボタン
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);

    // 背景変更ボタン（削除済みの場合はスキップ）
    const bgBtn = document.getElementById('bg-change-btn');
    if (bgBtn) bgBtn.addEventListener('click', changeBackground);

    // ランキングボタン
    document.getElementById('ranking-btn').addEventListener('click', showRanking);

    // 結果モーダル
    document.getElementById('retry-btn').addEventListener('click', () => {
        resultModal.classList.add('hidden');
        startNewGame();
    });
    document.getElementById('close-result-btn').addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });
    document.getElementById('register-ranking-btn').addEventListener('click', registerRanking);

    // ランキングモーダル
    document.getElementById('close-ranking-btn').addEventListener('click', () => {
        rankingModal.classList.add('hidden');
    });

    // タッチ操作（スワイプ）
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    boardElement.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    boardElement.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const minSwipeDistance = 50;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > minSwipeDistance) {
                if (diffX > 0) {
                    move('right');
                } else {
                    move('left');
                }
            }
        } else {
            if (Math.abs(diffY) > minSwipeDistance) {
                if (diffY > 0) {
                    move('down');
                } else {
                    move('up');
                }
            }
        }
    }

    // ウィンドウリサイズ時にタイルサイズを再計算
    window.addEventListener('resize', () => {
        calculateTileSize();
        renderBoard();
    });
}

// キーボード操作ハンドラ
function handleKeyDown(e) {
    if (gameState.gameOver || gameState.isMoving) return;

    let direction = null;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            direction = 'up';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            direction = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            direction = 'left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            direction = 'right';
            break;
    }

    if (direction) {
        e.preventDefault();
        move(direction);
    }
}

// 新しいゲームを開始
function startNewGame() {
    gameState.grid = [];
    gameState.score = 0;
    gameState.maxTile = 0;
    gameState.gameOver = false;
    gameState.won = false;
    gameState.isMoving = false;
    gameState.tiles = [];

    // タイマーをリセット
    stopTimer();
    gameState.elapsedTime = 0;
    updateTimerDisplay();
    startTimer();

    // 4x4グリッドを初期化
    for (let i = 0; i < gameState.size; i++) {
        gameState.grid[i] = [];
        for (let j = 0; j < gameState.size; j++) {
            gameState.grid[i][j] = 0;
        }
    }

    // 初期タイルを2枚配置
    addRandomTile();
    addRandomTile();

    updateUI();
    renderBoard();
    hideStatus();
}

// ランダムな空きマスに新しいタイルを追加
function addRandomTile() {
    const emptyCells = [];
    
    for (let row = 0; row < gameState.size; row++) {
        for (let col = 0; col < gameState.size; col++) {
            if (gameState.grid[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }

    if (emptyCells.length === 0) return false;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    // 90%の確率で2、10%の確率で4
    const value = Math.random() < 0.9 ? 2 : 4;
    gameState.grid[randomCell.row][randomCell.col] = value;

    return { row: randomCell.row, col: randomCell.col, value };
}

// 移動処理
function move(direction) {
    if (gameState.gameOver || gameState.isMoving) return;

    const oldGrid = gameState.grid.map(row => [...row]);
    let moved = false;
    let scoreGain = 0;
    const mergedPositions = [];
    const movements = []; // 移動情報を記録

    gameState.isMoving = true;

    // 方向に応じてグリッドを処理
    if (direction === 'left') {
        for (let row = 0; row < gameState.size; row++) {
            const result = slideLineWithTracking(gameState.grid[row], row, 'left');
            if (result.moved) {
                moved = true;
                gameState.grid[row] = result.line;
                scoreGain += result.score;
                result.mergedIndices.forEach(col => mergedPositions.push({ row, col }));
                movements.push(...result.movements);
            }
        }
    } else if (direction === 'right') {
        for (let row = 0; row < gameState.size; row++) {
            const result = slideLineWithTracking([...gameState.grid[row]].reverse(), row, 'right');
            if (result.moved) {
                moved = true;
                gameState.grid[row] = result.line.reverse();
                scoreGain += result.score;
                result.mergedIndices.forEach(col => {
                    mergedPositions.push({ row, col: gameState.size - 1 - col });
                });
                // 右方向の移動情報を修正
                result.movements.forEach(m => {
                    movements.push({
                        fromRow: m.fromRow,
                        fromCol: gameState.size - 1 - m.fromCol,
                        toRow: m.toRow,
                        toCol: gameState.size - 1 - m.toCol,
                        value: m.value
                    });
                });
            }
        }
    } else if (direction === 'up') {
        for (let col = 0; col < gameState.size; col++) {
            const column = [];
            for (let row = 0; row < gameState.size; row++) {
                column.push(gameState.grid[row][col]);
            }
            const result = slideLineWithTracking(column, col, 'up');
            if (result.moved) {
                moved = true;
                for (let row = 0; row < gameState.size; row++) {
                    gameState.grid[row][col] = result.line[row];
                }
                scoreGain += result.score;
                result.mergedIndices.forEach(row => mergedPositions.push({ row, col }));
                // 上方向の移動情報を変換
                result.movements.forEach(m => {
                    movements.push({
                        fromRow: m.fromCol,
                        fromCol: col,
                        toRow: m.toCol,
                        toCol: col,
                        value: m.value
                    });
                });
            }
        }
    } else if (direction === 'down') {
        for (let col = 0; col < gameState.size; col++) {
            const column = [];
            for (let row = 0; row < gameState.size; row++) {
                column.push(gameState.grid[row][col]);
            }
            const reversed = column.reverse();
            const result = slideLineWithTracking(reversed, col, 'down');
            if (result.moved) {
                moved = true;
                const newColumn = result.line.reverse();
                for (let row = 0; row < gameState.size; row++) {
                    gameState.grid[row][col] = newColumn[row];
                }
                scoreGain += result.score;
                result.mergedIndices.forEach(row => {
                    mergedPositions.push({ row: gameState.size - 1 - row, col });
                });
                // 下方向の移動情報を変換
                result.movements.forEach(m => {
                    movements.push({
                        fromRow: gameState.size - 1 - m.fromCol,
                        fromCol: col,
                        toRow: gameState.size - 1 - m.toCol,
                        toCol: col,
                        value: m.value
                    });
                });
            }
        }
    }

    if (moved) {
        gameState.score += scoreGain;
        
        // 最大タイルを更新
        updateMaxTile();

        // アニメーション付きで描画
        animateMove(movements, mergedPositions, () => {
            // 新しいタイルを追加
            const newTile = addRandomTile();

            // UIを更新
            updateUI();
            renderBoard(newTile, mergedPositions);

            // ベストスコアを更新
            if (gameState.score > gameState.bestScore) {
                gameState.bestScore = gameState.score;
                saveBestScore();
                bestScoreElement.textContent = gameState.bestScore;
            }

            // 勝利判定（2048達成）
            if (gameState.maxTile >= 2048 && !gameState.won) {
                gameState.won = true;
                showStatus('🎉 2048達成！続けてプレイできます', 'win');
            }

            // ゲームオーバー判定
            setTimeout(() => {
                if (!canMove()) {
                    gameState.gameOver = true;
                    showGameOver();
                }
                gameState.isMoving = false;
            }, 50);
        });
    } else {
        gameState.isMoving = false;
    }
}

// 1行（または1列）をスライドさせる（移動追跡付き）
function slideLineWithTracking(line, lineIndex, direction) {
    const size = line.length;
    const newLine = [];
    let score = 0;
    const mergedIndices = [];
    const movements = [];

    // 0以外の値と元の位置を抽出
    const tiles = [];
    for (let i = 0; i < size; i++) {
        if (line[i] !== 0) {
            tiles.push({ value: line[i], originalIndex: i });
        }
    }

    let newIndex = 0;
    let i = 0;
    while (i < tiles.length) {
        if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
            // マージ
            const mergedValue = tiles[i].value * 2;
            newLine.push(mergedValue);
            score += mergedValue;
            mergedIndices.push(newIndex);
            
            // 両方のタイルの移動を記録
            movements.push({
                fromRow: lineIndex,
                fromCol: tiles[i].originalIndex,
                toRow: lineIndex,
                toCol: newIndex,
                value: tiles[i].value
            });
            movements.push({
                fromRow: lineIndex,
                fromCol: tiles[i + 1].originalIndex,
                toRow: lineIndex,
                toCol: newIndex,
                value: tiles[i + 1].value
            });
            
            i += 2;
        } else {
            newLine.push(tiles[i].value);
            
            // 移動を記録
            movements.push({
                fromRow: lineIndex,
                fromCol: tiles[i].originalIndex,
                toRow: lineIndex,
                toCol: newIndex,
                value: tiles[i].value
            });
            
            i++;
        }
        newIndex++;
    }

    // 残りを0で埋める
    while (newLine.length < size) {
        newLine.push(0);
    }

    // 移動があったかどうかをチェック
    let moved = false;
    for (let j = 0; j < size; j++) {
        if (line[j] !== newLine[j]) {
            moved = true;
            break;
        }
    }

    return { line: newLine, moved, score, mergedIndices, movements };
}

// アニメーション付き移動
function animateMove(movements, mergedPositions, callback) {
    // 現在のタイル要素を取得
    const tileElements = tileContainer.querySelectorAll('.tile');
    
    // 各タイルを移動先にアニメーション
    movements.forEach(m => {
        // 元の位置にあるタイル要素を探す
        const selector = `.tile[data-row="${m.fromRow}"][data-col="${m.fromCol}"]`;
        const tile = tileContainer.querySelector(selector);
        
        if (tile) {
            const newX = m.toCol * (gameState.tileSize + gameState.gap) + gameState.gap;
            const newY = m.toRow * (gameState.tileSize + gameState.gap) + gameState.gap;
            tile.style.left = `${newX}px`;
            tile.style.top = `${newY}px`;
            tile.dataset.row = m.toRow;
            tile.dataset.col = m.toCol;
        }
    });

    // アニメーション完了後にコールバック
    setTimeout(callback, 120);
}

// 移動可能かどうかをチェック
function canMove() {
    // 空きマスがあれば移動可能
    for (let row = 0; row < gameState.size; row++) {
        for (let col = 0; col < gameState.size; col++) {
            if (gameState.grid[row][col] === 0) {
                return true;
            }
        }
    }

    // 隣接するタイルで同じ値があれば移動可能
    for (let row = 0; row < gameState.size; row++) {
        for (let col = 0; col < gameState.size; col++) {
            const value = gameState.grid[row][col];
            // 右のタイル
            if (col + 1 < gameState.size && gameState.grid[row][col + 1] === value) {
                return true;
            }
            // 下のタイル
            if (row + 1 < gameState.size && gameState.grid[row + 1][col] === value) {
                return true;
            }
        }
    }

    return false;
}

// 最大タイルを更新
function updateMaxTile() {
    let max = 0;
    for (let row = 0; row < gameState.size; row++) {
        for (let col = 0; col < gameState.size; col++) {
            if (gameState.grid[row][col] > max) {
                max = gameState.grid[row][col];
            }
        }
    }
    gameState.maxTile = max;
}

// UIを更新
function updateUI() {
    scoreElement.textContent = gameState.score;
    maxTileElement.textContent = gameState.maxTile;
}

// ボードを描画
function renderBoard(newTile = null, mergedPositions = []) {
    tileContainer.innerHTML = '';

    for (let row = 0; row < gameState.size; row++) {
        for (let col = 0; col < gameState.size; col++) {
            const value = gameState.grid[row][col];
            if (value !== 0) {
                const tile = createTileElement(row, col, value);
                
                // 新しいタイルにアニメーションを追加
                if (newTile && newTile.row === row && newTile.col === col) {
                    tile.classList.add('new');
                }
                
                // マージされたタイルにアニメーションを追加
                if (mergedPositions.some(pos => pos.row === row && pos.col === col)) {
                    tile.classList.add('merged');
                }
                
                tileContainer.appendChild(tile);
            }
        }
    }
}

// タイル要素を作成
function createTileElement(row, col, value) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    
    // タイルの値に応じたクラスを追加
    if (value <= 131072) {
        tile.classList.add(`tile-${value}`);
    } else {
        tile.classList.add('tile-super');
    }

    // データ属性を設定（アニメーション用）
    tile.dataset.row = row;
    tile.dataset.col = col;

    // 位置を設定
    const x = col * (gameState.tileSize + gameState.gap) + gameState.gap;
    const y = row * (gameState.tileSize + gameState.gap) + gameState.gap;
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    tile.style.width = `${gameState.tileSize}px`;
    tile.style.height = `${gameState.tileSize}px`;

    // フォントサイズを調整
    let fontSize;
    if (value < 100) {
        fontSize = gameState.tileSize * 0.5;
    } else if (value < 1000) {
        fontSize = gameState.tileSize * 0.4;
    } else if (value < 10000) {
        fontSize = gameState.tileSize * 0.35;
    } else if (value < 100000) {
        fontSize = gameState.tileSize * 0.3;
    } else {
        fontSize = gameState.tileSize * 0.25;
    }
    tile.style.fontSize = `${fontSize}px`;

    tile.textContent = value;

    return tile;
}

// ステータスを表示
function showStatus(message, type) {
    statusText.textContent = message;
    gameStatus.className = 'game-status ' + type;
    gameStatus.classList.remove('hidden');
}

// ステータスを非表示
function hideStatus() {
    gameStatus.classList.add('hidden');
}

// ゲームオーバー表示
function showGameOver() {
    stopTimer();
    showStatus('ゲームオーバー', 'lose');
    
    document.getElementById('result-title').textContent = 'ゲームオーバー';
    document.getElementById('result-score').textContent = gameState.score;
    document.getElementById('result-max-tile').textContent = gameState.maxTile;
    document.getElementById('ranking-input-section').classList.remove('hidden');
    
    resultModal.classList.remove('hidden');
}

// タイマー開始
function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

// タイマー停止
function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// タイマー表示更新
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// タイム表示用フォーマット
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// 背景変更
function changeBackground() {
    gameState.currentBgIndex = (gameState.currentBgIndex + 1) % gameState.backgrounds.length;
    saveBackgroundIndex();
    applyBackground();
}

// 背景適用
function applyBackground() {
    const bg = gameState.backgrounds[gameState.currentBgIndex];
    document.body.style.background = bg.gradient;
}

// 背景インデックスを保存
function saveBackgroundIndex() {
    localStorage.setItem('2048-bg-index', gameState.currentBgIndex.toString());
}

// 背景インデックスを読み込み
function loadBackgroundIndex() {
    const saved = localStorage.getItem('2048-bg-index');
    if (saved) {
        gameState.currentBgIndex = parseInt(saved, 10);
    }
}

// ベストスコアを保存
function saveBestScore() {
    localStorage.setItem('2048-best-score', gameState.bestScore.toString());
}

// ベストスコアを読み込み
function loadBestScore() {
    const saved = localStorage.getItem('2048-best-score');
    if (saved) {
        gameState.bestScore = parseInt(saved, 10);
        bestScoreElement.textContent = gameState.bestScore;
    }
}

// ランキング登録
async function registerRanking() {
    const nameInput = document.getElementById('ranking-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('名前を入力してください');
        return;
    }

    const now = new Date();
    const dateString = formatDate(now);

    try {
        await db.collection('2048-ranking').add({
            name: name,
            score: gameState.score,
            maxTile: gameState.maxTile,
            time: gameState.elapsedTime,
            timeDisplay: formatTime(gameState.elapsedTime),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            dateDisplay: dateString
        });

        alert('ランキングに登録しました！');
        document.getElementById('ranking-input-section').classList.add('hidden');
    } catch (error) {
        console.error('ランキング登録エラー:', error);
        alert('登録に失敗しました。もう一度お試しください。');
    }
}

// 日付フォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// ランキング表示
async function showRanking() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<div class="loading">読み込み中...</div>';
    rankingModal.classList.remove('hidden');

    try {
        const snapshot = await db.collection('2048-ranking')
            .orderBy('score', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            rankingList.innerHTML = '<div class="no-ranking">まだランキングデータがありません</div>';
            return;
        }

        let html = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            let rankClass = '';
            let rankEmoji = rank;
            
            if (rank === 1) {
                rankClass = 'gold';
                rankEmoji = '🥇';
            } else if (rank === 2) {
                rankClass = 'silver';
                rankEmoji = '🥈';
            } else if (rank === 3) {
                rankClass = 'bronze';
                rankEmoji = '🥉';
            }

            // 日付表示
            let dateDisplay = data.dateDisplay || '';
            if (!dateDisplay && data.timestamp) {
                dateDisplay = formatDate(data.timestamp.toDate());
            }

            html += `
                <div class="ranking-item ${rankClass}">
                    <span class="ranking-rank ${rankClass}">${rankEmoji}</span>
                    <span class="ranking-name">${escapeHtml(data.name)}</span>
                    <div class="ranking-details">
                        <span class="ranking-score">${data.score.toLocaleString()}</span>
                        <span class="ranking-max-tile">最大: ${data.maxTile}</span>
                        <span class="ranking-date">${dateDisplay}</span>
                    </div>
                </div>
            `;
            rank++;
        });

        rankingList.innerHTML = html;
    } catch (error) {
        console.error('ランキング取得エラー:', error);
        rankingList.innerHTML = '<div class="no-ranking">ランキングの読み込みに失敗しました</div>';
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
