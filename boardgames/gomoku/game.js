// 五目並べ ゲームロジック

// 定数
const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

// 星の位置（天元と四隅の星）
const STAR_POINTS = [
    [3, 3], [3, 7], [3, 11],
    [7, 3], [7, 7], [7, 11],
    [11, 3], [11, 7], [11, 11]
];

// ゲーム状態
let gameState = {
    board: [],
    currentPlayer: BLACK,
    gameMode: 'cpu', // 'cpu', 'local', 'online'
    difficulty: 'normal', // 'easy', 'normal', 'hard'
    gameOver: false,
    winner: null,
    lastMove: null,
    winningLine: [],
    moveHistory: [],
    isPlayerTurn: true,
    // オンライン用
    isOnlineGame: false,
    roomId: null,
    playerRole: null, // 'black' or 'white'
    playerName: '',
    opponentName: '',
    unsubscribe: null
};

// DOM要素
const boardElement = document.getElementById('board');
const currentTurnElement = document.getElementById('current-turn');
const gameModeElement = document.getElementById('game-mode');
const playerBlackElement = document.getElementById('player-black');
const playerWhiteElement = document.getElementById('player-white');

// モーダル
const modeModal = document.getElementById('mode-modal');
const onlineLobbyModal = document.getElementById('online-lobby-modal');
const resultModal = document.getElementById('result-modal');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // デフォルトでCPU（普通）モードで開始
    startCpuGame('normal');
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
                leaveGame();
            }
            
            if (mode === 'cpu') {
                startCpuGame(difficulty);
            } else if (mode === 'local') {
                startLocalGame();
            }
        });
    });
    
    // オンライン対戦ボタン
    document.getElementById('online-btn').addEventListener('click', showOnlineLobby);
    
    // 新しいゲームボタン
    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (gameState.isOnlineGame) {
            if (confirm('現在のゲームを終了しますか？')) {
                leaveGame();
                resetGame();
                startCpuGame(gameState.difficulty);
            }
        } else {
            resetGame();
            if (gameState.gameMode === 'cpu') {
                startCpuGame(gameState.difficulty);
            } else {
                startLocalGame();
            }
        }
    });
    
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
}

// CPU対戦開始
function startCpuGame(difficulty) {
    gameState.gameMode = 'cpu';
    gameState.difficulty = difficulty;
    gameState.isOnlineGame = false;
    
    const difficultyNames = { easy: 'よわい', normal: 'ふつう', hard: 'つよい' };
    gameModeElement.textContent = `CPU対戦（${difficultyNames[difficulty]}）`;
    
    document.getElementById('black-name').textContent = 'あなた';
    document.getElementById('white-name').textContent = 'CPU';
    
    initGame();
}

// ローカル対戦開始
function startLocalGame() {
    gameState.gameMode = 'local';
    gameState.isOnlineGame = false;
    
    gameModeElement.textContent = 'ローカル対戦';
    
    document.getElementById('black-name').textContent = '黒';
    document.getElementById('white-name').textContent = '白';
    
    initGame();
}

// ゲーム初期化
function initGame() {
    // 盤面初期化
    gameState.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
    gameState.currentPlayer = BLACK;
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.lastMove = null;
    gameState.winningLine = [];
    gameState.moveHistory = [];
    gameState.isPlayerTurn = true;
    
    renderBoard();
    updateDisplay();
}

// 盤面描画
function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 端の処理
            if (row === 0) cell.classList.add('top');
            if (row === BOARD_SIZE - 1) cell.classList.add('bottom');
            if (col === 0) cell.classList.add('left');
            if (col === BOARD_SIZE - 1) cell.classList.add('right');
            
            // 星の位置
            if (STAR_POINTS.some(p => p[0] === row && p[1] === col)) {
                cell.classList.add('star');
                const starPoint = document.createElement('div');
                starPoint.className = 'star-point';
                cell.appendChild(starPoint);
            }
            
            // ホバー用の石
            const hoverStone = document.createElement('div');
            hoverStone.className = `hover-stone ${gameState.currentPlayer === BLACK ? 'black' : 'white'}`;
            cell.appendChild(hoverStone);
            
            // クリックイベント
            cell.addEventListener('click', () => handleCellClick(row, col));
            
            boardElement.appendChild(cell);
        }
    }
    
    updateBoardDisplay();
}

// 盤面表示更新
function updateBoardDisplay() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = getCellElement(row, col);
            
            // 既存の石を削除
            const existingStone = cell.querySelector('.stone');
            if (existingStone) existingStone.remove();
            
            // 石を配置
            if (gameState.board[row][col] !== EMPTY) {
                cell.classList.add('occupied');
                const stone = document.createElement('div');
                stone.className = `stone ${gameState.board[row][col] === BLACK ? 'black' : 'white'}`;
                
                // 最後の手のマーカー
                if (gameState.lastMove && gameState.lastMove.row === row && gameState.lastMove.col === col) {
                    stone.classList.add('last-move');
                }
                
                // 勝利ライン
                if (gameState.winningLine.some(p => p.row === row && p.col === col)) {
                    stone.classList.add('winning');
                }
                
                cell.appendChild(stone);
            } else {
                cell.classList.remove('occupied');
            }
            
            // ホバー石の色を更新
            const hoverStone = cell.querySelector('.hover-stone');
            if (hoverStone) {
                hoverStone.className = `hover-stone ${gameState.currentPlayer === BLACK ? 'black' : 'white'}`;
            }
        }
    }
}

// セルクリック処理
function handleCellClick(row, col) {
    if (gameState.gameOver) return;
    if (gameState.board[row][col] !== EMPTY) return;
    
    // オンラインの場合は自分の手番かチェック
    if (gameState.isOnlineGame) {
        const isMyTurn = (gameState.playerRole === 'black' && gameState.currentPlayer === BLACK) ||
                         (gameState.playerRole === 'white' && gameState.currentPlayer === WHITE);
        if (!isMyTurn) return;
    }
    
    // CPU対戦で自分の手番でない場合
    if (gameState.gameMode === 'cpu' && !gameState.isPlayerTurn) return;
    
    // 石を置く
    placeStone(row, col);
}

// 石を置く
function placeStone(row, col) {
    gameState.board[row][col] = gameState.currentPlayer;
    gameState.lastMove = { row, col };
    gameState.moveHistory.push({ row, col, player: gameState.currentPlayer });
    
    updateBoardDisplay();
    
    // 勝利判定
    const winResult = checkWin(row, col);
    if (winResult) {
        gameState.gameOver = true;
        gameState.winner = gameState.currentPlayer;
        gameState.winningLine = winResult;
        updateBoardDisplay();
        
        // オンラインの場合は更新
        if (gameState.isOnlineGame) {
            updateOnlineGame();
        }
        
        setTimeout(() => showResult(), 500);
        return;
    }
    
    // 引き分け判定
    if (isBoardFull()) {
        gameState.gameOver = true;
        gameState.winner = null;
        
        if (gameState.isOnlineGame) {
            updateOnlineGame();
        }
        
        setTimeout(() => showResult(), 500);
        return;
    }
    
    // 手番交代
    switchPlayer();
    
    // オンラインの場合は更新
    if (gameState.isOnlineGame) {
        updateOnlineGame();
    }
    
    // CPUの手番
    if (gameState.gameMode === 'cpu' && gameState.currentPlayer === WHITE && !gameState.gameOver) {
        gameState.isPlayerTurn = false;
        setTimeout(() => cpuMove(), 500);
    }
}

// 手番交代
function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === BLACK ? WHITE : BLACK;
    updateDisplay();
}

// 表示更新
function updateDisplay() {
    const turnText = gameState.currentPlayer === BLACK ? '黒の番' : '白の番';
    currentTurnElement.textContent = turnText;
    
    playerBlackElement.classList.toggle('active', gameState.currentPlayer === BLACK);
    playerWhiteElement.classList.toggle('active', gameState.currentPlayer === WHITE);
}

// 勝利判定
function checkWin(row, col) {
    const directions = [
        [0, 1],  // 横
        [1, 0],  // 縦
        [1, 1],  // 斜め右下
        [1, -1]  // 斜め左下
    ];
    
    const player = gameState.board[row][col];
    
    for (const [dr, dc] of directions) {
        const line = [{ row, col }];
        
        // 正方向
        let r = row + dr;
        let c = col + dc;
        while (isValidPosition(r, c) && gameState.board[r][c] === player) {
            line.push({ row: r, col: c });
            r += dr;
            c += dc;
        }
        
        // 逆方向
        r = row - dr;
        c = col - dc;
        while (isValidPosition(r, c) && gameState.board[r][c] === player) {
            line.push({ row: r, col: c });
            r -= dr;
            c -= dc;
        }
        
        if (line.length >= 5) {
            return line;
        }
    }
    
    return null;
}

// 盤面が埋まったか
function isBoardFull() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] === EMPTY) return false;
        }
    }
    return true;
}

// 有効な位置か
function isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// セル要素取得
function getCellElement(row, col) {
    return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// ============================================
// CPU AI
// ============================================

function cpuMove() {
    let move;
    
    switch (gameState.difficulty) {
        case 'easy':
            move = getEasyMove();
            break;
        case 'normal':
            move = getNormalMove();
            break;
        case 'hard':
            move = getHardMove();
            break;
        default:
            move = getNormalMove();
    }
    
    if (move) {
        placeStone(move.row, move.col);
    }
    
    gameState.isPlayerTurn = true;
}

// 簡単モード: ランダム + 簡単な防御
function getEasyMove() {
    // 相手の4連を防ぐ
    const blockMove = findThreat(BLACK, 4);
    if (blockMove && Math.random() < 0.7) return blockMove;
    
    // ランダムに置く（中央付近を優先）
    const emptyPositions = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] === EMPTY) {
                const distFromCenter = Math.abs(row - 7) + Math.abs(col - 7);
                emptyPositions.push({ row, col, priority: 14 - distFromCenter });
            }
        }
    }
    
    // 優先度でソートしてランダム性を加える
    emptyPositions.sort((a, b) => b.priority - a.priority + (Math.random() - 0.5) * 10);
    
    return emptyPositions[0];
}

// 普通モード: 攻守バランス
function getNormalMove() {
    // 自分が勝てる手
    const winMove = findThreat(WHITE, 4);
    if (winMove) return winMove;
    
    // 相手の4連を防ぐ
    const blockFour = findThreat(BLACK, 4);
    if (blockFour) return blockFour;
    
    // 自分の3連を伸ばす
    const extendThree = findThreat(WHITE, 3);
    if (extendThree && Math.random() < 0.8) return extendThree;
    
    // 相手の3連を防ぐ
    const blockThree = findThreat(BLACK, 3);
    if (blockThree && Math.random() < 0.7) return blockThree;
    
    // 評価関数で最良手を探す
    return getBestMoveByEval(2);
}

// 難しいモード: 高度な評価
function getHardMove() {
    // 自分が勝てる手
    const winMove = findThreat(WHITE, 4);
    if (winMove) return winMove;
    
    // 相手の4連を防ぐ
    const blockFour = findThreat(BLACK, 4);
    if (blockFour) return blockFour;
    
    // 両端が開いている3連（活三）を作る/防ぐ
    const openThreeMove = findOpenThree(WHITE);
    if (openThreeMove) return openThreeMove;
    
    const blockOpenThree = findOpenThree(BLACK);
    if (blockOpenThree) return blockOpenThree;
    
    // 相手の3連を防ぐ
    const blockThree = findThreat(BLACK, 3);
    if (blockThree) return blockThree;
    
    // 評価関数で最良手を探す
    return getBestMoveByEval(3);
}

// 脅威を見つける
function findThreat(player, count) {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] !== EMPTY) continue;
            
            // この位置に置いた場合をシミュレート
            gameState.board[row][col] = player;
            
            if (count === 4) {
                // 5連になるか
                const win = checkWin(row, col);
                gameState.board[row][col] = EMPTY;
                if (win) return { row, col };
            } else {
                // count連以上になるか
                const lineCount = getMaxLineLength(row, col, player);
                gameState.board[row][col] = EMPTY;
                if (lineCount >= count) return { row, col };
            }
        }
    }
    return null;
}

// 活三（両端が開いている3連）を見つける
function findOpenThree(player) {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] !== EMPTY) continue;
            
            gameState.board[row][col] = player;
            const hasOpenThree = checkOpenThree(row, col, player);
            gameState.board[row][col] = EMPTY;
            
            if (hasOpenThree) return { row, col };
        }
    }
    return null;
}

// 活三チェック
function checkOpenThree(row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dr, dc] of directions) {
        let count = 1;
        let openEnds = 0;
        
        // 正方向
        let r = row + dr;
        let c = col + dc;
        while (isValidPosition(r, c) && gameState.board[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }
        if (isValidPosition(r, c) && gameState.board[r][c] === EMPTY) {
            openEnds++;
        }
        
        // 逆方向
        r = row - dr;
        c = col - dc;
        while (isValidPosition(r, c) && gameState.board[r][c] === player) {
            count++;
            r -= dr;
            c -= dc;
        }
        if (isValidPosition(r, c) && gameState.board[r][c] === EMPTY) {
            openEnds++;
        }
        
        if (count >= 3 && openEnds === 2) {
            return true;
        }
    }
    
    return false;
}

// 最大ライン長を取得
function getMaxLineLength(row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let maxLength = 0;
    
    for (const [dr, dc] of directions) {
        let count = 1;
        
        let r = row + dr;
        let c = col + dc;
        while (isValidPosition(r, c) && gameState.board[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }
        
        r = row - dr;
        c = col - dc;
        while (isValidPosition(r, c) && gameState.board[r][c] === player) {
            count++;
            r -= dr;
            c -= dc;
        }
        
        maxLength = Math.max(maxLength, count);
    }
    
    return maxLength;
}

// 評価関数による最良手
function getBestMoveByEval(depth) {
    let bestScore = -Infinity;
    let bestMoves = [];
    
    // 候補手を絞る（既存の石の周囲のみ）
    const candidates = getCandidateMoves();
    
    for (const { row, col } of candidates) {
        gameState.board[row][col] = WHITE;
        const score = evaluatePosition(row, col, WHITE) - evaluatePosition(row, col, BLACK) * 0.9;
        gameState.board[row][col] = EMPTY;
        
        if (score > bestScore) {
            bestScore = score;
            bestMoves = [{ row, col }];
        } else if (score === bestScore) {
            bestMoves.push({ row, col });
        }
    }
    
    // 同点の場合はランダムに選択
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// 候補手を取得（石の周囲2マス以内）
function getCandidateMoves() {
    const candidates = new Set();
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (gameState.board[row][col] !== EMPTY) {
                // 周囲2マス
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const nr = row + dr;
                        const nc = col + dc;
                        if (isValidPosition(nr, nc) && gameState.board[nr][nc] === EMPTY) {
                            candidates.add(`${nr},${nc}`);
                        }
                    }
                }
            }
        }
    }
    
    // 盤面が空の場合は中央
    if (candidates.size === 0) {
        return [{ row: 7, col: 7 }];
    }
    
    return Array.from(candidates).map(key => {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
    });
}

// 位置評価
function evaluatePosition(row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let score = 0;
    
    for (const [dr, dc] of directions) {
        const lineInfo = analyzeLineInfo(row, col, dr, dc, player);
        score += evaluateLine(lineInfo);
    }
    
    // 中央に近いほど高評価
    const centerDist = Math.abs(row - 7) + Math.abs(col - 7);
    score += (14 - centerDist) * 2;
    
    return score;
}

// ライン分析
function analyzeLineInfo(row, col, dr, dc, player) {
    let count = 1;
    let openEnds = 0;
    let blockedEnds = 0;
    
    // 正方向
    let r = row + dr;
    let c = col + dc;
    while (isValidPosition(r, c) && gameState.board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
    }
    if (!isValidPosition(r, c)) {
        blockedEnds++;
    } else if (gameState.board[r][c] === EMPTY) {
        openEnds++;
    } else {
        blockedEnds++;
    }
    
    // 逆方向
    r = row - dr;
    c = col - dc;
    while (isValidPosition(r, c) && gameState.board[r][c] === player) {
        count++;
        r -= dr;
        c -= dc;
    }
    if (!isValidPosition(r, c)) {
        blockedEnds++;
    } else if (gameState.board[r][c] === EMPTY) {
        openEnds++;
    } else {
        blockedEnds++;
    }
    
    return { count, openEnds, blockedEnds };
}

// ライン評価
function evaluateLine(info) {
    const { count, openEnds, blockedEnds } = info;
    
    if (count >= 5) return 100000; // 勝ち
    if (blockedEnds === 2) return 0; // 両端塞がれている
    
    const scores = {
        4: openEnds === 2 ? 10000 : 1000,
        3: openEnds === 2 ? 500 : 100,
        2: openEnds === 2 ? 50 : 10,
        1: 1
    };
    
    return scores[count] || 0;
}

// ============================================
// オンライン対戦
// ============================================

function showOnlineLobby() {
    modeModal.classList.add('hidden');
    onlineLobbyModal.classList.remove('hidden');
    
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('matching-screen').classList.add('hidden');
    
    // 保存された名前を復元
    const savedName = localStorage.getItem('gomoku_playerName');
    if (savedName) {
        document.getElementById('player-name-input').value = savedName;
    }
}

async function startMatching() {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('名前を入力してください');
        return;
    }
    
    gameState.playerName = name;
    localStorage.setItem('gomoku_playerName', name);
    
    // マッチング画面に切り替え
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('matching-screen').classList.remove('hidden');
    
    try {
        // 待機中のルームを検索
        const waitingRooms = await db.collection('gomokuRooms')
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

async function createRoom() {
    const roomRef = await db.collection('gomokuRooms').add({
        status: 'waiting',
        blackPlayer: {
            name: gameState.playerName
        },
        whitePlayer: null,
        currentTurn: 'black',
        board: JSON.stringify(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))),
        lastMove: null,
        winner: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    gameState.roomId = roomRef.id;
    gameState.playerRole = 'black';
    
    // ルーム監視開始
    listenToRoom();
}

async function joinRoom(roomId, roomData) {
    gameState.roomId = roomId;
    gameState.playerRole = 'white';
    gameState.opponentName = roomData.blackPlayer.name;
    
    await db.collection('gomokuRooms').doc(roomId).update({
        status: 'playing',
        whitePlayer: {
            name: gameState.playerName
        }
    });
    
    // ゲーム開始
    startOnlineGame();
    listenToRoom();
}

function listenToRoom() {
    gameState.unsubscribe = db.collection('gomokuRooms').doc(gameState.roomId)
        .onSnapshot(snapshot => {
            const data = snapshot.data();
            
            if (!data) {
                alert('対戦相手が切断しました');
                cancelMatching();
                return;
            }
            
            // 対戦相手が参加した
            if (data.status === 'playing' && gameState.playerRole === 'black' && !gameState.isOnlineGame) {
                gameState.opponentName = data.whitePlayer.name;
                startOnlineGame();
            }
            
            // ゲーム状態を同期
            if (gameState.isOnlineGame && data.board) {
                syncGameState(data);
            }
        });
}

function startOnlineGame() {
    onlineLobbyModal.classList.add('hidden');
    gameState.gameMode = 'online';
    gameState.isOnlineGame = true;
    
    gameModeElement.textContent = 'オンライン対戦';
    
    if (gameState.playerRole === 'black') {
        document.getElementById('black-name').textContent = gameState.playerName;
        document.getElementById('white-name').textContent = gameState.opponentName;
    } else {
        document.getElementById('black-name').textContent = gameState.opponentName;
        document.getElementById('white-name').textContent = gameState.playerName;
    }
    
    initGame();
}

function syncGameState(data) {
    const newBoard = JSON.parse(data.board);
    
    // 盤面が変わっていたら更新
    if (JSON.stringify(gameState.board) !== data.board) {
        gameState.board = newBoard;
        gameState.lastMove = data.lastMove;
        gameState.currentPlayer = data.currentTurn === 'black' ? BLACK : WHITE;
        
        updateBoardDisplay();
        updateDisplay();
        
        // 勝者が決まった場合
        if (data.winner) {
            gameState.gameOver = true;
            gameState.winner = data.winner === 'black' ? BLACK : (data.winner === 'white' ? WHITE : null);
            
            if (data.winningLine) {
                gameState.winningLine = data.winningLine;
                updateBoardDisplay();
            }
            
            setTimeout(() => showResult(), 500);
        }
    }
}

async function updateOnlineGame() {
    if (!gameState.roomId) return;
    
    const updateData = {
        board: JSON.stringify(gameState.board),
        lastMove: gameState.lastMove,
        currentTurn: gameState.currentPlayer === BLACK ? 'black' : 'white'
    };
    
    if (gameState.gameOver) {
        updateData.winner = gameState.winner === BLACK ? 'black' : (gameState.winner === WHITE ? 'white' : 'draw');
        updateData.winningLine = gameState.winningLine;
        updateData.status = 'finished';
    }
    
    try {
        await db.collection('gomokuRooms').doc(gameState.roomId).update(updateData);
    } catch (error) {
        console.error('オンライン更新エラー:', error);
    }
}

async function cancelMatching() {
    if (gameState.unsubscribe) {
        gameState.unsubscribe();
        gameState.unsubscribe = null;
    }
    
    if (gameState.roomId && gameState.playerRole === 'black') {
        try {
            await db.collection('gomokuRooms').doc(gameState.roomId).delete();
        } catch (error) {
            console.error('ルーム削除エラー:', error);
        }
    }
    
    gameState.roomId = null;
    gameState.playerRole = null;
    gameState.isOnlineGame = false;
    
    onlineLobbyModal.classList.add('hidden');
    showModeModal();
}

// ============================================
// 結果表示
// ============================================

function showResult() {
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    
    if (gameState.winner === null) {
        resultTitle.textContent = '🤝 引き分け';
        resultTitle.className = 'draw';
        resultMessage.textContent = '盤面が埋まりました';
    } else {
        const winnerName = gameState.winner === BLACK ? '黒' : '白';
        
        if (gameState.isOnlineGame) {
            const isWin = (gameState.playerRole === 'black' && gameState.winner === BLACK) ||
                         (gameState.playerRole === 'white' && gameState.winner === WHITE);
            resultTitle.textContent = isWin ? '🎉 勝利！' : '😢 敗北...';
            resultTitle.className = isWin ? 'win' : 'lose';
            resultMessage.textContent = `${winnerName}の勝ちです`;
        } else if (gameState.gameMode === 'cpu') {
            const isWin = gameState.winner === BLACK;
            resultTitle.textContent = isWin ? '🎉 勝利！' : '😢 敗北...';
            resultTitle.className = isWin ? 'win' : 'lose';
            resultMessage.textContent = `${winnerName}の勝ちです`;
        } else {
            resultTitle.textContent = `${winnerName}の勝ち！`;
            resultTitle.className = 'win';
            resultMessage.textContent = '5つ並びました';
        }
    }
    
    resultModal.classList.remove('hidden');
}

function retryGame() {
    resultModal.classList.add('hidden');
    
    if (gameState.isOnlineGame) {
        // オンラインの場合は新しいマッチングへ
        cancelMatching();
    } else {
        initGame();
    }
}

function resetGame() {
    if (gameState.unsubscribe) {
        gameState.unsubscribe();
        gameState.unsubscribe = null;
    }
    
    gameState.roomId = null;
    gameState.playerRole = null;
    gameState.isOnlineGame = false;
}
