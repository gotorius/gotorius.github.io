// 将棋ゲームロジック

// ゲーム状態
let gameState = {
    board: [],
    currentPlayer: 'sente', // 先手 or 後手
    capturedPieces: {
        sente: [], // 先手の持ち駒
        gote: []   // 後手の持ち駒
    },
    selectedCell: null,
    selectedCaptured: null, // 選択中の持ち駒
    moveHistory: [],
    gameMode: null, // 'cpu', 'pvp', 'tsume', 'online'
    difficulty: null, // 'ume', 'take', 'matsu'
    tsumeLevel: null, // 1, 3, 5
    moveCount: 0,
    isGameOver: false,
    lastMove: null,
    isPlayerTurn: true,
    inCheck: false, // 王手状態
    pendingPromotion: null, // 成り待ちの情報
    // オンライン対戦用
    matchId: null,
    playerId: null,
    playerName: '',
    opponentName: '',
    playerRole: null, // 'sente' or 'gote'
    opponentId: null,
    isOnlineGame: false,
    matchingListener: null,
    gameListener: null
};

// 駒の定義
const PIECES = {
    // 先手の駒（正向き）
    'K': { name: '王', moves: [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]], canPromote: false },
    'R': { name: '飛', moves: 'rook', canPromote: true, promoted: '+R' },
    'B': { name: '角', moves: 'bishop', canPromote: true, promoted: '+B' },
    'G': { name: '金', moves: [[0,-1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1]], canPromote: false },
    'S': { name: '銀', moves: [[0,-1],[1,-1],[-1,-1],[1,1],[-1,1]], canPromote: true, promoted: '+S' },
    'N': { name: '桂', moves: [[1,-2],[-1,-2]], canPromote: true, promoted: '+N' },
    'L': { name: '香', moves: 'lance', canPromote: true, promoted: '+L' },
    'P': { name: '歩', moves: [[0,-1]], canPromote: true, promoted: '+P' },
    // 成り駒
    '+R': { name: '龍', moves: 'dragon', canPromote: false },
    '+B': { name: '馬', moves: 'horse', canPromote: false },
    '+S': { name: '全', moves: [[0,-1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1]], canPromote: false },
    '+N': { name: '圭', moves: [[0,-1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1]], canPromote: false },
    '+L': { name: '杏', moves: [[0,-1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1]], canPromote: false },
    '+P': { name: 'と', moves: [[0,-1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1]], canPromote: false }
};

// 駒の表示名（持ち駒用）
const PIECE_DISPLAY = {
    'K': '王', 'R': '飛', 'B': '角', 'G': '金', 'S': '銀', 'N': '桂', 'L': '香', 'P': '歩',
    '+R': '龍', '+B': '馬', '+S': '全', '+N': '圭', '+L': '杏', '+P': 'と'
};

// 成り駒から元の駒への変換
const UNPROMOTED = {
    '+R': 'R', '+B': 'B', '+S': 'S', '+N': 'N', '+L': 'L', '+P': 'P'
};

// 初期配置
function getInitialBoard() {
    const board = Array(9).fill(null).map(() => Array(9).fill(null));
    
    // 後手（上側）
    board[0][0] = { type: 'L', owner: 'gote' };
    board[0][1] = { type: 'N', owner: 'gote' };
    board[0][2] = { type: 'S', owner: 'gote' };
    board[0][3] = { type: 'G', owner: 'gote' };
    board[0][4] = { type: 'K', owner: 'gote' };
    board[0][5] = { type: 'G', owner: 'gote' };
    board[0][6] = { type: 'S', owner: 'gote' };
    board[0][7] = { type: 'N', owner: 'gote' };
    board[0][8] = { type: 'L', owner: 'gote' };
    board[1][1] = { type: 'R', owner: 'gote' };
    board[1][7] = { type: 'B', owner: 'gote' };
    for (let i = 0; i < 9; i++) {
        board[2][i] = { type: 'P', owner: 'gote' };
    }
    
    // 先手（下側）
    board[8][0] = { type: 'L', owner: 'sente' };
    board[8][1] = { type: 'N', owner: 'sente' };
    board[8][2] = { type: 'S', owner: 'sente' };
    board[8][3] = { type: 'G', owner: 'sente' };
    board[8][4] = { type: 'K', owner: 'sente' };
    board[8][5] = { type: 'G', owner: 'sente' };
    board[8][6] = { type: 'S', owner: 'sente' };
    board[8][7] = { type: 'N', owner: 'sente' };
    board[8][8] = { type: 'L', owner: 'sente' };
    board[7][7] = { type: 'R', owner: 'sente' };
    board[7][1] = { type: 'B', owner: 'sente' };
    for (let i = 0; i < 9; i++) {
        board[6][i] = { type: 'P', owner: 'sente' };
    }
    
    return board;
}

// ゲーム初期化
function initGame(mode, option) {
    gameState.board = getInitialBoard();
    gameState.currentPlayer = 'sente';
    gameState.capturedPieces = { sente: [], gote: [] };
    gameState.selectedCell = null;
    gameState.selectedCaptured = null;
    gameState.moveHistory = [];
    gameState.gameMode = mode;
    gameState.moveCount = 0;
    gameState.isGameOver = false;
    gameState.lastMove = null;
    gameState.isPlayerTurn = true;
    gameState.inCheck = false;
    gameState.pendingPromotion = null;
    
    if (mode === 'cpu') {
        gameState.difficulty = option;
    } else if (mode === 'tsume') {
        gameState.tsumeLevel = option;
        loadTsumePuzzle(option);
    }
    
    updateDisplay();
}

// 詰将棋の問題をロード
function loadTsumePuzzle(level) {
    // 詰将棋の問題データ
    const puzzles = {
        1: [ // 一手詰
            {
                board: createEmptyBoard(),
                setup: [
                    { pos: [0, 4], type: 'K', owner: 'gote' },
                    { pos: [1, 4], type: 'G', owner: 'sente' },
                    { pos: [2, 4], type: 'K', owner: 'sente' }
                ],
                captured: { sente: ['G'], gote: [] },
                answer: 'drop-G-0-3' // 金打ち
            },
            {
                board: createEmptyBoard(),
                setup: [
                    { pos: [0, 4], type: 'K', owner: 'gote' },
                    { pos: [1, 3], type: 'G', owner: 'sente' },
                    { pos: [1, 5], type: 'G', owner: 'sente' },
                    { pos: [2, 4], type: 'K', owner: 'sente' }
                ],
                captured: { sente: [], gote: [] },
                answer: '1-3-0-4' // 金上がり
            }
        ],
        3: [ // 三手詰
            {
                board: createEmptyBoard(),
                setup: [
                    { pos: [0, 4], type: 'K', owner: 'gote' },
                    { pos: [0, 3], type: 'G', owner: 'gote' },
                    { pos: [2, 4], type: 'R', owner: 'sente' },
                    { pos: [4, 4], type: 'K', owner: 'sente' }
                ],
                captured: { sente: ['G'], gote: [] }
            }
        ],
        5: [ // 五手詰
            {
                board: createEmptyBoard(),
                setup: [
                    { pos: [0, 4], type: 'K', owner: 'gote' },
                    { pos: [0, 3], type: 'S', owner: 'gote' },
                    { pos: [0, 5], type: 'S', owner: 'gote' },
                    { pos: [2, 2], type: 'B', owner: 'sente' },
                    { pos: [2, 6], type: 'B', owner: 'sente' },
                    { pos: [4, 4], type: 'K', owner: 'sente' }
                ],
                captured: { sente: ['G', 'G'], gote: [] }
            }
        ]
    };
    
    const puzzleList = puzzles[level];
    const puzzle = puzzleList[Math.floor(Math.random() * puzzleList.length)];
    
    // 盤面をセットアップ
    gameState.board = createEmptyBoard();
    puzzle.setup.forEach(p => {
        gameState.board[p.pos[0]][p.pos[1]] = { type: p.type, owner: p.owner };
    });
    gameState.capturedPieces = JSON.parse(JSON.stringify(puzzle.captured));
}

// 空の盤面を作成
function createEmptyBoard() {
    return Array(9).fill(null).map(() => Array(9).fill(null));
}

// 盤面の描画
function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    
    // オンライン対戦で後手の場合は盤面を反転
    const shouldFlip = gameState.isOnlineGame && gameState.playerRole === 'gote';
    
    for (let displayRow = 0; displayRow < 9; displayRow++) {
        for (let displayCol = 0; displayCol < 9; displayCol++) {
            // 実際の盤面座標（反転時は逆順）
            const row = shouldFlip ? (8 - displayRow) : displayRow;
            const col = shouldFlip ? (8 - displayCol) : displayCol;
            
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const piece = gameState.board[row][col];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = 'piece';
                // 反転時は駒の向きも反転
                if (shouldFlip) {
                    if (piece.owner === 'sente') {
                        pieceEl.classList.add('opponent');
                    }
                } else {
                    if (piece.owner === 'gote') {
                        pieceEl.classList.add('opponent');
                    }
                }
                if (piece.type.startsWith('+')) {
                    pieceEl.classList.add('promoted');
                }
                pieceEl.textContent = PIECES[piece.type].name;
                cell.appendChild(pieceEl);
            }
            
            // 選択状態
            if (gameState.selectedCell && 
                gameState.selectedCell.row === row && 
                gameState.selectedCell.col === col) {
                cell.classList.add('selected');
            }
            
            // 最後の手
            if (gameState.lastMove) {
                if ((gameState.lastMove.toRow === row && gameState.lastMove.toCol === col) ||
                    (gameState.lastMove.fromRow === row && gameState.lastMove.fromCol === col)) {
                    cell.classList.add('last-move');
                }
            }
            
            // 王手表示
            if (gameState.inCheck && piece && piece.type === 'K' && piece.owner === gameState.currentPlayer) {
                cell.classList.add('check');
            }
            
            cell.addEventListener('click', () => handleCellClick(row, col));
            boardEl.appendChild(cell);
        }
    }
}

// 持ち駒の描画
function renderCapturedPieces() {
    // オンライン対戦時は自分の役割に応じて表示を入れ替え
    let idMap;
    if (gameState.isOnlineGame && gameState.playerRole === 'gote') {
        // 後手の場合は入れ替え（自分が後手なので、goteがmy、senteがopponent）
        idMap = {
            'gote': 'my-captured-list',
            'sente': 'opponent-captured-list'
        };
    } else {
        // 先手または非オンライン（senteがmy、goteがopponent）
        idMap = {
            'sente': 'my-captured-list',
            'gote': 'opponent-captured-list'
        };
    }
    
    ['sente', 'gote'].forEach(player => {
        const listEl = document.getElementById(idMap[player]);
        if (!listEl) return;
        listEl.innerHTML = '';
        
        // 駒の種類ごとにカウント
        const counts = {};
        gameState.capturedPieces[player].forEach(type => {
            const baseType = UNPROMOTED[type] || type;
            counts[baseType] = (counts[baseType] || 0) + 1;
        });
        
        // 表示順序
        const order = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];
        order.forEach(type => {
            if (counts[type]) {
                const pieceEl = document.createElement('div');
                pieceEl.className = 'captured-piece';
                if (gameState.selectedCaptured && 
                    gameState.selectedCaptured.type === type && 
                    gameState.selectedCaptured.owner === player) {
                    pieceEl.classList.add('selected');
                }
                
                const charEl = document.createElement('span');
                charEl.className = 'piece-char';
                charEl.textContent = PIECE_DISPLAY[type];
                pieceEl.appendChild(charEl);
                
                if (counts[type] > 1) {
                    const countEl = document.createElement('span');
                    countEl.className = 'piece-count';
                    countEl.textContent = counts[type];
                    pieceEl.appendChild(countEl);
                }
                
                pieceEl.addEventListener('click', () => handleCapturedClick(type, player));
                listEl.appendChild(pieceEl);
            }
        });
    });
}

// 移動可能なマスを表示
function showValidMoves() {
    clearValidMoves();
    
    if (gameState.selectedCell) {
        const { row, col } = gameState.selectedCell;
        const moves = getValidMoves(row, col);
        moves.forEach(move => {
            const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (cell) {
                if (gameState.board[move.row][move.col]) {
                    cell.classList.add('can-capture');
                } else {
                    cell.classList.add('movable');
                }
            }
        });
    } else if (gameState.selectedCaptured) {
        const drops = getValidDrops(gameState.selectedCaptured.type, gameState.selectedCaptured.owner);
        drops.forEach(drop => {
            const cell = document.querySelector(`[data-row="${drop.row}"][data-col="${drop.col}"]`);
            if (cell) {
                cell.classList.add('movable');
            }
        });
    }
}

// 移動可能マスの表示をクリア
function clearValidMoves() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('movable', 'can-capture');
    });
}

// 駒の移動可能なマスを取得
function getValidMoves(row, col, board = gameState.board, player = gameState.currentPlayer) {
    const piece = board[row][col];
    if (!piece || piece.owner !== player) return [];
    
    const moves = [];
    const pieceData = PIECES[piece.type];
    const direction = piece.owner === 'sente' ? 1 : -1;
    
    if (typeof pieceData.moves === 'string') {
        // 特殊移動（飛車、角、香車、龍、馬）
        switch (pieceData.moves) {
            case 'rook':
                addLineMoves(row, col, [[0,1],[0,-1],[1,0],[-1,0]], moves, board, player);
                break;
            case 'bishop':
                addLineMoves(row, col, [[1,1],[1,-1],[-1,1],[-1,-1]], moves, board, player);
                break;
            case 'lance':
                addLineMoves(row, col, [[0, -direction]], moves, board, player);
                break;
            case 'dragon': // 龍王（飛車の成り）
                addLineMoves(row, col, [[0,1],[0,-1],[1,0],[-1,0]], moves, board, player);
                // 斜め1マス
                [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dc, dr]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isInBoard(newRow, newCol)) {
                        const target = board[newRow][newCol];
                        if (!target || target.owner !== player) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                });
                break;
            case 'horse': // 龍馬（角の成り）
                addLineMoves(row, col, [[1,1],[1,-1],[-1,1],[-1,-1]], moves, board, player);
                // 縦横1マス
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dc, dr]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isInBoard(newRow, newCol)) {
                        const target = board[newRow][newCol];
                        if (!target || target.owner !== player) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                });
                break;
        }
    } else {
        // 通常移動
        pieceData.moves.forEach(([dc, dr]) => {
            const actualDr = dr * direction;
            const newRow = row + actualDr;
            const newCol = col + dc;
            if (isInBoard(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (!target || target.owner !== player) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });
    }
    
    return moves;
}

// 直線移動の追加
function addLineMoves(row, col, directions, moves, board, player) {
    directions.forEach(([dc, dr]) => {
        let newRow = row + dr;
        let newCol = col + dc;
        while (isInBoard(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (target) {
                if (target.owner !== player) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
            moves.push({ row: newRow, col: newCol });
            newRow += dr;
            newCol += dc;
        }
    });
}

// 持ち駒を打てるマスを取得
function getValidDrops(pieceType, owner, board = gameState.board) {
    const drops = [];
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col]) continue; // 駒がある場所には打てない
            
            // 二歩チェック
            if (pieceType === 'P') {
                let hasPawn = false;
                for (let r = 0; r < 9; r++) {
                    const p = board[r][col];
                    if (p && p.type === 'P' && p.owner === owner) {
                        hasPawn = true;
                        break;
                    }
                }
                if (hasPawn) continue;
            }
            
            // 行けない場所チェック（歩、香、桂）
            if (owner === 'sente') {
                if ((pieceType === 'P' || pieceType === 'L') && row === 0) continue;
                if (pieceType === 'N' && row <= 1) continue;
            } else {
                if ((pieceType === 'P' || pieceType === 'L') && row === 8) continue;
                if (pieceType === 'N' && row >= 7) continue;
            }
            
            drops.push({ row, col });
        }
    }
    
    return drops;
}

// 盤内チェック
function isInBoard(row, col) {
    return row >= 0 && row < 9 && col >= 0 && col < 9;
}

// 盤面のコピー
function copyBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

// 王手判定
function isInCheck(board, player) {
    // 王の位置を探す
    let kingPos = null;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'K' && piece.owner === player) {
                kingPos = { row, col };
                break;
            }
        }
        if (kingPos) break;
    }
    
    if (!kingPos) return false; // 王がない（詰将棋などの特殊ケース）
    
    // 相手の全ての駒から王に攻撃できるかチェック
    const opponent = player === 'sente' ? 'gote' : 'sente';
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece.owner === opponent) {
                const moves = getRawMoves(row, col, board, opponent);
                if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 移動可能マス（王手回避を考慮しない）
function getRawMoves(row, col, board, player) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves = [];
    const pieceData = PIECES[piece.type];
    const direction = piece.owner === 'sente' ? 1 : -1;
    
    if (typeof pieceData.moves === 'string') {
        switch (pieceData.moves) {
            case 'rook':
                addLineMoves(row, col, [[0,1],[0,-1],[1,0],[-1,0]], moves, board, player);
                break;
            case 'bishop':
                addLineMoves(row, col, [[1,1],[1,-1],[-1,1],[-1,-1]], moves, board, player);
                break;
            case 'lance':
                addLineMoves(row, col, [[0, -direction]], moves, board, player);
                break;
            case 'dragon':
                addLineMoves(row, col, [[0,1],[0,-1],[1,0],[-1,0]], moves, board, player);
                [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dc, dr]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isInBoard(newRow, newCol)) {
                        const target = board[newRow][newCol];
                        if (!target || target.owner !== player) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                });
                break;
            case 'horse':
                addLineMoves(row, col, [[1,1],[1,-1],[-1,1],[-1,-1]], moves, board, player);
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dc, dr]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isInBoard(newRow, newCol)) {
                        const target = board[newRow][newCol];
                        if (!target || target.owner !== player) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                });
                break;
        }
    } else {
        pieceData.moves.forEach(([dc, dr]) => {
            const actualDr = dr * direction;
            const newRow = row + actualDr;
            const newCol = col + dc;
            if (isInBoard(newRow, newCol)) {
                const target = board[newRow][newCol];
                if (!target || target.owner !== player) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });
    }
    
    return moves;
}

// 詰みチェック
function isCheckmate(board, player) {
    if (!isInCheck(board, player)) return false;
    
    // 全ての駒の移動を試す
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece.owner === player) {
                const moves = getValidMoves(row, col, board, player);
                if (moves.length > 0) return false;
            }
        }
    }
    
    // 持ち駒を打てるかチェック
    const captured = gameState.capturedPieces[player];
    const uniquePieces = [...new Set(captured.map(t => UNPROMOTED[t] || t))];
    for (const pieceType of uniquePieces) {
        const drops = getValidDrops(pieceType, player, board);
        if (drops.length > 0) return false;
    }
    
    return true;
}

// セルクリック処理
function handleCellClick(row, col) {
    if (gameState.isGameOver) return;
    if (!gameState.isPlayerTurn && gameState.gameMode === 'cpu') return;
    // オンライン対戦時は自分のターン・役割をチェック
    if (gameState.isOnlineGame && (gameState.currentPlayer !== gameState.playerRole || !gameState.isPlayerTurn)) return;
    if (gameState.pendingPromotion) return;
    
    const clickedPiece = gameState.board[row][col];
    
    // 持ち駒が選択されている場合
    if (gameState.selectedCaptured) {
        const drops = getValidDrops(gameState.selectedCaptured.type, gameState.selectedCaptured.owner);
        if (drops.some(d => d.row === row && d.col === col)) {
            dropPiece(row, col);
        } else {
            clearSelection();
            if (clickedPiece && clickedPiece.owner === gameState.currentPlayer) {
                gameState.selectedCell = { row, col };
                renderBoard();
                showValidMoves();
            }
        }
        return;
    }
    
    // 駒が選択されている場合
    if (gameState.selectedCell) {
        const { row: fromRow, col: fromCol } = gameState.selectedCell;
        
        // 同じマスをクリックしたら選択解除
        if (fromRow === row && fromCol === col) {
            clearSelection();
            return;
        }
        
        // 自分の駒をクリックしたら選択切り替え
        if (clickedPiece && clickedPiece.owner === gameState.currentPlayer) {
            gameState.selectedCell = { row, col };
            renderBoard();
            showValidMoves();
            return;
        }
        
        // 移動可能かチェック
        const moves = getValidMoves(fromRow, fromCol);
        if (moves.some(m => m.row === row && m.col === col)) {
            movePiece(fromRow, fromCol, row, col);
        }
    } else {
        // 駒を選択
        if (clickedPiece && clickedPiece.owner === gameState.currentPlayer) {
            gameState.selectedCell = { row, col };
            renderBoard();
            showValidMoves();
        }
    }
}

// 持ち駒クリック処理
function handleCapturedClick(type, owner) {
    if (gameState.isGameOver) return;
    if (!gameState.isPlayerTurn && gameState.gameMode === 'cpu') return;
    if (owner !== gameState.currentPlayer) return;
    if (gameState.pendingPromotion) return;
    
    // 既に選択されている場合は解除
    if (gameState.selectedCaptured && 
        gameState.selectedCaptured.type === type && 
        gameState.selectedCaptured.owner === owner) {
        clearSelection();
        return;
    }
    
    gameState.selectedCell = null;
    gameState.selectedCaptured = { type, owner };
    renderBoard();
    renderCapturedPieces();
    showValidMoves();
}

// 選択をクリア
function clearSelection() {
    gameState.selectedCell = null;
    gameState.selectedCaptured = null;
    renderBoard();
    renderCapturedPieces();
    clearValidMoves();
}

// 駒を移動
function movePiece(fromRow, fromCol, toRow, toCol, promoteTo = null) {
    const piece = gameState.board[fromRow][fromCol];
    const captured = gameState.board[toRow][toCol];
    
    // 成りの確認
    if (promoteTo === null && canPromote(piece, fromRow, toRow)) {
        if (mustPromote(piece, toRow)) {
            promoteTo = PIECES[piece.type].promoted;
        } else {
            // 成るかどうか確認
            gameState.pendingPromotion = { fromRow, fromCol, toRow, toCol };
            showPromoteModal(piece.type);
            return;
        }
    }
    
    // 履歴に保存
    gameState.moveHistory.push({
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: { ...piece },
        captured: captured ? { ...captured } : null,
        promoted: promoteTo !== null
    });
    
    // 駒を取る
    if (captured) {
        // 王を取った場合はゲーム終了
        if (captured.type === 'K') {
            gameState.board[toRow][toCol] = {
                type: promoteTo || piece.type,
                owner: piece.owner
            };
            gameState.board[fromRow][fromCol] = null;
            gameState.lastMove = { fromRow, fromCol, toRow, toCol };
            gameState.isGameOver = true;
            const winner = piece.owner;
            clearSelection();
            renderBoard();
            updateDisplay();
            if (gameState.isOnlineGame) {
                finishOnlineTurn().then(() => showResult(winner));
            } else {
                showResult(winner);
            }
            return;
        }
        const capturedType = UNPROMOTED[captured.type] || captured.type;
        gameState.capturedPieces[piece.owner].push(capturedType);
    }
    
    // 移動実行
    gameState.board[toRow][toCol] = {
        type: promoteTo || piece.type,
        owner: piece.owner
    };
    gameState.board[fromRow][fromCol] = null;
    
    // 最後の手を記録
    gameState.lastMove = { fromRow, fromCol, toRow, toCol };
    
    finishMove();
}

// 持ち駒を打つ
function dropPiece(row, col) {
    const { type, owner } = gameState.selectedCaptured;
    
    // 履歴に保存
    gameState.moveHistory.push({
        drop: true,
        to: { row, col },
        piece: { type, owner }
    });
    
    // 持ち駒から削除
    const index = gameState.capturedPieces[owner].findIndex(t => {
        const baseType = UNPROMOTED[t] || t;
        return baseType === type;
    });
    if (index !== -1) {
        gameState.capturedPieces[owner].splice(index, 1);
    }
    
    // 盤面に配置
    gameState.board[row][col] = { type, owner };
    
    // 最後の手を記録
    gameState.lastMove = { fromRow: -1, fromCol: -1, toRow: row, toCol: col };
    
    finishMove();
}

// 手番終了処理
function finishMove() {
    gameState.selectedCell = null;
    gameState.selectedCaptured = null;
    gameState.moveCount++;
    
    // プレイヤー交代
    const nextPlayer = gameState.currentPlayer === 'sente' ? 'gote' : 'sente';
    gameState.currentPlayer = nextPlayer;
    
    // 王手チェック
    gameState.inCheck = isInCheck(gameState.board, nextPlayer);
    
    // 詰みチェック
    if (isCheckmate(gameState.board, nextPlayer)) {
        gameState.isGameOver = true;
        const winner = nextPlayer === 'sente' ? 'gote' : 'sente';
        if (gameState.isOnlineGame) {
            finishOnlineTurn().then(() => showResult(winner));
        } else {
            showResult(winner);
        }
        updateDisplay();
        return;
    }
    
    // オンライン対戦の場合は更新
    if (gameState.isOnlineGame) {
        finishOnlineTurn();
    }
    
    updateDisplay();
    
    // CPUの手番
    if (gameState.gameMode === 'cpu' && nextPlayer === 'gote') {
        gameState.isPlayerTurn = false;
        setTimeout(() => cpuMove(), 500);
    } else if (gameState.gameMode === 'tsume' && nextPlayer === 'gote') {
        // 詰将棋で相手の応手
        gameState.isPlayerTurn = false;
        setTimeout(() => tsumeResponse(), 500);
    } else {
        gameState.isPlayerTurn = true;
    }
}

// 成れるかどうか
function canPromote(piece, fromRow, toRow) {
    if (!PIECES[piece.type].canPromote) return false;
    
    if (piece.owner === 'sente') {
        return fromRow <= 2 || toRow <= 2;
    } else {
        return fromRow >= 6 || toRow >= 6;
    }
}

// 成らなければならないか
function mustPromote(piece, toRow) {
    const type = piece.type;
    if (type === 'P' || type === 'L') {
        return (piece.owner === 'sente' && toRow === 0) || 
               (piece.owner === 'gote' && toRow === 8);
    }
    if (type === 'N') {
        return (piece.owner === 'sente' && toRow <= 1) || 
               (piece.owner === 'gote' && toRow >= 7);
    }
    return false;
}

// 成り確認モーダル表示
function showPromoteModal(pieceType) {
    const originalName = PIECES[pieceType].name;
    const promotedName = PIECES[PIECES[pieceType].promoted].name;
    
    document.getElementById('unpromoted-piece').textContent = originalName;
    document.getElementById('promoted-piece').textContent = promotedName;
    
    showModal('promote-modal');
}

// 成る
function confirmPromote() {
    const { fromRow, fromCol, toRow, toCol } = gameState.pendingPromotion;
    const piece = gameState.board[fromRow][fromCol];
    const promotedType = PIECES[piece.type].promoted;
    
    hideModal('promote-modal');
    gameState.pendingPromotion = null;
    
    movePiece(fromRow, fromCol, toRow, toCol, promotedType);
}

// 成らない
function declinePromote() {
    const { fromRow, fromCol, toRow, toCol } = gameState.pendingPromotion;
    
    hideModal('promote-modal');
    gameState.pendingPromotion = null;
    
    movePiece(fromRow, fromCol, toRow, toCol, false);
}

// CPUの手
function cpuMove() {
    showThinking(true);
    
    setTimeout(() => {
        let move;
        switch (gameState.difficulty) {
            case 'ume':
                move = cpuMoveEasy();
                break;
            case 'take':
                move = cpuMoveNormal();
                break;
            case 'matsu':
                move = cpuMoveHard();
                break;
        }
        
        showThinking(false);
        
        if (move) {
            if (move.drop) {
                gameState.selectedCaptured = { type: move.type, owner: 'gote' };
                dropPiece(move.toRow, move.toCol);
            } else {
                // CPUは自動で成る
                const piece = gameState.board[move.fromRow][move.fromCol];
                let promoteTo = null;
                if (canPromote(piece, move.fromRow, move.toRow)) {
                    promoteTo = PIECES[piece.type].promoted;
                }
                movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol, promoteTo);
            }
        }
    }, 300);
}

// 梅（初心者）：ランダム
function cpuMoveEasy() {
    const moves = getAllMoves('gote');
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
}

// 竹（中級者）：簡単な評価
function cpuMoveNormal() {
    const moves = getAllMoves('gote');
    if (moves.length === 0) return null;
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    moves.forEach(move => {
        let score = 0;
        
        if (!move.drop) {
            // 駒を取る手を評価
            const target = gameState.board[move.toRow][move.toCol];
            if (target) {
                score += getPieceValue(target.type) * 10;
            }
            
            // 成れる場合は加点
            const piece = gameState.board[move.fromRow][move.fromCol];
            if (canPromote(piece, move.fromRow, move.toRow)) {
                score += 5;
            }
        } else {
            // 打ち駒
            score += 2;
        }
        
        // ランダム要素
        score += Math.random() * 3;
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });
    
    return bestMove;
}

// 松（上級者）：ミニマックス
function cpuMoveHard() {
    const moves = getAllMoves('gote');
    if (moves.length === 0) return null;
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    moves.forEach(move => {
        const testBoard = copyBoard(gameState.board);
        const testCaptured = JSON.parse(JSON.stringify(gameState.capturedPieces));
        
        applyMove(testBoard, testCaptured, move, 'gote');
        
        const score = minimax(testBoard, testCaptured, 2, -Infinity, Infinity, false);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });
    
    return bestMove;
}

// ミニマックス法
function minimax(board, captured, depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard(board, 'gote');
    }
    
    const player = isMaximizing ? 'gote' : 'sente';
    const moves = getAllMovesForBoard(board, captured, player);
    
    if (moves.length === 0) {
        // 詰み
        return isMaximizing ? -10000 : 10000;
    }
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves.slice(0, 15)) { // 探索を制限
            const testBoard = copyBoard(board);
            const testCaptured = JSON.parse(JSON.stringify(captured));
            applyMove(testBoard, testCaptured, move, player);
            const evalScore = minimax(testBoard, testCaptured, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves.slice(0, 15)) {
            const testBoard = copyBoard(board);
            const testCaptured = JSON.parse(JSON.stringify(captured));
            applyMove(testBoard, testCaptured, move, player);
            const evalScore = minimax(testBoard, testCaptured, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// 盤面評価
function evaluateBoard(board, player) {
    let score = 0;
    const opponent = player === 'sente' ? 'gote' : 'sente';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = getPieceValue(piece.type);
                if (piece.owner === player) {
                    score += value;
                    // 位置ボーナス
                    if (player === 'gote') {
                        score += (8 - row) * 0.1; // 前進を評価
                    } else {
                        score += row * 0.1;
                    }
                } else {
                    score -= value;
                }
            }
        }
    }
    
    return score;
}

// 駒の価値
function getPieceValue(type) {
    const values = {
        'K': 1000, 'R': 15, 'B': 13, 'G': 9, 'S': 8, 'N': 6, 'L': 5, 'P': 1,
        '+R': 17, '+B': 15, '+S': 9, '+N': 9, '+L': 9, '+P': 9
    };
    return values[type] || 0;
}

// 全ての合法手を取得
function getAllMoves(player, board = gameState.board) {
    const moves = [];
    
    // 盤上の駒の移動
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece.owner === player) {
                const validMoves = getValidMoves(row, col, board, player);
                validMoves.forEach(m => {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: m.row,
                        toCol: m.col
                    });
                });
            }
        }
    }
    
    // 持ち駒を打つ
    const captured = gameState.capturedPieces[player];
    const uniquePieces = [...new Set(captured.map(t => UNPROMOTED[t] || t))];
    uniquePieces.forEach(type => {
        const drops = getValidDrops(type, player, board);
        drops.forEach(d => {
            moves.push({
                drop: true,
                type: type,
                toRow: d.row,
                toCol: d.col
            });
        });
    });
    
    return moves;
}

// 特定の盤面に対して全ての合法手を取得
function getAllMovesForBoard(board, captured, player) {
    const moves = [];
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece.owner === player) {
                const validMoves = getValidMoves(row, col, board, player);
                validMoves.forEach(m => {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: m.row,
                        toCol: m.col
                    });
                });
            }
        }
    }
    
    const playerCaptured = captured[player];
    const uniquePieces = [...new Set(playerCaptured.map(t => UNPROMOTED[t] || t))];
    uniquePieces.forEach(type => {
        const drops = getValidDrops(type, player, board);
        drops.forEach(d => {
            moves.push({
                drop: true,
                type: type,
                toRow: d.row,
                toCol: d.col
            });
        });
    });
    
    return moves;
}

// 仮の手を適用
function applyMove(board, captured, move, player) {
    if (move.drop) {
        board[move.toRow][move.toCol] = { type: move.type, owner: player };
        const index = captured[player].findIndex(t => {
            const baseType = UNPROMOTED[t] || t;
            return baseType === move.type;
        });
        if (index !== -1) {
            captured[player].splice(index, 1);
        }
    } else {
        const piece = board[move.fromRow][move.fromCol];
        const target = board[move.toRow][move.toCol];
        
        if (target) {
            const capturedType = UNPROMOTED[target.type] || target.type;
            captured[player].push(capturedType);
        }
        
        // 自動で成る（CPUは常に成る）
        let newType = piece.type;
        if (PIECES[piece.type].canPromote) {
            if (player === 'gote') {
                if (move.fromRow >= 6 || move.toRow >= 6) {
                    newType = PIECES[piece.type].promoted;
                }
            } else {
                if (move.fromRow <= 2 || move.toRow <= 2) {
                    newType = PIECES[piece.type].promoted;
                }
            }
        }
        
        board[move.toRow][move.toCol] = { type: newType, owner: player };
        board[move.fromRow][move.fromCol] = null;
    }
}

// 詰将棋の応手
function tsumeResponse() {
    // 最善の逃げ手を選択
    const moves = getAllMoves('gote');
    if (moves.length === 0) {
        // 詰み！クリア
        gameState.isGameOver = true;
        showTsumeClear();
        return;
    }
    
    // 王を逃がす手を優先
    const kingMoves = moves.filter(m => {
        if (m.drop) return false;
        const piece = gameState.board[m.fromRow][m.fromCol];
        return piece.type === 'K';
    });
    
    let move;
    if (kingMoves.length > 0) {
        move = kingMoves[Math.floor(Math.random() * kingMoves.length)];
    } else {
        move = moves[Math.floor(Math.random() * moves.length)];
    }
    
    if (move.drop) {
        gameState.selectedCaptured = { type: move.type, owner: 'gote' };
        dropPiece(move.toRow, move.toCol);
    } else {
        movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol, false);
    }
    
    gameState.isPlayerTurn = true;
}

// 表示更新
function updateDisplay() {
    renderBoard();
    renderCapturedPieces();
    
    // ターン表示
    const turnText = gameState.currentPlayer === 'sente' ? '先手の番' : '後手の番';
    document.getElementById('current-turn').textContent = turnText;
    
    // 手数表示
    document.getElementById('move-count').textContent = `${gameState.moveCount}手`;
    
    // モード表示
    let modeText = '';
    if (gameState.gameMode === 'cpu') {
        const diffNames = { 'ume': '梅', 'take': '竹', 'matsu': '松' };
        modeText = `CPU対戦（${diffNames[gameState.difficulty]}）`;
    } else if (gameState.gameMode === 'pvp') {
        modeText = 'ローカル対戦';
    } else if (gameState.gameMode === 'tsume') {
        modeText = `詰将棋（${gameState.tsumeLevel}手詰）`;
    } else if (gameState.gameMode === 'online') {
        modeText = 'オンライン対戦';
    }
    document.getElementById('game-mode').textContent = modeText;
    
    // プレイヤー名表示
    if (gameState.isOnlineGame) {
        // オンライン対戦時：自分の役割に応じて名前を表示
        const myRole = gameState.playerRole;
        const opponentRole = myRole === 'sente' ? 'gote' : 'sente';
        const myRoleText = myRole === 'sente' ? '先手' : '後手';
        const opponentRoleText = opponentRole === 'sente' ? '先手' : '後手';
        document.getElementById('my-name').textContent = `${myRoleText}（${gameState.playerName}）`;
        document.getElementById('opponent-name').textContent = `${opponentRoleText}（${gameState.opponentName}）`;
    } else if (gameState.gameMode === 'cpu') {
        const diffNames = { 'ume': '梅', 'take': '竹', 'matsu': '松' };
        document.getElementById('my-name').textContent = '先手（あなた）';
        document.getElementById('opponent-name').textContent = `後手（CPU ${diffNames[gameState.difficulty]}）`;
    } else if (gameState.gameMode === 'pvp') {
        document.getElementById('my-name').textContent = '先手';
        document.getElementById('opponent-name').textContent = '後手';
    }
    
    // プレイヤー表示（クラスで選択）- オンライン対戦時は自分の役割基準
    const myPlayer = document.querySelector('.player-info.my-player');
    const opponentPlayer = document.querySelector('.player-info.opponent-player');
    if (gameState.isOnlineGame) {
        if (myPlayer) myPlayer.classList.toggle('active', gameState.currentPlayer === gameState.playerRole);
        if (opponentPlayer) opponentPlayer.classList.toggle('active', gameState.currentPlayer !== gameState.playerRole);
    } else {
        if (myPlayer) myPlayer.classList.toggle('active', gameState.currentPlayer === 'sente');
        if (opponentPlayer) opponentPlayer.classList.toggle('active', gameState.currentPlayer === 'gote');
    }
    
    // ボタン状態
    document.getElementById('undo-btn').disabled = gameState.moveHistory.length === 0 || gameState.isGameOver;
    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) hintBtn.disabled = !gameState.isPlayerTurn || gameState.isGameOver;
}

// 待った機能
function undoMove() {
    if (gameState.moveHistory.length === 0) return;
    if (gameState.gameMode === 'cpu') {
        // CPU対戦時は2手戻す
        if (gameState.moveHistory.length >= 2) {
            undoSingleMove();
            undoSingleMove();
        }
    } else {
        undoSingleMove();
    }
    gameState.isPlayerTurn = true;
    updateDisplay();
}

function undoSingleMove() {
    const lastMove = gameState.moveHistory.pop();
    if (!lastMove) return;
    
    if (lastMove.drop) {
        // 打ち駒を戻す
        const piece = gameState.board[lastMove.to.row][lastMove.to.col];
        gameState.capturedPieces[piece.owner].push(piece.type);
        gameState.board[lastMove.to.row][lastMove.to.col] = null;
    } else {
        // 移動を戻す
        const movedPiece = gameState.board[lastMove.to.row][lastMove.to.col];
        
        // 成りを戻す
        gameState.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        
        // 取った駒を戻す
        if (lastMove.captured) {
            gameState.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
            // 持ち駒から削除
            const capturedType = UNPROMOTED[lastMove.captured.type] || lastMove.captured.type;
            const index = gameState.capturedPieces[lastMove.piece.owner].indexOf(capturedType);
            if (index !== -1) {
                gameState.capturedPieces[lastMove.piece.owner].splice(index, 1);
            }
        } else {
            gameState.board[lastMove.to.row][lastMove.to.col] = null;
        }
    }
    
    // プレイヤー交代
    gameState.currentPlayer = gameState.currentPlayer === 'sente' ? 'gote' : 'sente';
    gameState.moveCount--;
    gameState.lastMove = null;
    gameState.inCheck = isInCheck(gameState.board, gameState.currentPlayer);
    gameState.isGameOver = false;
}

// ヒント機能
function showHint() {
    if (!gameState.isPlayerTurn || gameState.isGameOver) return;
    
    clearHints();
    
    // 最善手を計算（簡易版）
    const moves = getAllMoves(gameState.currentPlayer);
    if (moves.length === 0) return;
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    moves.forEach(move => {
        let score = 0;
        if (!move.drop) {
            const target = gameState.board[move.toRow][move.toCol];
            if (target) {
                score += getPieceValue(target.type) * 10;
            }
        }
        
        if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
            bestScore = score;
            bestMove = move;
        }
    });
    
    if (bestMove) {
        if (bestMove.drop) {
            const cell = document.querySelector(`[data-row="${bestMove.toRow}"][data-col="${bestMove.toCol}"]`);
            if (cell) cell.classList.add('hint');
        } else {
            const fromCell = document.querySelector(`[data-row="${bestMove.fromRow}"][data-col="${bestMove.fromCol}"]`);
            const toCell = document.querySelector(`[data-row="${bestMove.toRow}"][data-col="${bestMove.toCol}"]`);
            if (fromCell) fromCell.classList.add('hint');
            if (toCell) toCell.classList.add('hint');
        }
        
        // 3秒後にヒントを消す
        setTimeout(clearHints, 3000);
    }
}

function clearHints() {
    document.querySelectorAll('.cell.hint').forEach(cell => {
        cell.classList.remove('hint');
    });
}

// 新しい対局
function newGame() {
    // 現在のモードで再対局
    initGame(gameState.gameMode || 'cpu', gameState.difficulty || 'take');
}

// 結果表示
function showResult(winner) {
    let title, message;
    
    if (gameState.gameMode === 'cpu') {
        if (winner === 'sente') {
            title = '勝利！';
            document.getElementById('result-title').className = 'win';
        } else {
            title = '敗北...';
            document.getElementById('result-title').className = 'lose';
        }
    } else {
        title = winner === 'sente' ? '先手の勝ち' : '後手の勝ち';
        document.getElementById('result-title').className = '';
    }
    
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-move-count').textContent = gameState.moveCount;
    
    showModal('result-modal');
}

// 詰将棋クリア
function showTsumeClear() {
    document.getElementById('tsume-result-title').textContent = 
        `🎉 ${gameState.tsumeLevel}手詰をクリア！`;
    document.getElementById('tsume-message').textContent = `${gameState.moveCount}手で正解！`;
    showModal('tsume-clear-modal');
}

// 思考中表示
function showThinking(show) {
    const el = document.getElementById('thinking-indicator');
    el.classList.toggle('hidden', !show);
}

// モーダル表示/非表示
function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // 初期盤面をセットアップ
    gameState.board = getInitialBoard();
    
    // 初期表示
    renderBoard();
    renderCapturedPieces();
    
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
            const level = btn.dataset.level;
            
            modeDropdown.classList.remove('show');
            
            if (gameState.isOnlineGame) {
                leaveOnlineGame();
            }
            
            if (mode === 'cpu') {
                initGame('cpu', difficulty);
            } else if (mode === 'tsume') {
                initGame('tsume', parseInt(level));
            } else if (mode === 'pvp') {
                initGame('pvp', null);
            }
        });
    });
    
    // オンライン対戦ボタン
    document.getElementById('online-btn').addEventListener('click', showOnlineLobby);
    
    // ヘッダーボタンのイベントリスナー
    document.getElementById('new-game-btn').addEventListener('click', newGame);
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    const hintBtnEl = document.getElementById('hint-btn');
    if (hintBtnEl) hintBtnEl.addEventListener('click', showHint);
    
    // 成りモーダルのイベントリスナー
    document.getElementById('promote-yes').addEventListener('click', confirmPromote);
    document.getElementById('promote-no').addEventListener('click', declinePromote);
    
    // 結果モーダルのイベントリスナー
    document.getElementById('play-again-btn').addEventListener('click', () => {
        hideModal('result-modal');
        // オンラインゲームの場合はロビーに戻る
        if (gameState.isOnlineGame) {
            leaveOnlineGame();
            showOnlineLobby();
        } else {
            // 同じモードで再対局
            initGame(gameState.gameMode, gameState.difficulty || gameState.tsumeLevel);
        }
    });
    document.getElementById('change-mode-btn').addEventListener('click', () => {
        hideModal('result-modal');
        if (gameState.isOnlineGame) {
            leaveOnlineGame();
        }
    });
    
    // 詰将棋クリアモーダルのイベントリスナー
    document.getElementById('next-tsume-btn').addEventListener('click', () => {
        hideModal('tsume-clear-modal');
        initGame('tsume', gameState.tsumeLevel);
    });
    document.getElementById('tsume-menu-btn').addEventListener('click', () => {
        hideModal('tsume-clear-modal');
    });
    
    // デフォルトでCPU（竹）モードで開始
    initGame('cpu', 'take');
});

// グローバルに公開
window.initGame = initGame;
window.newGame = newGame;
window.undoMove = undoMove;
window.showHint = showHint;
window.confirmPromote = confirmPromote;
window.declinePromote = declinePromote;
window.hideModal = hideModal;
window.showOnlineLobby = showOnlineLobby;
window.startMatching = startMatching;
window.cancelMatching = cancelMatching;
window.closeLobby = closeLobby;

// ====== オンライン対戦機能（オセロと同様のシンプル版）======

// オンラインロビーを表示
function showOnlineLobby() {
    showModal('online-lobby-modal');
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('matching-screen').classList.add('hidden');
    
    // 保存された名前を復元
    const savedName = localStorage.getItem('shogiPlayerName') || '';
    document.getElementById('online-name').value = savedName;
}

// ロビーを閉じる
function closeLobby() {
    if (gameState.matchingListener) {
        cancelMatching();
    }
    hideModal('online-lobby-modal');
}

// マッチング開始
async function startMatching() {
    const playerName = document.getElementById('online-name').value.trim();
    if (!playerName) {
        alert('名前を入力してください');
        return;
    }
    
    // Firebase の初期化を待つ
    try {
        if (window.firebaseInitReady) {
            await window.firebaseInitReady;
        }
        
        if (!window.db) {
            throw new Error('Firestore database not initialized');
        }
    } catch (error) {
        console.error('Firebase 初期化エラー:', error);
        alert('Firebase の初期化に失敗しました。\n\nページをリロードしてください。');
        return;
    }
    
    // 名前を保存
    localStorage.setItem('shogiPlayerName', playerName);
    gameState.playerName = playerName;
    
    // 画面切り替え
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('matching-screen').classList.remove('hidden');
    
    // プレイヤーID生成
    gameState.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
        // 待機中のルームを探す
        const waitingRooms = await window.db.collection('shogiRooms')
            .where('status', '==', 'waiting')
            .get();
        
        // 有効なルームを探す（5分以内に作成されたもの）
        let validRoom = null;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        for (const doc of waitingRooms.docs) {
            const data = doc.data();
            // player1が存在し、自分ではないことを確認
            if (data.player1 && data.player1.id !== gameState.playerId) {
                // 作成時間をチェック（古すぎるルームはスキップ）
                const createdAt = data.createdAt?.toDate?.();
                if (!createdAt || createdAt > fiveMinutesAgo) {
                    validRoom = { id: doc.id, data: data };
                    break;
                }
            }
        }
        
        if (validRoom) {
            // 既存のルームに参加
            await joinRoom(validRoom.id, validRoom.data);
        } else {
            // 新しいルームを作成
            await createRoom();
        }
    } catch (error) {
        console.error('マッチングエラー:', error);
        alert('マッチングに失敗しました: ' + error.message);
        cancelMatching();
    }
}

// ルーム作成
async function createRoom() {
    const roomRef = await window.db.collection('shogiRooms').add({
        status: 'waiting',
        player1: {
            id: gameState.playerId,
            name: gameState.playerName,
            role: null
        },
        player2: null,
        board: null,
        currentPlayer: 'sente',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    gameState.matchId = roomRef.id;
    
    // ルームの変更を監視
    gameState.matchingListener = window.db.collection('shogiRooms').doc(gameState.matchId)
        .onSnapshot((doc) => {
            const data = doc.data();
            if (data && data.status === 'playing') {
                // 対戦開始
                startOnlineGameFromRoom(data);
            }
        });
    
    updateWaitingCount();
}

// ルームに参加
async function joinRoom(roomId, roomData) {
    gameState.matchId = roomId;
    
    // ランダムで先手/後手を決定
    const player1Role = Math.random() < 0.5 ? 'sente' : 'gote';
    const player2Role = player1Role === 'sente' ? 'gote' : 'sente';
    
    // 初期盤面を作成
    const initialBoard = getInitialBoard();
    
    await window.db.collection('shogiRooms').doc(roomId).update({
        status: 'playing',
        'player1.role': player1Role,
        player2: {
            id: gameState.playerId,
            name: gameState.playerName,
            role: player2Role
        },
        board: boardToFlat(initialBoard),
        capturedSente: [],
        capturedGote: [],
        currentPlayer: 'sente',
        moveHistory: [],
        startedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // 更新後のデータを取得
    const updatedDoc = await window.db.collection('shogiRooms').doc(roomId).get();
    startOnlineGameFromRoom(updatedDoc.data());
}

// 待機人数を更新
async function updateWaitingCount() {
    try {
        const snapshot = await window.db.collection('shogiRooms')
            .where('status', '==', 'waiting')
            .get();
        document.getElementById('waiting-count').textContent = 
            `現在 ${snapshot.size} 人が待機中`;
    } catch (error) {
        console.error('待機人数取得エラー:', error);
    }
}

// マッチングキャンセル
async function cancelMatching() {
    if (gameState.matchingListener) {
        gameState.matchingListener();
        gameState.matchingListener = null;
    }
    
    if (gameState.matchId) {
        try {
            await window.db.collection('shogiRooms').doc(gameState.matchId).delete();
        } catch (error) {
            console.error('ルーム削除エラー:', error);
        }
        gameState.matchId = null;
    }
    
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('matching-screen').classList.add('hidden');
}

// オンラインゲーム開始（ルームデータから）
function startOnlineGameFromRoom(roomData) {
    // モーダルを閉じる
    hideModal('online-lobby-modal');
    
    if (gameState.matchingListener) {
        gameState.matchingListener();
        gameState.matchingListener = null;
    }
    
    // 自分の役割を取得
    if (roomData.player1.id === gameState.playerId) {
        gameState.playerRole = roomData.player1.role;
        gameState.opponentName = roomData.player2.name;
    } else {
        gameState.playerRole = roomData.player2.role;
        gameState.opponentName = roomData.player1.name;
    }
    
    gameState.gameMode = 'online';
    gameState.isOnlineGame = true;
    gameState.board = flatToBoard(roomData.board);
    gameState.currentPlayer = roomData.currentPlayer;
    gameState.capturedPieces = { 
        sente: roomData.capturedSente || [], 
        gote: roomData.capturedGote || [] 
    };
    gameState.selectedCell = null;
    gameState.selectedCaptured = null;
    gameState.moveHistory = roomData.moveHistory || [];
    gameState.moveCount = gameState.moveHistory.length;
    gameState.isGameOver = false;
    gameState.lastMove = null;
    gameState.isPlayerTurn = gameState.playerRole === gameState.currentPlayer;
    gameState.inCheck = false;
    gameState.pendingPromotion = null;
    
    // リアルタイム更新をリッスン
    subscribeToGameUpdates();
    
    renderBoard();
    renderCapturedPieces();
    updateDisplay();
    
    // 対戦開始メッセージ
    const roleText = gameState.playerRole === 'sente' ? '先手（☗）' : '後手（☖）';
    alert(`対戦開始！\n\nあなた: ${gameState.playerName}（${roleText}）\n相手: ${gameState.opponentName}`);
}

// 盤面を1次元配列に変換
function boardToFlat(board) {
    return board.flat().map(piece => piece ? { type: piece.type, owner: piece.owner } : null);
}

// 1次元配列を盤面に変換
function flatToBoard(flat) {
    const board = [];
    for (let i = 0; i < 9; i++) {
        board[i] = flat.slice(i * 9, (i + 1) * 9);
    }
    return board;
}

// ゲーム更新をリッスン
function subscribeToGameUpdates() {
    gameState.gameListener = window.db.collection('shogiRooms').doc(gameState.matchId)
        .onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                
                // 相手の手を反映
                if (data.moveHistory && data.moveHistory.length > gameState.moveHistory.length) {
                    gameState.board = flatToBoard(data.board);
                    gameState.currentPlayer = data.currentPlayer;
                    gameState.capturedPieces = {
                        sente: data.capturedSente || [],
                        gote: data.capturedGote || []
                    };
                    gameState.moveHistory = data.moveHistory;
                    gameState.moveCount = data.moveHistory.length;
                    gameState.isPlayerTurn = gameState.playerRole === data.currentPlayer;
                    
                    // 盤面を再描画
                    renderBoard();
                    renderCapturedPieces();
                    updateDisplay();
                }
                
                // ゲーム終了
                if (data.status === 'finished' && !gameState.isGameOver) {
                    gameState.isGameOver = true;
                    showOnlineResult(data.winner);
                }
            }
        });
}

// オンライン対戦結果表示
function showOnlineResult(winner) {
    const isWinner = winner === gameState.playerRole;
    const title = isWinner ? '🎉 勝利！' : '😢 敗北...';
    const message = isWinner 
        ? `${gameState.opponentName}に勝ちました！`
        : `${gameState.opponentName}に負けました`;
    
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').textContent = message;
    document.getElementById('result-move-count').textContent = gameState.moveCount;
    showModal('result-modal');
}

// オンライン手番終了時に更新
async function finishOnlineTurn() {
    try {
        await window.db.collection('shogiRooms').doc(gameState.matchId).update({
            board: boardToFlat(gameState.board),
            currentPlayer: gameState.currentPlayer,
            capturedSente: gameState.capturedPieces.sente,
            capturedGote: gameState.capturedPieces.gote,
            moveHistory: gameState.moveHistory,
            status: gameState.isGameOver ? 'finished' : 'playing',
            winner: gameState.isGameOver ? 
                (gameState.currentPlayer === 'sente' ? 'gote' : 'sente') : null
        });
        gameState.isPlayerTurn = false;
    } catch (error) {
        console.error('Turn update error:', error);
    }
}

// オンラインゲームを離脱
function leaveOnlineGame() {
    if (gameState.gameListener) {
        gameState.gameListener();
        gameState.gameListener = null;
    }
    gameState.isOnlineGame = false;
    gameState.matchId = null;
}
