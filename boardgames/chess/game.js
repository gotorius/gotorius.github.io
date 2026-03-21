// チェス ゲームロジック

// ゲーム状態
let board = [];
let currentPlayer = 'white';
let selectedCell = null;
let validMoves = [];
let gameMode = 'cpu'; // 'cpu', 'local', 'online'
let cpuDifficulty = 'normal';
let gameOver = false;
let moveHistory = [];

// キャスリング・アンパッサン用のフラグ
let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};
let enPassantTarget = null;
let lastMove = null;

// 取られた駒
let capturedPieces = { white: [], black: [] };

// オンライン対戦用
let roomId = null;
let playerId = null;
let playerColor = null;
let playerName = '';
let opponentName = '';
let unsubscribe = null;

// プロモーション用
let pendingPromotion = null;

// 駒の定義
const PIECES = {
    white: {
        king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙'
    },
    black: {
        king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
    }
};

// 駒の価値（CPU評価用）
const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000
};

// 初期配置
const INITIAL_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

// DOM要素
const boardElement = document.getElementById('board');
const modeModal = document.getElementById('mode-modal');
const onlineLobbyModal = document.getElementById('online-lobby-modal');
const promotionModal = document.getElementById('promotion-modal');
const resultModal = document.getElementById('result-modal');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initBoard();
    setupEventListeners();
    // デフォルトでCPU（普通）モードで開始
    gameMode = 'cpu';
    cpuDifficulty = 'normal';
    startNewGame();
    updateModeDisplay();
});

function initBoard() {
    board = INITIAL_BOARD.map(row => row.map(cell => {
        if (!cell) return null;
        const color = cell === cell.toUpperCase() ? 'white' : 'black';
        const pieceType = getPieceType(cell);
        return { type: pieceType, color: color };
    }));
    
    currentPlayer = 'white';
    selectedCell = null;
    validMoves = [];
    gameOver = false;
    moveHistory = [];
    castlingRights = {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    };
    enPassantTarget = null;
    lastMove = null;
    capturedPieces = { white: [], black: [] };
    
    renderBoard();
    updateGameInfo();
}

function getPieceType(char) {
    const types = {
        'k': 'king', 'q': 'queen', 'r': 'rook',
        'b': 'bishop', 'n': 'knight', 'p': 'pawn'
    };
    return types[char.toLowerCase()];
}

function renderBoard() {
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 最後の手をハイライト
            if (lastMove && 
                ((lastMove.from.row === row && lastMove.from.col === col) ||
                 (lastMove.to.row === row && lastMove.to.col === col))) {
                cell.classList.add('last-move');
            }
            
            // 選択中のセル
            if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
                cell.classList.add('selected');
            }
            
            // 有効な移動先
            const isValidMove = validMoves.some(m => m.row === row && m.col === col);
            if (isValidMove) {
                if (board[row][col]) {
                    cell.classList.add('valid-capture');
                } else {
                    cell.classList.add('valid-move');
                }
            }
            
            // 駒を配置
            const piece = board[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${piece.color}`;
                pieceSpan.textContent = PIECES[piece.color][piece.type];
                cell.appendChild(pieceSpan);
                
                // キングがチェックされている場合
                if (piece.type === 'king' && piece.color === currentPlayer && isInCheck(piece.color)) {
                    cell.classList.add('check');
                }
            }
            
            cell.addEventListener('click', () => handleCellClick(row, col));
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(row, col) {
    if (gameOver) return;
    
    // オンライン対戦で自分のターンでない場合
    if (gameMode === 'online' && currentPlayer !== playerColor) return;
    
    // CPU対戦でCPUのターンの場合
    if (gameMode === 'cpu' && currentPlayer === 'black') return;
    
    const clickedPiece = board[row][col];
    
    // 駒が選択済みで、有効な移動先をクリックした場合
    if (selectedCell) {
        const isValidMove = validMoves.some(m => m.row === row && m.col === col);
        
        if (isValidMove) {
            const move = validMoves.find(m => m.row === row && m.col === col);
            
            // プロモーションチェック
            const movingPiece = board[selectedCell.row][selectedCell.col];
            if (movingPiece.type === 'pawn') {
                if ((movingPiece.color === 'white' && row === 0) ||
                    (movingPiece.color === 'black' && row === 7)) {
                    pendingPromotion = {
                        from: { row: selectedCell.row, col: selectedCell.col },
                        to: { row, col },
                        move: move
                    };
                    showPromotionModal(movingPiece.color);
                    return;
                }
            }
            
            executeMove(selectedCell.row, selectedCell.col, row, col, move);
            return;
        }
    }
    
    // 自分の駒をクリックした場合
    if (clickedPiece && clickedPiece.color === currentPlayer) {
        selectedCell = { row, col };
        validMoves = getValidMoves(row, col);
        renderBoard();
    } else {
        // 選択解除
        selectedCell = null;
        validMoves = [];
        renderBoard();
    }
}

function executeMove(fromRow, fromCol, toRow, toCol, moveInfo = null) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // 駒を取った場合
    if (capturedPiece) {
        capturedPieces[piece.color].push(capturedPiece);
    }
    
    // 特殊な動き
    if (moveInfo) {
        // キャスリング
        if (moveInfo.castling) {
            const rookFromCol = moveInfo.castling === 'kingSide' ? 7 : 0;
            const rookToCol = moveInfo.castling === 'kingSide' ? 5 : 3;
            board[fromRow][rookToCol] = board[fromRow][rookFromCol];
            board[fromRow][rookFromCol] = null;
        }
        
        // アンパッサン
        if (moveInfo.enPassant) {
            const capturedPawnRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            capturedPieces[piece.color].push(board[capturedPawnRow][toCol]);
            board[capturedPawnRow][toCol] = null;
        }
    }
    
    // 移動実行
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    // アンパッサンターゲット更新
    if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = { row: (fromRow + toRow) / 2, col: toCol };
    } else {
        enPassantTarget = null;
    }
    
    // キャスリング権限更新
    updateCastlingRights(fromRow, fromCol, piece);
    
    // 最後の手を記録
    lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    
    // 履歴に追加
    moveHistory.push({
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: piece,
        captured: capturedPiece
    });
    
    // 選択解除
    selectedCell = null;
    validMoves = [];
    
    // ターン切り替え
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    renderBoard();
    updateGameInfo();
    updateCapturedPieces();
    
    // ゲーム終了チェック
    const gameResult = checkGameEnd();
    if (gameResult) {
        endGame(gameResult);
        return;
    }
    
    // オンライン対戦の場合、状態を同期
    if (gameMode === 'online' && roomId) {
        syncGameState();
    }
    
    // CPU対戦の場合
    if (gameMode === 'cpu' && currentPlayer === 'black' && !gameOver) {
        setTimeout(cpuMove, 500);
    }
}

function executePromotion(promoteTo) {
    if (!pendingPromotion) return;
    
    const { from, to, move } = pendingPromotion;
    const piece = board[from.row][from.col];
    
    // 移動実行
    board[to.row][to.col] = { type: promoteTo, color: piece.color };
    board[from.row][from.col] = null;
    
    // 最後の手を記録
    lastMove = { from: from, to: to };
    
    enPassantTarget = null;
    selectedCell = null;
    validMoves = [];
    pendingPromotion = null;
    
    // ターン切り替え
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    hidePromotionModal();
    renderBoard();
    updateGameInfo();
    
    // ゲーム終了チェック
    const gameResult = checkGameEnd();
    if (gameResult) {
        endGame(gameResult);
        return;
    }
    
    // オンライン対戦の場合、状態を同期
    if (gameMode === 'online' && roomId) {
        syncGameState();
    }
    
    // CPU対戦の場合
    if (gameMode === 'cpu' && currentPlayer === 'black' && !gameOver) {
        setTimeout(cpuMove, 500);
    }
}

function updateCastlingRights(fromRow, fromCol, piece) {
    if (piece.type === 'king') {
        castlingRights[piece.color].kingSide = false;
        castlingRights[piece.color].queenSide = false;
    } else if (piece.type === 'rook') {
        if (fromCol === 0) {
            castlingRights[piece.color].queenSide = false;
        } else if (fromCol === 7) {
            castlingRights[piece.color].kingSide = false;
        }
    }
}

function getValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    let moves = [];
    
    switch (piece.type) {
        case 'pawn':
            moves = getPawnMoves(row, col, piece.color);
            break;
        case 'knight':
            moves = getKnightMoves(row, col, piece.color);
            break;
        case 'bishop':
            moves = getBishopMoves(row, col, piece.color);
            break;
        case 'rook':
            moves = getRookMoves(row, col, piece.color);
            break;
        case 'queen':
            moves = getQueenMoves(row, col, piece.color);
            break;
        case 'king':
            moves = getKingMoves(row, col, piece.color);
            break;
    }
    
    // チェックを回避できない手を除外
    return moves.filter(move => {
        return !wouldBeInCheck(row, col, move.row, move.col, piece.color);
    });
}

function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // 1マス前進
    if (isValidSquare(row + direction, col) && !board[row + direction][col]) {
        moves.push({ row: row + direction, col: col });
        
        // 2マス前進（初期位置から）
        if (row === startRow && !board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col: col });
        }
    }
    
    // 斜め取り
    for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (target && target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
            
            // アンパッサン
            if (enPassantTarget && enPassantTarget.row === newRow && enPassantTarget.col === newCol) {
                moves.push({ row: newRow, col: newCol, enPassant: true });
            }
        }
    }
    
    return moves;
}

function getKnightMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!target || target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    
    return moves;
}

function getBishopMoves(row, col, color) {
    return getSlidingMoves(row, col, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
}

function getRookMoves(row, col, color) {
    return getSlidingMoves(row, col, color, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
}

function getQueenMoves(row, col, color) {
    return getSlidingMoves(row, col, color, [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ]);
}

function getSlidingMoves(row, col, color, directions) {
    const moves = [];
    
    for (const [dr, dc] of directions) {
        let newRow = row + dr;
        let newCol = col + dc;
        
        while (isValidSquare(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
            newRow += dr;
            newCol += dc;
        }
    }
    
    return moves;
}

function getKingMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol)) {
            const target = board[newRow][newCol];
            if (!target || target.color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    
    // キャスリング
    if (!isInCheck(color)) {
        const kingRow = color === 'white' ? 7 : 0;
        
        // キングサイド
        if (castlingRights[color].kingSide) {
            if (!board[kingRow][5] && !board[kingRow][6]) {
                if (!isSquareAttacked(kingRow, 5, color) && !isSquareAttacked(kingRow, 6, color)) {
                    moves.push({ row: kingRow, col: 6, castling: 'kingSide' });
                }
            }
        }
        
        // クイーンサイド
        if (castlingRights[color].queenSide) {
            if (!board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3]) {
                if (!isSquareAttacked(kingRow, 2, color) && !isSquareAttacked(kingRow, 3, color)) {
                    moves.push({ row: kingRow, col: 2, castling: 'queenSide' });
                }
            }
        }
    }
    
    return moves;
}

function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isInCheck(color) {
    // キングの位置を探す
    let kingPos = null;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'king' && piece.color === color) {
                kingPos = { row, col };
                break;
            }
        }
        if (kingPos) break;
    }
    
    if (!kingPos) return false;
    
    return isSquareAttacked(kingPos.row, kingPos.col, color);
}

function isSquareAttacked(row, col, byColor) {
    const opponentColor = byColor === 'white' ? 'black' : 'white';
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === opponentColor) {
                const attacks = getAttacks(r, c, piece);
                if (attacks.some(a => a.row === row && a.col === col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function getAttacks(row, col, piece) {
    // キングは移動先を攻撃とみなす（キャスリングを除く）
    switch (piece.type) {
        case 'pawn':
            return getPawnAttacks(row, col, piece.color);
        case 'knight':
            return getKnightMoves(row, col, piece.color);
        case 'bishop':
            return getBishopMoves(row, col, piece.color);
        case 'rook':
            return getRookMoves(row, col, piece.color);
        case 'queen':
            return getQueenMoves(row, col, piece.color);
        case 'king':
            return getKingBasicMoves(row, col, piece.color);
        default:
            return [];
    }
}

function getPawnAttacks(row, col, color) {
    const attacks = [];
    const direction = color === 'white' ? -1 : 1;
    
    for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol)) {
            attacks.push({ row: newRow, col: newCol });
        }
    }
    
    return attacks;
}

function getKingBasicMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    
    for (const [dr, dc] of offsets) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol)) {
            moves.push({ row: newRow, col: newCol });
        }
    }
    
    return moves;
}

function wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
    // 仮想的に動かしてチェックを確認
    const originalBoard = board.map(row => [...row]);
    const originalEnPassant = enPassantTarget;
    
    const piece = board[fromRow][fromCol];
    
    // アンパッサンの処理
    if (piece.type === 'pawn' && enPassantTarget && 
        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        const capturedPawnRow = color === 'white' ? toRow + 1 : toRow - 1;
        board[capturedPawnRow][toCol] = null;
    }
    
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    const inCheck = isInCheck(color);
    
    // 元に戻す
    board.length = 0;
    originalBoard.forEach(row => board.push(row));
    enPassantTarget = originalEnPassant;
    
    return inCheck;
}

function checkGameEnd() {
    // 現在のプレイヤーが動けるか確認
    let hasValidMove = false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === currentPlayer) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) {
                    hasValidMove = true;
                    break;
                }
            }
        }
        if (hasValidMove) break;
    }
    
    if (!hasValidMove) {
        if (isInCheck(currentPlayer)) {
            // チェックメイト
            return {
                type: 'checkmate',
                winner: currentPlayer === 'white' ? 'black' : 'white'
            };
        } else {
            // ステイルメイト
            return {
                type: 'stalemate',
                winner: null
            };
        }
    }
    
    // その他の引き分け条件（簡易版）
    // 駒不足による引き分け
    const pieces = getAllPieces();
    if (isInsufficientMaterial(pieces)) {
        return { type: 'insufficient', winner: null };
    }
    
    return null;
}

function getAllPieces() {
    const pieces = { white: [], black: [] };
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                pieces[piece.color].push(piece.type);
            }
        }
    }
    return pieces;
}

function isInsufficientMaterial(pieces) {
    const white = pieces.white;
    const black = pieces.black;
    
    // キングのみ vs キングのみ
    if (white.length === 1 && black.length === 1) return true;
    
    // キング + ビショップ/ナイト vs キング
    if (white.length === 1 && black.length === 2) {
        if (black.includes('bishop') || black.includes('knight')) return true;
    }
    if (black.length === 1 && white.length === 2) {
        if (white.includes('bishop') || white.includes('knight')) return true;
    }
    
    return false;
}

function endGame(result) {
    gameOver = true;
    
    let title = '';
    let message = '';
    
    if (result.type === 'checkmate') {
        const winnerName = result.winner === 'white' ? '白' : '黒';
        title = '🏆 チェックメイト！';
        
        if (gameMode === 'cpu') {
            message = result.winner === 'white' ? 'あなたの勝ちです！' : 'CPUの勝ちです';
        } else if (gameMode === 'online') {
            message = result.winner === playerColor ? 'あなたの勝ちです！' : `${opponentName}の勝ちです`;
        } else {
            message = `${winnerName}の勝ちです！`;
        }
    } else if (result.type === 'stalemate') {
        title = '🤝 ステイルメイト';
        message = '引き分けです';
    } else if (result.type === 'insufficient') {
        title = '🤝 引き分け';
        message = '駒不足により引き分けです';
    }
    
    showResultModal(title, message);
}

// CPU AI
function cpuMove() {
    if (gameOver || currentPlayer !== 'black') return;
    
    let move;
    
    switch (cpuDifficulty) {
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
        // プロモーションチェック
        const piece = board[move.from.row][move.from.col];
        if (piece.type === 'pawn' && move.to.row === 7) {
            // CPUは常にクイーンにプロモーション
            board[move.to.row][move.to.col] = { type: 'queen', color: 'black' };
            board[move.from.row][move.from.col] = null;
            lastMove = { from: move.from, to: move.to };
            selectedCell = null;
            validMoves = [];
            currentPlayer = 'white';
            renderBoard();
            updateGameInfo();
            
            const gameResult = checkGameEnd();
            if (gameResult) {
                endGame(gameResult);
            }
        } else {
            executeMove(move.from.row, move.from.col, move.to.row, move.to.col, move.moveInfo);
        }
    }
}

function getEasyMove() {
    // ランダムな合法手
    const allMoves = getAllMoves('black');
    if (allMoves.length === 0) return null;
    return allMoves[Math.floor(Math.random() * allMoves.length)];
}

function getNormalMove() {
    // 単純な評価：駒を取れるなら取る、そうでなければランダム
    const allMoves = getAllMoves('black');
    if (allMoves.length === 0) return null;
    
    // 駒を取れる手を優先
    const captureMoves = allMoves.filter(m => board[m.to.row][m.to.col]);
    if (captureMoves.length > 0) {
        // 最も価値の高い駒を取る
        captureMoves.sort((a, b) => {
            const aValue = PIECE_VALUES[board[a.to.row][a.to.col].type];
            const bValue = PIECE_VALUES[board[b.to.row][b.to.col].type];
            return bValue - aValue;
        });
        return captureMoves[0];
    }
    
    return allMoves[Math.floor(Math.random() * allMoves.length)];
}

function getHardMove() {
    // ミニマックス法（深さ3）
    const allMoves = getAllMoves('black');
    if (allMoves.length === 0) return null;
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of allMoves) {
        const score = evaluateMove(move, 2, -Infinity, Infinity, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove || allMoves[0];
}

function evaluateMove(move, depth, alpha, beta, isMaximizing) {
    // 仮想的に移動
    const originalBoard = board.map(row => [...row]);
    const originalCastling = JSON.parse(JSON.stringify(castlingRights));
    const originalEnPassant = enPassantTarget;
    
    const piece = board[move.from.row][move.from.col];
    
    // アンパッサン
    if (move.moveInfo && move.moveInfo.enPassant) {
        const capturedPawnRow = piece.color === 'white' ? move.to.row + 1 : move.to.row - 1;
        board[capturedPawnRow][move.to.col] = null;
    }
    
    // キャスリング
    if (move.moveInfo && move.moveInfo.castling) {
        const rookFromCol = move.moveInfo.castling === 'kingSide' ? 7 : 0;
        const rookToCol = move.moveInfo.castling === 'kingSide' ? 5 : 3;
        board[move.from.row][rookToCol] = board[move.from.row][rookFromCol];
        board[move.from.row][rookFromCol] = null;
    }
    
    board[move.to.row][move.to.col] = piece;
    board[move.from.row][move.from.col] = null;
    
    let score;
    
    if (depth === 0) {
        score = evaluateBoard();
    } else {
        const color = isMaximizing ? 'black' : 'white';
        const moves = getAllMoves(color);
        
        if (moves.length === 0) {
            // チェックメイトまたはステイルメイト
            if (isInCheck(color)) {
                score = isMaximizing ? -100000 : 100000;
            } else {
                score = 0;
            }
        } else {
            if (isMaximizing) {
                score = -Infinity;
                for (const m of moves) {
                    score = Math.max(score, evaluateMove(m, depth - 1, alpha, beta, false));
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
            } else {
                score = Infinity;
                for (const m of moves) {
                    score = Math.min(score, evaluateMove(m, depth - 1, alpha, beta, true));
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break;
                }
            }
        }
    }
    
    // 元に戻す
    board.length = 0;
    originalBoard.forEach(row => board.push(row));
    Object.assign(castlingRights, originalCastling);
    enPassantTarget = originalEnPassant;
    
    return score;
}

function evaluateBoard() {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece.type];
                // 位置ボーナス（中央を優先）
                const positionBonus = getPositionBonus(row, col, piece);
                
                if (piece.color === 'black') {
                    score += value + positionBonus;
                } else {
                    score -= value + positionBonus;
                }
            }
        }
    }
    
    return score;
}

function getPositionBonus(row, col, piece) {
    // 中央に近いほどボーナス
    const centerBonus = (3.5 - Math.abs(3.5 - col)) * 5 + (3.5 - Math.abs(3.5 - row)) * 5;
    
    // ポーンは前進するほど良い
    if (piece.type === 'pawn') {
        return piece.color === 'white' ? (6 - row) * 10 : row * 10;
    }
    
    return centerBonus;
}

function getAllMoves(color) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const pieceMoves = getValidMoves(row, col);
                for (const move of pieceMoves) {
                    moves.push({
                        from: { row, col },
                        to: { row: move.row, col: move.col },
                        moveInfo: move
                    });
                }
            }
        }
    }
    
    return moves;
}

// UI更新
function updateGameInfo() {
    const turnText = currentPlayer === 'white' ? '白の番' : '黒の番';
    document.getElementById('current-turn').textContent = turnText;
    
    // ターンインジケーター
    const whitePlayer = document.getElementById('player-white');
    const blackPlayer = document.getElementById('player-black');
    
    whitePlayer.classList.toggle('active', currentPlayer === 'white');
    blackPlayer.classList.toggle('active', currentPlayer === 'black');
    
    // チェック表示
    const checkStatus = document.getElementById('check-status');
    if (isInCheck(currentPlayer)) {
        checkStatus.textContent = 'チェック！';
    } else {
        checkStatus.textContent = '';
    }
}

function updateCapturedPieces() {
    const whiteCaptures = document.getElementById('white-captured');
    const blackCaptures = document.getElementById('black-captured');
    
    whiteCaptures.textContent = capturedPieces.white.map(p => PIECES.black[p.type]).join('');
    blackCaptures.textContent = capturedPieces.black.map(p => PIECES.white[p.type]).join('');
}

// モーダル関連
function showModeModal() {
    modeModal.classList.remove('hidden');
}

function hideModeModal() {
    modeModal.classList.add('hidden');
}

function showPromotionModal(color) {
    // 色に応じて駒の表示を変更
    const buttons = promotionModal.querySelectorAll('.promotion-btn');
    const pieces = color === 'white' ? PIECES.white : PIECES.black;
    
    buttons.forEach(btn => {
        const pieceType = btn.dataset.piece;
        btn.querySelector('.promotion-piece').textContent = pieces[pieceType];
    });
    
    promotionModal.classList.remove('hidden');
}

function hidePromotionModal() {
    promotionModal.classList.add('hidden');
}

function showResultModal(title, message) {
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').textContent = message;
    resultModal.classList.remove('hidden');
}

function hideResultModal() {
    resultModal.classList.add('hidden');
}

function showOnlineLobby() {
    hideModeModal();
    onlineLobbyModal.classList.remove('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('matching-screen').classList.add('hidden');
}

function hideOnlineLobby() {
    onlineLobbyModal.classList.add('hidden');
}

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
            
            if (gameMode === 'online' && roomId) {
                leaveRoom();
            }
            
            if (mode === 'cpu') {
                gameMode = 'cpu';
                cpuDifficulty = difficulty;
                startNewGame();
                updateModeDisplay();
            } else if (mode === 'local') {
                gameMode = 'local';
                startNewGame();
                updateModeDisplay();
            }
        });
    });
    
    // オンライン対戦ボタン
    document.getElementById('online-btn').addEventListener('click', () => {
        gameMode = 'online';
        showOnlineLobby();
    });
    
    // 新しいゲームボタン
    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (gameMode === 'online' && roomId) {
            // オンラインゲーム中は確認
            if (confirm('現在のゲームを終了しますか？')) {
                leaveRoom();
                startNewGame();
            }
        } else {
            startNewGame();
        }
    });
    
    // プロモーション選択
    document.querySelectorAll('.promotion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            executePromotion(btn.dataset.piece);
        });
    });
    
    // 結果モーダル
    document.getElementById('retry-btn').addEventListener('click', () => {
        hideResultModal();
        startNewGame();
    });
    
    document.getElementById('new-game-result-btn').addEventListener('click', () => {
        hideResultModal();
        if (gameMode === 'online' && roomId) {
            leaveRoom();
        }
    });
    
    // オンラインロビー
    document.getElementById('start-matching-btn').addEventListener('click', startMatching);
    document.getElementById('cancel-lobby-btn').addEventListener('click', () => {
        hideOnlineLobby();
    });
    document.getElementById('cancel-matching-btn').addEventListener('click', cancelMatching);
}

function startNewGame() {
    initBoard();
    
    if (gameMode === 'cpu') {
        document.getElementById('white-name').textContent = 'あなた';
        document.getElementById('black-name').textContent = 'CPU';
    } else if (gameMode === 'local') {
        document.getElementById('white-name').textContent = '白';
        document.getElementById('black-name').textContent = '黒';
    }
}

function updateModeDisplay() {
    const modeDisplay = document.getElementById('game-mode');
    
    if (gameMode === 'cpu') {
        const diffNames = { easy: 'よわい', normal: 'ふつう', hard: 'つよい' };
        modeDisplay.textContent = `CPU対戦（${diffNames[cpuDifficulty]}）`;
    } else if (gameMode === 'local') {
        modeDisplay.textContent = 'ローカル対戦';
    } else if (gameMode === 'online') {
        modeDisplay.textContent = 'オンライン対戦';
    }
}

// オンライン対戦
async function startMatching() {
    const nameInput = document.getElementById('player-name-input');
    playerName = nameInput.value.trim() || 'プレイヤー';
    
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('matching-screen').classList.remove('hidden');
    
    try {
        // 待機中のルームを探す
        const snapshot = await db.collection('chessRooms')
            .where('status', '==', 'waiting')
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            // 既存のルームに参加
            const doc = snapshot.docs[0];
            await joinRoom(doc.id, doc.data());
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
    const roomRef = await db.collection('chessRooms').add({
        status: 'waiting',
        whitePlayer: { name: playerName, id: generatePlayerId() },
        blackPlayer: null,
        board: boardToString(),
        currentPlayer: 'white',
        castlingRights: castlingRights,
        enPassantTarget: enPassantTarget,
        lastMove: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    roomId = roomRef.id;
    playerId = roomRef.id + '_white';
    playerColor = 'white';
    
    // ルームの変更を監視
    unsubscribe = db.collection('chessRooms').doc(roomId).onSnapshot(handleRoomUpdate);
}

async function joinRoom(id, roomData) {
    roomId = id;
    playerId = id + '_black';
    playerColor = 'black';
    opponentName = roomData.whitePlayer.name;
    
    await db.collection('chessRooms').doc(roomId).update({
        status: 'playing',
        blackPlayer: { name: playerName, id: generatePlayerId() }
    });
    
    // ゲーム開始
    hideOnlineLobby();
    startOnlineGame();
    
    // ルームの変更を監視
    unsubscribe = db.collection('chessRooms').doc(roomId).onSnapshot(handleRoomUpdate);
}

function handleRoomUpdate(doc) {
    if (!doc.exists) {
        alert('対戦相手が退出しました');
        leaveRoom();
        showModeModal();
        return;
    }
    
    const data = doc.data();
    
    if (data.status === 'playing' && playerColor === 'white' && !opponentName) {
        // 対戦相手が参加
        opponentName = data.blackPlayer.name;
        hideOnlineLobby();
        startOnlineGame();
    }
    
    // 盤面を同期
    if (data.board) {
        stringToBoard(data.board);
        currentPlayer = data.currentPlayer;
        castlingRights = data.castlingRights || {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        enPassantTarget = data.enPassantTarget;
        lastMove = data.lastMove;
        
        renderBoard();
        updateGameInfo();
        
        // ゲーム終了チェック
        if (!gameOver) {
            const gameResult = checkGameEnd();
            if (gameResult) {
                endGame(gameResult);
            }
        }
    }
}

function startOnlineGame() {
    initBoard();
    gameMode = 'online';
    updateModeDisplay();
    
    document.getElementById('white-name').textContent = playerColor === 'white' ? playerName : opponentName;
    document.getElementById('black-name').textContent = playerColor === 'black' ? playerName : opponentName;
}

async function syncGameState() {
    if (!roomId) return;
    
    try {
        await db.collection('chessRooms').doc(roomId).update({
            board: boardToString(),
            currentPlayer: currentPlayer,
            castlingRights: castlingRights,
            enPassantTarget: enPassantTarget,
            lastMove: lastMove
        });
    } catch (error) {
        console.error('同期エラー:', error);
    }
}

function cancelMatching() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    
    if (roomId) {
        db.collection('chessRooms').doc(roomId).delete().catch(() => {});
        roomId = null;
    }
    
    document.getElementById('matching-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
}

async function leaveRoom() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    
    if (roomId) {
        try {
            await db.collection('chessRooms').doc(roomId).delete();
        } catch (error) {
            console.error('ルーム削除エラー:', error);
        }
        roomId = null;
    }
    
    playerColor = null;
    opponentName = '';
}

// ユーティリティ
function generatePlayerId() {
    return Math.random().toString(36).substring(2, 15);
}

function boardToString() {
    return board.map(row => 
        row.map(cell => {
            if (!cell) return '.';
            const pieceChars = { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' };
            const char = pieceChars[cell.type];
            return cell.color === 'white' ? char.toUpperCase() : char;
        }).join('')
    ).join('/');
}

function stringToBoard(str) {
    const rows = str.split('/');
    board = rows.map(row => 
        row.split('').map(char => {
            if (char === '.') return null;
            const color = char === char.toUpperCase() ? 'white' : 'black';
            const pieceType = getPieceType(char);
            return { type: pieceType, color: color };
        })
    );
}
