// マインスイーパー ゲームロジック

// 難易度設定
const DIFFICULTY = {
    easy: { rows: 9, cols: 9, mines: 10, name: 'かんたん' },
    normal: { rows: 16, cols: 16, mines: 40, name: 'ふつう' },
    hard: { rows: 16, cols: 30, mines: 99, name: 'むずかしい' },
    extreme: { rows: 20, cols: 30, mines: 150, name: '鬼畜' }
};

// ゲーム状態
let gameState = {
    board: [],
    revealed: [],
    flagged: [],
    rows: 0,
    cols: 0,
    mines: 0,
    minePositions: [],
    difficulty: 'normal',
    gameStarted: false,
    gameOver: false,
    win: false,
    timerInterval: null,
    startTime: null,
    elapsedTime: 0,
    flagCount: 0,
    // オンライン対戦用
    isOnlineGame: false,
    roomId: null,
    playerId: null,
    playerName: '',
    opponentName: '',
    seed: null,
    unsubscribe: null
};

// DOM要素
const boardElement = document.getElementById('board');
const mineCountElement = document.getElementById('mine-count');
const flagCountElement = document.getElementById('flag-count');
const timerElement = document.getElementById('timer');
const difficultyDisplay = document.getElementById('difficulty-display');
const gameStatus = document.getElementById('game-status');
const statusText = document.getElementById('status-text');

// モーダル
const onlineLobbyModal = document.getElementById('online-lobby-modal');
const resultModal = document.getElementById('result-modal');
const rankingModal = document.getElementById('ranking-modal');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // デフォルトで普通難易度で開始
    startSoloGame('normal');
});

// イベントリスナー設定
function setupEventListeners() {
    // モード選択ドロップダウン
    const modeBtn = document.getElementById('mode-btn');
    const modeDropdown = document.getElementById('mode-dropdown-content');
    
    modeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modeDropdown.classList.toggle('show');
    });
    
    // ドロップダウンの外側をクリックしたら閉じる
    document.addEventListener('click', () => {
        modeDropdown.classList.remove('show');
    });
    
    // ドロップダウンアイテムのクリック
    document.querySelectorAll('.dropdown-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = btn.dataset.mode;
            const difficulty = btn.dataset.difficulty;
            
            modeDropdown.classList.remove('show');
            
            if (gameState.isOnlineGame && gameState.unsubscribe) {
                leaveOnlineGame();
            }
            
            if (mode === 'solo') {
                startSoloGame(difficulty);
            }
        });
    });
    
    // オンライン対戦ボタン
    document.getElementById('online-btn').addEventListener('click', () => {
        showOnlineLobby(gameState.difficulty);
    });
    
    // 新しいゲームボタン
    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (gameState.isOnlineGame) {
            if (confirm('現在のゲームを終了しますか？')) {
                leaveOnlineGame();
                startSoloGame(gameState.difficulty);
            }
        } else {
            startSoloGame(gameState.difficulty);
        }
    });
    
    // ランキングボタン
    document.getElementById('ranking-btn').addEventListener('click', showRanking);
    
    // オンラインロビー
    document.getElementById('start-matching-btn').addEventListener('click', startMatching);
    document.getElementById('cancel-lobby-btn').addEventListener('click', () => {
        onlineLobbyModal.classList.add('hidden');
    });
    document.getElementById('cancel-matching-btn').addEventListener('click', cancelMatching);
    
    // 結果モーダル
    document.getElementById('retry-btn').addEventListener('click', retryGame);
    document.getElementById('new-game-result-btn').addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });
    document.getElementById('register-ranking-btn').addEventListener('click', registerRanking);
    
    // ランキングモーダル
    document.getElementById('close-ranking-btn').addEventListener('click', () => {
        rankingModal.classList.add('hidden');
    });
    
    // ランキングタブ
    document.querySelectorAll('.ranking-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadRanking(tab.dataset.difficulty);
        });
    });
    
    // 盤面表示切り替えボタン
    document.getElementById('toggle-board-btn').addEventListener('click', toggleBoardVisibility);
    
    // 右クリックメニュー無効化
    boardElement.addEventListener('contextmenu', e => e.preventDefault());
}

// モード選択モーダル表示（ドロップダウンで代替）
function showModeModal() {
    // モーダルは削除されたので、代わりにリセットのみ行う
    resetGame();
}

// ソロゲーム開始
function startSoloGame(difficulty) {
    gameState.isOnlineGame = false;
    gameState.difficulty = difficulty;
    initGame(difficulty);
}

// ゲーム初期化
function initGame(difficulty, seed = null) {
    const config = DIFFICULTY[difficulty];
    
    gameState.rows = config.rows;
    gameState.cols = config.cols;
    gameState.mines = config.mines;
    gameState.difficulty = difficulty;
    gameState.gameStarted = false;
    gameState.gameOver = false;
    gameState.win = false;
    gameState.flagCount = 0;
    gameState.elapsedTime = 0;
    gameState.seed = seed;
    gameState.minePositions = [];
    
    // ボード初期化
    gameState.board = Array(config.rows).fill(null).map(() => Array(config.cols).fill(0));
    gameState.revealed = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));
    gameState.flagged = Array(config.rows).fill(null).map(() => Array(config.cols).fill(false));
    
    // タイマーリセット
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    
    // UI更新
    updateDisplay();
    renderBoard();
    hideGameStatus();
    
    // オンライン情報表示/非表示
    document.getElementById('online-info').classList.toggle('hidden', !gameState.isOnlineGame);
}

// 盤面レンダリング
function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, 1fr)`;
    
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // イベントリスナー
            cell.addEventListener('click', () => handleLeftClick(row, col));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(row, col);
            });
            cell.addEventListener('mousedown', (e) => {
                if (e.button === 1) { // 中クリック
                    e.preventDefault();
                    handleMiddleClick(row, col);
                }
            });
            // 両クリック対応
            cell.addEventListener('mouseup', (e) => {
                if (e.buttons === 0 && cell.dataset.bothPressed) {
                    handleMiddleClick(row, col);
                    delete cell.dataset.bothPressed;
                }
            });
            cell.addEventListener('mousedown', (e) => {
                if (e.buttons === 3) { // 左右同時押し
                    cell.dataset.bothPressed = true;
                }
            });
            
            updateCellDisplay(cell, row, col);
            boardElement.appendChild(cell);
        }
    }
}

// セル表示更新
function updateCellDisplay(cell, row, col) {
    cell.className = 'cell';
    cell.textContent = '';
    
    if (gameState.revealed[row][col]) {
        cell.classList.add('revealed');
        
        if (gameState.board[row][col] === -1) {
            // 地雷
            cell.classList.add('mine');
            cell.textContent = '💣';
        } else if (gameState.board[row][col] > 0) {
            // 数字
            cell.textContent = gameState.board[row][col];
            cell.classList.add(`num-${gameState.board[row][col]}`);
        }
    } else if (gameState.flagged[row][col]) {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
    }
}

// 左クリック処理
function handleLeftClick(row, col) {
    if (gameState.gameOver) return;
    if (gameState.flagged[row][col]) return;
    if (gameState.revealed[row][col]) return;
    
    // 最初のクリックで地雷配置
    if (!gameState.gameStarted) {
        placeMines(row, col);
        startTimer();
        gameState.gameStarted = true;
    }
    
    revealCell(row, col);
    checkWin();
}

// 右クリック処理（フラグ）
function handleRightClick(row, col) {
    if (gameState.gameOver) return;
    if (gameState.revealed[row][col]) return;
    
    gameState.flagged[row][col] = !gameState.flagged[row][col];
    gameState.flagCount += gameState.flagged[row][col] ? 1 : -1;
    
    const cell = getCellElement(row, col);
    updateCellDisplay(cell, row, col);
    updateDisplay();
}

// 中クリック処理（周囲一括オープン）
function handleMiddleClick(row, col) {
    if (gameState.gameOver) return;
    if (!gameState.revealed[row][col]) return;
    if (gameState.board[row][col] <= 0) return;
    
    // 周囲のフラグ数をカウント
    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr;
            const nc = col + dc;
            if (isValidCell(nr, nc) && gameState.flagged[nr][nc]) {
                flagCount++;
            }
        }
    }
    
    // フラグ数が数字と一致したら周囲を開く
    if (flagCount === gameState.board[row][col]) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = row + dr;
                const nc = col + dc;
                if (isValidCell(nr, nc) && !gameState.flagged[nr][nc] && !gameState.revealed[nr][nc]) {
                    revealCell(nr, nc);
                }
            }
        }
        checkWin();
    }
}

// 地雷配置
function placeMines(firstRow, firstCol) {
    const positions = [];
    
    // 最初のクリック位置と周囲を除外
    const excluded = new Set();
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            excluded.add(`${firstRow + dr},${firstCol + dc}`);
        }
    }
    
    // 配置可能な位置をリストアップ
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (!excluded.has(`${r},${c}`)) {
                positions.push({ row: r, col: c });
            }
        }
    }
    
    // シード付きシャッフル（オンライン対戦用）
    if (gameState.seed !== null) {
        shuffleWithSeed(positions, gameState.seed);
    } else {
        shuffleArray(positions);
    }
    
    // 地雷配置
    gameState.minePositions = positions.slice(0, gameState.mines);
    
    for (const pos of gameState.minePositions) {
        gameState.board[pos.row][pos.col] = -1;
    }
    
    // 数字計算
    calculateNumbers();
}

// 数字計算
function calculateNumbers() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.board[row][col] === -1) continue;
            
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (isValidCell(nr, nc) && gameState.board[nr][nc] === -1) {
                        count++;
                    }
                }
            }
            gameState.board[row][col] = count;
        }
    }
}

// セルを開く
function revealCell(row, col) {
    if (!isValidCell(row, col)) return;
    if (gameState.revealed[row][col]) return;
    if (gameState.flagged[row][col]) return;
    
    gameState.revealed[row][col] = true;
    const cell = getCellElement(row, col);
    updateCellDisplay(cell, row, col);
    
    // 地雷を踏んだ
    if (gameState.board[row][col] === -1) {
        cell.classList.add('mine-clicked');
        gameOver(false);
        return;
    }
    
    // 空白セルなら周囲も開く
    if (gameState.board[row][col] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                revealCell(row + dr, col + dc);
            }
        }
    }
}

// 勝利判定
function checkWin() {
    if (gameState.gameOver) return;
    
    let revealedCount = 0;
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.revealed[row][col]) {
                revealedCount++;
            }
        }
    }
    
    const totalCells = gameState.rows * gameState.cols;
    if (revealedCount === totalCells - gameState.mines) {
        gameOver(true);
    }
}

// ゲームオーバー
function gameOver(win) {
    gameState.gameOver = true;
    gameState.win = win;
    
    // タイマー停止
    clearInterval(gameState.timerInterval);
    
    if (win) {
        // 勝利
        showGameStatus('🎉 クリア！', 'win');
        
        // オンライン対戦の場合
        if (gameState.isOnlineGame) {
            updateOnlineStatus('finished', gameState.elapsedTime);
        } else {
            // ソロの場合は結果モーダル表示
            showResultModal(true);
        }
    } else {
        // 敗北
        showGameStatus('💥 ゲームオーバー', 'lose');
        revealAllMines();
        
        if (gameState.isOnlineGame) {
            updateOnlineStatus('failed', gameState.elapsedTime);
        } else {
            showResultModal(false);
        }
    }
}

// 全地雷を表示
function revealAllMines() {
    for (const pos of gameState.minePositions) {
        gameState.revealed[pos.row][pos.col] = true;
        const cell = getCellElement(pos.row, pos.col);
        updateCellDisplay(cell, pos.row, pos.col);
    }
    
    // 間違ったフラグを表示
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (gameState.flagged[row][col] && gameState.board[row][col] !== -1) {
                const cell = getCellElement(row, col);
                cell.classList.add('wrong-flag');
                cell.textContent = '❌';
            }
        }
    }
}

// タイマー開始
function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(() => {
        gameState.elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        updateTimerDisplay();
        
        // オンライン対戦時は定期的に更新
        if (gameState.isOnlineGame && gameState.elapsedTime % 2 === 0) {
            updateOnlineTime();
        }
    }, 1000);
}

// タイマー表示更新
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 表示更新
function updateDisplay() {
    mineCountElement.textContent = gameState.mines;
    flagCountElement.textContent = gameState.flagCount;
    difficultyDisplay.textContent = DIFFICULTY[gameState.difficulty].name;
}

// ステータス表示
function showGameStatus(message, type) {
    gameStatus.classList.remove('hidden', 'win', 'lose');
    gameStatus.classList.add(type);
    statusText.textContent = message;
}

function hideGameStatus() {
    gameStatus.classList.add('hidden');
}

// 結果モーダル表示
function showResultModal(win) {
    const resultTitle = document.getElementById('result-title');
    const resultTime = document.getElementById('result-time');
    const resultRank = document.getElementById('result-rank');
    const nameInputSection = document.getElementById('name-input-section');
    const resultStats = document.getElementById('result-stats');
    const resultStatMessage = document.getElementById('result-stat-message');
    const toggleBtn = document.getElementById('toggle-board-btn');
    
    // ボタンをリセット（前回の状態をクリア）
    toggleBtn.classList.remove('hidden');
    
    if (win) {
        resultTitle.textContent = '🎉 ゲームクリア！';
        resultTitle.className = 'win';
        const minutes = Math.floor(gameState.elapsedTime / 60);
        const seconds = gameState.elapsedTime % 60;
        resultTime.textContent = `クリアタイム: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 統計情報を非表示
        resultStats.classList.add('hidden');
        
        // ランキング登録セクション表示
        nameInputSection.classList.remove('hidden');
        resultRank.classList.add('hidden');
    } else {
        resultTitle.textContent = '💥 ゲームオーバー';
        resultTitle.className = 'lose';
        resultTime.textContent = '';
        
        // ゲームオーバー時の統計情報を表示
        resultStats.classList.remove('hidden');
        const flagged = gameState.flagged.flat().filter(f => f).length;
        const revealed = gameState.revealed.flat().filter(r => r).length;
        const totalCells = gameState.rows * gameState.cols;
        
        resultStatMessage.innerHTML = `
            <strong>🎮 ゲーム統計</strong><br>
            難易度: ${DIFFICULTY[gameState.difficulty].name}<br>
            地雷: ${gameState.mines} 個 | フラグ: ${flagged} 個<br>
            開封済み: ${revealed}/${totalCells} マス
        `;
        
        nameInputSection.classList.add('hidden');
        resultRank.classList.add('hidden');
    }
    
    resultModal.classList.remove('hidden');
}

// 盤面表示切り替え
function toggleBoardVisibility() {
    const boardWrapper = document.querySelector('.board-wrapper');
    const onlineInfo = document.getElementById('online-info');
    const toggleBtn = document.getElementById('toggle-board-btn');
    const resultModal = document.getElementById('result-modal');
    
    // 盤面を表示してモーダルを隠す
    boardWrapper.classList.remove('result-hidden');
    if (onlineInfo) {
        onlineInfo.classList.remove('result-hidden');
    }
    
    // ボタン自体を隠す
    toggleBtn.classList.add('hidden');
    resultModal.classList.add('hidden');
}

// リトライ
function retryGame() {
    resultModal.classList.add('hidden');
    initGame(gameState.difficulty, gameState.isOnlineGame ? gameState.seed : null);
}

// ゲームリセット
function resetGame() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    
    if (gameState.unsubscribe) {
        gameState.unsubscribe();
        gameState.unsubscribe = null;
    }
    
    hideGameStatus();
    document.getElementById('online-info').classList.add('hidden');
}

// ============================================
// ランキング機能
// ============================================

// ランキング表示
async function showRanking() {
    rankingModal.classList.remove('hidden');
    const activeTab = document.querySelector('.ranking-tab.active');
    loadRanking(activeTab.dataset.difficulty);
}

// ランキング読み込み
async function loadRanking(difficulty) {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        // インデックスなしで動作するよう、orderByを削除してクライアント側でソート
        const snapshot = await db.collection('minesweeper_rankings')
            .where('difficulty', '==', difficulty)
            .limit(100)  // より多く取得
            .get();
        
        if (snapshot.empty) {
            rankingList.innerHTML = '<div class="no-data">まだ記録がありません</div>';
            return;
        }
        
        // クライアント側でソート
        const rankings = [];
        snapshot.forEach(doc => {
            rankings.push({
                name: doc.data().name,
                time: doc.data().time
            });
        });
        
        // timeでソート（昇順）
        rankings.sort((a, b) => a.time - b.time);
        
        // 上位20件を表示
        rankingList.innerHTML = '';
        let rank = 1;
        
        for (let i = 0; i < Math.min(rankings.length, 20); i++) {
            const data = rankings[i];
            const item = document.createElement('div');
            item.className = 'ranking-item' + (rank <= 3 ? ' top-3' : '');
            
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const minutes = Math.floor(data.time / 60);
            const seconds = data.time % 60;
            
            item.innerHTML = `
                <span class="rank-number ${rankClass}">${rank}</span>
                <span class="rank-name">${escapeHtml(data.name)}</span>
                <span class="rank-time">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>
            `;
            
            rankingList.appendChild(item);
            rank++;
        }
    } catch (error) {
        console.error('ランキング読み込みエラー:', error);
        console.error('エラーコード:', error.code);
        console.error('エラーメッセージ:', error.message);
        rankingList.innerHTML = '<div class="no-data">読み込みに失敗しました</div>';
    }
}

// ランキング登録
async function registerRanking() {
    // クリア時のみ登録可能
    if (!gameState.win) {
        alert('ゲームをクリアしてからランキングに登録できます');
        return;
    }
    
    const nameInput = document.getElementById('ranking-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('名前を入力してください');
        return;
    }
    
    try {
        const docRef = await db.collection('minesweeper_rankings').add({
            name: name,
            time: gameState.elapsedTime,
            difficulty: gameState.difficulty,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('ランキング登録成功:', docRef.id);
        
        document.getElementById('name-input-section').classList.add('hidden');
        document.getElementById('result-rank').classList.remove('hidden');
        document.getElementById('result-rank').textContent = '登録完了！';
        
        // ローカルストレージに名前を保存
        localStorage.setItem('minesweeper_playerName', name);
        
        // ランキング再読み込み
        setTimeout(() => {
            loadRanking(gameState.difficulty);
        }, 1000);
    } catch (error) {
        console.error('ランキング登録エラー:', error);
        console.error('エラーコード:', error.code);
        console.error('エラーメッセージ:', error.message);
        alert('登録に失敗しました: ' + error.message);
    }
}

// ============================================
// オンライン対戦機能
// ============================================

let onlineDifficulty = 'normal';

// オンラインロビー表示
function showOnlineLobby(difficulty) {
    onlineDifficulty = difficulty;
    onlineLobbyModal.classList.remove('hidden');
    
    // ロビー画面表示
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('matching-screen').classList.add('hidden');
    
    // 保存された名前を復元
    const savedName = localStorage.getItem('minesweeper_playerName');
    if (savedName) {
        document.getElementById('player-name').value = savedName;
    }
}

// マッチング開始
async function startMatching() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('名前を入力してください');
        return;
    }
    
    gameState.playerName = name;
    localStorage.setItem('minesweeper_playerName', name);
    
    // マッチング画面に切り替え
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('matching-screen').classList.remove('hidden');
    
    try {
        // 待機中のルームを検索
        const waitingRooms = await db.collection('minesweeper_rooms')
            .where('difficulty', '==', onlineDifficulty)
            .where('status', '==', 'waiting')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();
        
        if (!waitingRooms.empty) {
            // 既存のルームに参加
            const roomDoc = waitingRooms.docs[0];
            await joinRoom(roomDoc.id, roomDoc.data());
        } else {
            // 新しいルームを作成
            await createRoom();
        }
    } catch (error) {
        console.error('マッチングエラー:', error);
        alert('マッチングに失敗しました');
        cancelMatching();
    }
}

// ルーム作成
async function createRoom() {
    const seed = Date.now();
    
    const roomRef = await db.collection('minesweeper_rooms').add({
        difficulty: onlineDifficulty,
        seed: seed,
        status: 'waiting',
        player1: {
            name: gameState.playerName,
            status: 'playing',
            time: 0
        },
        player2: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    gameState.roomId = roomRef.id;
    gameState.playerId = 'player1';
    gameState.seed = seed;
    
    // ルーム監視開始
    listenToRoom();
}

// ルーム参加
async function joinRoom(roomId, roomData) {
    gameState.roomId = roomId;
    gameState.playerId = 'player2';
    gameState.seed = roomData.seed;
    gameState.opponentName = roomData.player1.name;
    
    await db.collection('minesweeper_rooms').doc(roomId).update({
        status: 'playing',
        player2: {
            name: gameState.playerName,
            status: 'playing',
            time: 0
        }
    });
    
    // ゲーム開始
    startOnlineGame();
}

// ルーム監視
function listenToRoom() {
    gameState.unsubscribe = db.collection('minesweeper_rooms').doc(gameState.roomId)
        .onSnapshot(snapshot => {
            const data = snapshot.data();
            
            if (!data) {
                // ルームが削除された
                cancelMatching();
                return;
            }
            
            if (data.status === 'playing' && gameState.playerId === 'player1') {
                // 対戦相手が参加した
                gameState.opponentName = data.player2.name;
                startOnlineGame();
            }
            
            // 対戦中の状態更新
            if (gameState.isOnlineGame) {
                updateOnlineDisplay(data);
            }
        });
}

// オンラインゲーム開始
function startOnlineGame() {
    onlineLobbyModal.classList.add('hidden');
    gameState.isOnlineGame = true;
    
    // オンライン情報表示
    document.getElementById('self-name').textContent = gameState.playerName;
    document.getElementById('opponent-name').textContent = gameState.opponentName;
    
    // ゲーム初期化（同じシードで）
    initGame(onlineDifficulty, gameState.seed);
    
    // ルーム監視（player2の場合）
    if (gameState.playerId === 'player2' && !gameState.unsubscribe) {
        listenToRoom();
    }
}

// オンライン状態更新
async function updateOnlineStatus(status, time) {
    if (!gameState.roomId) return;
    
    const updateData = {};
    updateData[`${gameState.playerId}.status`] = status;
    updateData[`${gameState.playerId}.time`] = time;
    
    await db.collection('minesweeper_rooms').doc(gameState.roomId).update(updateData);
}

// オンラインタイム更新
async function updateOnlineTime() {
    if (!gameState.roomId || gameState.gameOver) return;
    
    const updateData = {};
    updateData[`${gameState.playerId}.time`] = gameState.elapsedTime;
    
    try {
        await db.collection('minesweeper_rooms').doc(gameState.roomId).update(updateData);
    } catch (error) {
        console.error('タイム更新エラー:', error);
    }
}

// オンライン表示更新
function updateOnlineDisplay(data) {
    const selfData = data[gameState.playerId];
    const opponentKey = gameState.playerId === 'player1' ? 'player2' : 'player1';
    const opponentData = data[opponentKey];
    
    // 自分の状態
    if (selfData) {
        document.getElementById('self-time').textContent = formatTime(selfData.time);
        document.getElementById('self-status').textContent = getStatusText(selfData.status);
        document.getElementById('self-status').className = 'player-status ' + selfData.status;
    }
    
    // 相手の状態
    if (opponentData) {
        document.getElementById('opponent-time').textContent = formatTime(opponentData.time);
        document.getElementById('opponent-status').textContent = getStatusText(opponentData.status);
        document.getElementById('opponent-status').className = 'player-status ' + opponentData.status;
        
        // 両者が終了したら結果表示
        if (selfData && selfData.status !== 'playing' && opponentData.status !== 'playing') {
            showOnlineResult(selfData, opponentData);
        }
    }
}

// オンライン結果表示
function showOnlineResult(selfData, opponentData) {
    const resultTitle = document.getElementById('result-title');
    const resultTime = document.getElementById('result-time');
    
    let resultText = '';
    let isWin = false;
    
    if (selfData.status === 'finished' && opponentData.status === 'finished') {
        // 両者クリア - タイム比較
        if (selfData.time < opponentData.time) {
            resultText = '🎉 勝利！';
            isWin = true;
        } else if (selfData.time > opponentData.time) {
            resultText = '😢 敗北...';
        } else {
            resultText = '🤝 引き分け';
        }
    } else if (selfData.status === 'finished') {
        resultText = '🎉 勝利！';
        isWin = true;
    } else if (opponentData.status === 'finished') {
        resultText = '😢 敗北...';
    } else {
        resultText = '💥 両者失敗';
    }
    
    resultTitle.textContent = resultText;
    resultTitle.className = isWin ? 'win' : 'lose';
    resultTime.textContent = `あなた: ${formatTime(selfData.time)} / ${gameState.opponentName}: ${formatTime(opponentData.time)}`;
    
    // オンラインではランキング登録なし
    document.getElementById('name-input-section').classList.add('hidden');
    document.getElementById('result-rank').classList.add('hidden');
    
    resultModal.classList.remove('hidden');
    
    // ルーム監視解除
    if (gameState.unsubscribe) {
        gameState.unsubscribe();
        gameState.unsubscribe = null;
    }
}

// マッチングキャンセル
async function cancelMatching() {
    if (gameState.unsubscribe) {
        gameState.unsubscribe();
        gameState.unsubscribe = null;
    }
    
    if (gameState.roomId && gameState.playerId === 'player1') {
        // 自分が作成したルームを削除
        try {
            await db.collection('minesweeper_rooms').doc(gameState.roomId).delete();
        } catch (error) {
            console.error('ルーム削除エラー:', error);
        }
    }
    
    gameState.roomId = null;
    gameState.playerId = null;
    gameState.isOnlineGame = false;
    
    onlineLobbyModal.classList.add('hidden');
    // ソロゲームに戻る
    startSoloGame(gameState.difficulty);
}

// ============================================
// ユーティリティ関数
// ============================================

function isValidCell(row, col) {
    return row >= 0 && row < gameState.rows && col >= 0 && col < gameState.cols;
}

function getCellElement(row, col) {
    return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// シード付きシャッフル
function shuffleWithSeed(array, seed) {
    const random = seededRandom(seed);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// シード付き乱数生成器
function seededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getStatusText(status) {
    switch (status) {
        case 'playing': return 'プレイ中';
        case 'finished': return 'クリア！';
        case 'failed': return '失敗...';
        default: return status;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
