/**
 * オセロ - JavaScript ゲームロジック
 */

class OthelloGame {
    constructor() {
        // 定数
        this.EMPTY = 0;
        this.BLACK = 1;
        this.WHITE = 2;
        
        // 方向（8方向）
        this.DIRECTIONS = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // ゲーム状態
        this.board = [];
        this.currentPlayer = this.BLACK;
        this.gameMode = 'cpu'; // 'cpu', 'pvp', 'online'
        this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
        this.history = [];
        this.lastMove = null;
        this.isGameOver = false;
        this.isThinking = false;
        
        // オンライン対戦状態
        this.onlineRoomId = null;
        this.playerId = null;
        this.playerName = '';
        this.opponentName = '';
        this.myColor = null; // BLACK or WHITE
        this.roomListener = null;
        this.matchingListener = null;
        
        // DOM要素
        this.boardElement = document.getElementById('board');
        this.resultModal = document.getElementById('result-modal');
        this.passModal = document.getElementById('pass-modal');
        this.onlineLobbyModal = document.getElementById('online-lobby-modal');
        this.onlineResultModal = document.getElementById('online-result-modal');
        
        // 初期化
        this.initEventListeners();
        // デフォルトでCPU（普通）モードで開始
        this.startGame('cpu', 'normal');
    }
    
    // 2次元配列を1次元配列に変換（Firestore保存用）
    boardToFlat(board) {
        return board.flat();
    }
    
    // 1次元配列を2次元配列に変換（Firestore読み込み用）
    flatToBoard(flat) {
        const board = [];
        for (let i = 0; i < 8; i++) {
            board.push(flat.slice(i * 8, (i + 1) * 8));
        }
        return board;
    }
    
    initEventListeners() {
        // 新しいゲームボタン
        document.getElementById('new-game-btn').addEventListener('click', () => {
            if (this.gameMode === 'online') {
                this.leaveOnlineGame();
            }
            this.startGame(this.gameMode, this.difficulty);
        });
        
        // 元に戻すボタン
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });
        

        
        // オンライン対戦ボタン
        document.getElementById('online-btn').addEventListener('click', () => {
            this.showOnlineLobby();
        });
        
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
                const button = e.currentTarget;
                const mode = button.dataset.mode;
                const difficulty = button.dataset.difficulty;
                
                modeDropdown.classList.remove('show');
                
                if (this.gameMode === 'online') {
                    this.leaveOnlineGame();
                }
                this.startGame(mode, difficulty);
            });
        });
        
        // もう一度プレイボタン
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.resultModal.classList.add('hidden');
            this.startGame(this.gameMode, this.difficulty);
        });
        
        // モード変更ボタン
        document.getElementById('change-mode-btn').addEventListener('click', () => {
            this.resultModal.classList.add('hidden');
        });
        
        // パスOKボタン
        document.getElementById('pass-ok-btn').addEventListener('click', () => {
            this.passModal.classList.add('hidden');
            this.handlePassComplete();
        });
        
        // オンラインロビー関連
        document.getElementById('start-matching-btn').addEventListener('click', () => {
            this.startMatching();
        });
        
        document.getElementById('cancel-matching-btn').addEventListener('click', () => {
            this.cancelMatching();
        });
        
        document.getElementById('close-lobby-btn').addEventListener('click', () => {
            this.closeLobby();
        });
        
        document.getElementById('leave-online-btn').addEventListener('click', () => {
            this.leaveOnlineGame();
        });
        
        // オンライン結果モーダル
        document.getElementById('online-play-again-btn').addEventListener('click', () => {
            this.onlineResultModal.classList.add('hidden');
            this.showOnlineLobby();
        });
        
        document.getElementById('online-back-btn').addEventListener('click', () => {
            this.onlineResultModal.classList.add('hidden');
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.key === 'Escape') {
                this.passModal.classList.add('hidden');
                this.resultModal.classList.add('hidden');
            }
        });
    }
    
    startGame(mode, difficulty = 'normal') {
        this.gameMode = mode;
        this.difficulty = difficulty;
        this.resultModal.classList.add('hidden');
        
        // ボードを初期化
        this.initBoard();
        
        // ゲーム状態をリセット
        this.currentPlayer = this.BLACK;
        this.history = [];
        this.lastMove = null;
        this.isGameOver = false;
        this.isThinking = false;
        
        // UI更新
        this.updateModeDisplay();
        this.render();
        this.updateUI();
    }
    
    initBoard() {
        // 8x8の空のボードを作成
        this.board = Array(8).fill(null).map(() => Array(8).fill(this.EMPTY));
        
        // 初期配置（中央に4つの石）
        this.board[3][3] = this.WHITE;
        this.board[3][4] = this.BLACK;
        this.board[4][3] = this.BLACK;
        this.board[4][4] = this.WHITE;
    }
    
    render() {
        this.boardElement.innerHTML = '';
        
        const validMoves = this.getValidMoves(this.currentPlayer);
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // 石がある場合
                if (this.board[row][col] !== this.EMPTY) {
                    const disc = document.createElement('div');
                    disc.className = `disc ${this.board[row][col] === this.BLACK ? 'black' : 'white'}`;
                    cell.appendChild(disc);
                }
                
                // 有効な手の表示
                const isValidMove = validMoves.some(m => m.row === row && m.col === col);
                if (isValidMove && !this.isThinking) {
                    cell.classList.add('valid-move');
                }
                
                // 最後の手をハイライト
                if (this.lastMove && this.lastMove.row === row && this.lastMove.col === col) {
                    cell.classList.add('last-move');
                }
                
                // クリックイベント
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                
                this.boardElement.appendChild(cell);
            }
        }
    }
    
    handleCellClick(row, col) {
        // ゲームオーバーまたはCPUの思考中は無視
        if (this.isGameOver || this.isThinking) return;
        
        // CPUの番なら無視
        if (this.gameMode === 'cpu' && this.currentPlayer === this.WHITE) return;
        
        // オンラインモードで自分の番でない場合は無視
        if (this.gameMode === 'online' && this.currentPlayer !== this.myColor) return;
        
        // 有効な手かチェック
        const validMoves = this.getValidMoves(this.currentPlayer);
        const move = validMoves.find(m => m.row === row && m.col === col);
        
        if (!move) return;
        
        // 手を実行
        this.makeMove(row, col);
        
        // オンラインモードなら相手に送信
        if (this.gameMode === 'online') {
            this.sendMove(row, col);
        }
    }
    
    makeMove(row, col, isUndo = false) {
        const flippedDiscs = this.getFlippedDiscs(row, col, this.currentPlayer);
        
        if (flippedDiscs.length === 0) return false;
        
        // 履歴に保存
        if (!isUndo) {
            this.history.push({
                board: this.board.map(r => [...r]),
                currentPlayer: this.currentPlayer,
                lastMove: this.lastMove
            });
        }
        
        // 現在のプレイヤーを保存（アニメーション用）
        const playerColor = this.currentPlayer;
        
        // 石を置く
        this.board[row][col] = playerColor;
        this.lastMove = { row, col };
        
        // 石をひっくり返す（ボード状態を先に更新）
        for (const disc of flippedDiscs) {
            this.board[disc.row][disc.col] = playerColor;
        }
        
        // プレイヤー交代（renderの前に交代して、次のプレイヤーの有効な手を表示）
        this.switchPlayer();
        
        // UI更新（正しいボード状態で描画）
        this.render();
        
        // ひっくり返すアニメーションを実行
        this.animateFlipDiscs(flippedDiscs, playerColor);
        
        // UI更新
        this.updateUI();
        
        // ゲーム終了チェック
        if (this.checkGameOver()) {
            return true;
        }
        
        // 次のプレイヤーが打てるかチェック
        this.checkPass();
        
        return true;
    }
    
    animateFlipDiscs(discs, playerColor) {
        // アニメーション用のディレイ
        discs.forEach((disc, index) => {
            const cell = this.boardElement.querySelector(`[data-row="${disc.row}"][data-col="${disc.col}"]`);
            if (cell) {
                const discEl = cell.querySelector('.disc');
                if (discEl) {
                    setTimeout(() => {
                        discEl.classList.add('flipping');
                    }, index * 50);
                }
            }
        });
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === this.BLACK ? this.WHITE : this.BLACK;
    }
    
    checkPass() {
        // オンラインモードの場合は別処理
        if (this.gameMode === 'online') {
            this.checkOnlinePass();
            return;
        }
        
        const validMoves = this.getValidMoves(this.currentPlayer);
        
        if (validMoves.length === 0) {
            // 相手も打てない場合はゲーム終了
            const opponentMoves = this.getValidMoves(
                this.currentPlayer === this.BLACK ? this.WHITE : this.BLACK
            );
            
            if (opponentMoves.length === 0) {
                this.endGame();
                return;
            }
            
            // パスを表示
            this.showPassModal();
        } else {
            // CPUの番ならCPUを動かす
            if (this.gameMode === 'cpu' && this.currentPlayer === this.WHITE) {
                this.makeCPUMove();
            }
        }
    }
    
    showPassModal() {
        const playerName = this.currentPlayer === this.BLACK ? '黒' : '白';
        document.getElementById('pass-title').textContent = `⚠️ ${playerName}はパス`;
        document.getElementById('pass-message').textContent = `${playerName}は置ける場所がありません。`;
        this.passModal.classList.remove('hidden');
    }
    
    getValidMoves(player) {
        const validMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === this.EMPTY) {
                    const flipped = this.getFlippedDiscs(row, col, player);
                    if (flipped.length > 0) {
                        validMoves.push({ row, col, flipped: flipped.length });
                    }
                }
            }
        }
        
        return validMoves;
    }
    
    getFlippedDiscs(row, col, player) {
        if (this.board[row][col] !== this.EMPTY) return [];
        
        const opponent = player === this.BLACK ? this.WHITE : this.BLACK;
        const flipped = [];
        
        for (const [dr, dc] of this.DIRECTIONS) {
            const line = [];
            let r = row + dr;
            let c = col + dc;
            
            // 相手の石をたどる
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === opponent) {
                line.push({ row: r, col: c });
                r += dr;
                c += dc;
            }
            
            // 自分の石で終わっていれば有効
            if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && this.board[r][c] === player) {
                flipped.push(...line);
            }
        }
        
        return flipped;
    }
    
    checkGameOver() {
        const blackMoves = this.getValidMoves(this.BLACK);
        const whiteMoves = this.getValidMoves(this.WHITE);
        
        if (blackMoves.length === 0 && whiteMoves.length === 0) {
            this.endGame();
            return true;
        }
        
        // ボードが埋まっているかチェック
        let emptyCount = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === this.EMPTY) emptyCount++;
            }
        }
        
        if (emptyCount === 0) {
            this.endGame();
            return true;
        }
        
        return false;
    }
    
    endGame() {
        this.isGameOver = true;
        const { black, white } = this.countDiscs();
        
        // 結果を表示
        let title, titleClass, message;
        
        if (this.gameMode === 'pvp') {
            if (black > white) {
                title = '⚫ 黒の勝ち！';
                titleClass = 'win';
                message = '黒プレイヤーの勝利です！';
            } else if (white > black) {
                title = '⚪ 白の勝ち！';
                titleClass = 'win';
                message = '白プレイヤーの勝利です！';
            } else {
                title = '🤝 引き分け！';
                titleClass = 'draw';
                message = '両者同数で引き分けです。';
            }
        } else {
            if (black > white) {
                title = '🎉 勝利！';
                titleClass = 'win';
                message = 'おめでとうございます！CPUに勝ちました！';
            } else if (white > black) {
                title = '😢 敗北...';
                titleClass = 'lose';
                message = '残念！また挑戦してみてください。';
            } else {
                title = '🤝 引き分け！';
                titleClass = 'draw';
                message = '接戦でした！';
            }
        }
        
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-title').className = titleClass;
        document.getElementById('result-black').textContent = black;
        document.getElementById('result-white').textContent = white;
        document.getElementById('result-message').textContent = message;
        
        setTimeout(() => {
            this.resultModal.classList.remove('hidden');
        }, 500);
    }
    
    countDiscs() {
        let black = 0;
        let white = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === this.BLACK) black++;
                else if (this.board[row][col] === this.WHITE) white++;
            }
        }
        
        return { black, white };
    }
    
    updateUI() {
        const { black, white } = this.countDiscs();
        
        document.getElementById('black-count').textContent = black;
        document.getElementById('white-count').textContent = white;
        
        // ターン表示
        const turnText = this.currentPlayer === this.BLACK ? '黒の番です' : '白の番です';
        document.getElementById('current-turn').textContent = turnText;
        
        // プレイヤーインジケーター
        const blackPlayer = document.querySelector('.black-player');
        const whitePlayer = document.querySelector('.white-player');
        
        blackPlayer.classList.toggle('active', this.currentPlayer === this.BLACK);
        whitePlayer.classList.toggle('active', this.currentPlayer === this.WHITE);
        
        // 元に戻すボタン
        const undoBtn = document.getElementById('undo-btn');
        if (this.gameMode === 'cpu') {
            // CPU戦では2手以上の履歴があれば有効
            undoBtn.disabled = this.history.length < 2 || this.isThinking;
        } else {
            undoBtn.disabled = this.history.length === 0;
        }
    }
    
    updateModeDisplay() {
        let modeText;
        if (this.gameMode === 'pvp') {
            modeText = '2人対戦';
        } else if (this.gameMode === 'online') {
            modeText = 'オンライン対戦';
        } else {
            modeText = `VS CPU（${this.getDifficultyText()}）`;
        }
        document.getElementById('game-mode').textContent = modeText;
        
        let whiteName;
        if (this.gameMode === 'pvp') {
            whiteName = '白（プレイヤー2）';
        } else if (this.gameMode === 'online') {
            whiteName = this.myColor === this.WHITE ? `白（${this.playerName}）` : `白（${this.opponentName}）`;
        } else {
            whiteName = '白（CPU）';
        }
        document.getElementById('white-player-name').textContent = whiteName;
    }
    
    getDifficultyText() {
        switch (this.difficulty) {
            case 'easy': return 'かんたん';
            case 'normal': return 'ふつう';
            case 'hard': return 'むずかしい';
            default: return 'ふつう';
        }
    }
    
    // 元に戻す
    undo() {
        if (this.history.length === 0 || this.isThinking) return;
        
        // オンラインモードでは元に戻せない
        if (this.gameMode === 'online') return;
        
        if (this.gameMode === 'cpu') {
            // CPU戦では自分とCPUの両方の手を戻す
            if (this.history.length >= 2) {
                this.history.pop(); // CPUの手
                const state = this.history.pop(); // 自分の手
                this.restoreState(state);
            }
        } else {
            const state = this.history.pop();
            this.restoreState(state);
        }
    }
    
    restoreState(state) {
        this.board = state.board.map(r => [...r]);
        this.currentPlayer = state.currentPlayer;
        this.lastMove = state.lastMove;
        this.isGameOver = false;
        
        this.render();
        this.updateUI();
    }
    
    // ヒント表示
    showHint() {
        if (this.isGameOver || this.isThinking) return;
        if (this.gameMode === 'cpu' && this.currentPlayer === this.WHITE) return;
        if (this.gameMode === 'online' && this.currentPlayer !== this.myColor) return;
        
        // 既存のヒントをクリア
        document.querySelectorAll('.cell.hint-cell').forEach(cell => {
            cell.classList.remove('hint-cell');
        });
        
        const validMoves = this.getValidMoves(this.currentPlayer);
        if (validMoves.length === 0) return;
        
        // 最も多くひっくり返せる手を見つける
        const bestMove = this.findBestMoveForHint(validMoves);
        
        if (bestMove) {
            const cell = this.boardElement.querySelector(
                `[data-row="${bestMove.row}"][data-col="${bestMove.col}"]`
            );
            if (cell) {
                cell.classList.add('hint-cell');
                
                // 3秒後に解除
                setTimeout(() => {
                    cell.classList.remove('hint-cell');
                }, 3000);
            }
        }
    }
    
    findBestMoveForHint(validMoves) {
        // 角を優先
        const corners = validMoves.filter(m => 
            (m.row === 0 || m.row === 7) && (m.col === 0 || m.col === 7)
        );
        if (corners.length > 0) {
            return corners.reduce((best, move) => move.flipped > best.flipped ? move : best);
        }
        
        // 端を優先
        const edges = validMoves.filter(m =>
            m.row === 0 || m.row === 7 || m.col === 0 || m.col === 7
        );
        if (edges.length > 0) {
            return edges.reduce((best, move) => move.flipped > best.flipped ? move : best);
        }
        
        // 最も多くひっくり返せる手
        return validMoves.reduce((best, move) => move.flipped > best.flipped ? move : best);
    }
    
    // ===================
    // CPU AI
    // ===================
    
    makeCPUMove() {
        this.isThinking = true;
        this.showThinkingIndicator();
        
        // 思考時間をシミュレート
        const thinkingTime = this.difficulty === 'easy' ? 500 : 
                            this.difficulty === 'normal' ? 800 : 1200;
        
        setTimeout(() => {
            const move = this.selectCPUMove();
            this.hideThinkingIndicator();
            this.isThinking = false;
            
            if (move) {
                this.makeMove(move.row, move.col);
            }
        }, thinkingTime);
    }
    
    selectCPUMove() {
        const validMoves = this.getValidMoves(this.WHITE);
        if (validMoves.length === 0) return null;
        
        switch (this.difficulty) {
            case 'easy':
                return this.selectEasyMove(validMoves);
            case 'normal':
                return this.selectNormalMove(validMoves);
            case 'hard':
                return this.selectHardMove(validMoves);
            default:
                return this.selectNormalMove(validMoves);
        }
    }
    
    // 簡単：ランダム（たまに良い手を打つ）
    selectEasyMove(validMoves) {
        // 30%の確率で良い手を打つ
        if (Math.random() < 0.3) {
            return this.selectNormalMove(validMoves);
        }
        // ランダム
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    
    // 普通：簡単な評価関数を使用
    selectNormalMove(validMoves) {
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of validMoves) {
            const score = this.evaluateMove(move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    // 難しい：ミニマックス法を使用
    selectHardMove(validMoves) {
        let bestMove = null;
        let bestScore = -Infinity;
        const depth = 4;
        
        for (const move of validMoves) {
            // 仮に手を打つ
            const boardCopy = this.board.map(r => [...r]);
            this.simulateMove(boardCopy, move.row, move.col, this.WHITE);
            
            // ミニマックスで評価
            const score = this.minimax(boardCopy, depth - 1, false, -Infinity, Infinity);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    // 手の評価（簡易版）
    evaluateMove(move) {
        let score = move.flipped * 2;
        
        // 角は最高評価
        if ((move.row === 0 || move.row === 7) && (move.col === 0 || move.col === 7)) {
            score += 100;
        }
        // 角の隣は危険
        else if (this.isNextToCorner(move.row, move.col)) {
            score -= 50;
        }
        // 端は良い
        else if (move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7) {
            score += 20;
        }
        
        return score;
    }
    
    isNextToCorner(row, col) {
        const dangerous = [
            [0, 1], [1, 0], [1, 1],
            [0, 6], [1, 6], [1, 7],
            [6, 0], [6, 1], [7, 1],
            [6, 6], [6, 7], [7, 6]
        ];
        return dangerous.some(([r, c]) => r === row && c === col);
    }
    
    // ミニマックス法
    minimax(board, depth, isMaximizing, alpha, beta) {
        if (depth === 0) {
            return this.evaluateBoard(board);
        }
        
        const player = isMaximizing ? this.WHITE : this.BLACK;
        const validMoves = this.getValidMovesForBoard(board, player);
        
        if (validMoves.length === 0) {
            // パスの場合
            const opponent = player === this.WHITE ? this.BLACK : this.WHITE;
            const opponentMoves = this.getValidMovesForBoard(board, opponent);
            
            if (opponentMoves.length === 0) {
                // 両者パスならゲーム終了
                return this.evaluateBoard(board);
            }
            
            return this.minimax(board, depth - 1, !isMaximizing, alpha, beta);
        }
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of validMoves) {
                const boardCopy = board.map(r => [...r]);
                this.simulateMove(boardCopy, move.row, move.col, this.WHITE);
                const score = this.minimax(boardCopy, depth - 1, false, alpha, beta);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const move of validMoves) {
                const boardCopy = board.map(r => [...r]);
                this.simulateMove(boardCopy, move.row, move.col, this.BLACK);
                const score = this.minimax(boardCopy, depth - 1, true, alpha, beta);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }
    
    // ボード評価関数
    evaluateBoard(board) {
        // 位置の重み付け
        const weights = [
            [100, -20, 10, 5, 5, 10, -20, 100],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [10, -2, 5, 1, 1, 5, -2, 10],
            [5, -2, 1, 0, 0, 1, -2, 5],
            [5, -2, 1, 0, 0, 1, -2, 5],
            [10, -2, 5, 1, 1, 5, -2, 10],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [100, -20, 10, 5, 5, 10, -20, 100]
        ];
        
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === this.WHITE) {
                    score += weights[row][col];
                } else if (board[row][col] === this.BLACK) {
                    score -= weights[row][col];
                }
            }
        }
        
        return score;
    }
    
    // シミュレーション用の手を実行
    simulateMove(board, row, col, player) {
        const opponent = player === this.WHITE ? this.BLACK : this.WHITE;
        board[row][col] = player;
        
        for (const [dr, dc] of this.DIRECTIONS) {
            const line = [];
            let r = row + dr;
            let c = col + dc;
            
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
                line.push({ row: r, col: c });
                r += dr;
                c += dc;
            }
            
            if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === player) {
                for (const pos of line) {
                    board[pos.row][pos.col] = player;
                }
            }
        }
    }
    
    // ボード用の有効な手を取得
    getValidMovesForBoard(board, player) {
        const validMoves = [];
        const opponent = player === this.WHITE ? this.BLACK : this.WHITE;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === this.EMPTY) {
                    let isValid = false;
                    
                    for (const [dr, dc] of this.DIRECTIONS) {
                        const line = [];
                        let r = row + dr;
                        let c = col + dc;
                        
                        while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
                            line.push({ row: r, col: c });
                            r += dr;
                            c += dc;
                        }
                        
                        if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === player) {
                            isValid = true;
                            break;
                        }
                    }
                    
                    if (isValid) {
                        validMoves.push({ row, col });
                    }
                }
            }
        }
        
        return validMoves;
    }
    
    // 思考中インジケーター
    showThinkingIndicator() {
        let indicator = document.querySelector('.thinking-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'thinking-indicator';
            indicator.innerHTML = `
                <div class="thinking-spinner"></div>
                <div class="thinking-text">CPUが考えています...</div>
            `;
            document.querySelector('.board-container').appendChild(indicator);
        }
        indicator.classList.remove('hidden');
    }
    
    hideThinkingIndicator() {
        const indicator = document.querySelector('.thinking-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }
    
    // ========================================
    // オンライン対戦機能
    // ========================================
    
    showOnlineLobby() {
        this.onlineLobbyModal.classList.remove('hidden');
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('matching-screen').classList.add('hidden');
        
        // 保存された名前を復元
        const savedName = localStorage.getItem('othelloPlayerName') || '';
        document.getElementById('online-name').value = savedName;
    }
    
    closeLobby() {
        if (this.matchingListener) {
            this.cancelMatching();
        }
        this.onlineLobbyModal.classList.add('hidden');
    }
    
    async startMatching() {
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
            
            // db が存在するか確認
            if (!window.db) {
                throw new Error('Firestore database not initialized');
            }
        } catch (error) {
            console.error('Firebase 初期化エラー:', error);
            alert('Firebase の初期化に失敗しました。\n\nページをリロードしてください。\n\nエラー: ' + error.message);
            return;
        }
        
        // 名前を保存
        localStorage.setItem('othelloPlayerName', playerName);
        this.playerName = playerName;
        
        // 画面切り替え
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('matching-screen').classList.remove('hidden');
        
        // プレイヤーID生成
        this.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        try {
            console.log('Firestore query starting...');
            console.log('window.db:', window.db);
            
            // 待機中のルームを探す
            const waitingRooms = await window.db.collection('othelloRooms')
                .where('status', '==', 'waiting')
                .limit(1)
                .get();
            
            if (!waitingRooms.empty) {
                // 既存のルームに参加
                const roomDoc = waitingRooms.docs[0];
                await this.joinRoom(roomDoc.id, roomDoc.data());
            } else {
                // 新しいルームを作成
                await this.createRoom();
            }
        } catch (error) {
            console.error('マッチングエラー:', error);
            console.error('エラーコード:', error.code);
            console.error('エラーメッセージ:', error.message);
            
            let errorMsg = 'マッチングに失敗しました。\n\n';
            if (error.code === 'permission-denied') {
                errorMsg += 'Firebaseのセキュリティルールを確認してください。\n';
                errorMsg += 'Firestore Database → ルール で以下を設定:\n';
                errorMsg += 'allow create, read, update, delete: if true;';
            } else {
                errorMsg += 'エラー: ' + error.message;
            }
            
            alert(errorMsg);
            this.cancelMatching();
        }
    }
    
    async createRoom() {
        const roomRef = await window.db.collection('othelloRooms').add({
            status: 'waiting',
            player1: {
                id: this.playerId,
                name: this.playerName,
                color: null
            },
            player2: null,
            board: null,
            currentPlayer: this.BLACK,
            lastMove: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        this.onlineRoomId = roomRef.id;
        
        // ルームの変更を監視
        this.matchingListener = window.db.collection('othelloRooms').doc(this.onlineRoomId)
            .onSnapshot((doc) => {
                const data = doc.data();
                if (data && data.status === 'playing') {
                    // 対戦開始
                    this.startOnlineGame(data);
                }
            });
        
        this.updateWaitingCount();
    }
    
    async joinRoom(roomId, roomData) {
        this.onlineRoomId = roomId;
        
        // ランダムで色を決定
        const player1Color = Math.random() < 0.5 ? this.BLACK : this.WHITE;
        const player2Color = player1Color === this.BLACK ? this.WHITE : this.BLACK;
        
        // 初期ボードを作成
        const initialBoard = Array(8).fill(null).map(() => Array(8).fill(this.EMPTY));
        initialBoard[3][3] = this.WHITE;
        initialBoard[3][4] = this.BLACK;
        initialBoard[4][3] = this.BLACK;
        initialBoard[4][4] = this.WHITE;
        
        await window.db.collection('othelloRooms').doc(roomId).update({
            status: 'playing',
            'player1.color': player1Color,
            player2: {
                id: this.playerId,
                name: this.playerName,
                color: player2Color
            },
            board: this.boardToFlat(initialBoard),
            currentPlayer: this.BLACK,
            startedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 更新後のデータを取得
        const updatedDoc = await window.db.collection('othelloRooms').doc(roomId).get();
        this.startOnlineGame(updatedDoc.data());
    }
    
    async updateWaitingCount() {
        try {
            const snapshot = await window.db.collection('othelloRooms')
                .where('status', '==', 'waiting')
                .get();
            document.getElementById('waiting-count').textContent = 
                `現在 ${snapshot.size} 人が待機中`;
        } catch (error) {
            console.error('待機人数取得エラー:', error);
        }
    }
    
    async cancelMatching() {
        if (this.matchingListener) {
            this.matchingListener();
            this.matchingListener = null;
        }
        
        if (this.onlineRoomId) {
            try {
                await window.db.collection('othelloRooms').doc(this.onlineRoomId).delete();
            } catch (error) {
                console.error('ルーム削除エラー:', error);
            }
            this.onlineRoomId = null;
        }
        
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('matching-screen').classList.add('hidden');
    }
    
    startOnlineGame(roomData) {
        // モーダルを閉じる
        this.onlineLobbyModal.classList.add('hidden');
        
        if (this.matchingListener) {
            this.matchingListener();
            this.matchingListener = null;
        }
        
        // 自分の色を取得
        if (roomData.player1.id === this.playerId) {
            this.myColor = roomData.player1.color;
            this.opponentName = roomData.player2.name;
        } else {
            this.myColor = roomData.player2.color;
            this.opponentName = roomData.player1.name;
        }
        
        // ゲームモード設定
        this.gameMode = 'online';
        // 1次元配列から2次元配列に変換
        this.board = this.flatToBoard(roomData.board);
        this.currentPlayer = roomData.currentPlayer;
        this.lastMove = roomData.lastMove;
        this.history = [];
        this.isGameOver = false;
        this.isThinking = false;
        
        // オンラインステータスバーを表示
        this.showOnlineStatus();
        
        // UI更新
        this.modeModal.classList.add('hidden');
        this.updateModeDisplay();
        this.render();
        this.updateUI();
        this.updateOnlineUI();
        
        // ルームの変更を監視
        this.roomListener = window.db.collection('othelloRooms').doc(this.onlineRoomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    this.handleRoomUpdate(doc.data());
                } else {
                    // ルームが削除された（相手が退出）
                    this.handleOpponentLeft();
                }
            });
    }
    
    showOnlineStatus() {
        const statusBar = document.getElementById('online-status');
        statusBar.classList.remove('hidden');
        document.body.classList.add('online-active');
        
        // 自分の情報
        document.getElementById('my-online-name').textContent = this.playerName;
        const myDiscEl = document.getElementById('my-disc-color');
        myDiscEl.className = `online-player-disc ${this.myColor === this.BLACK ? 'black' : 'white'}`;
        
        // 相手の情報
        document.getElementById('opponent-online-name').textContent = this.opponentName;
        const oppDiscEl = document.getElementById('opponent-disc-color');
        oppDiscEl.className = `online-player-disc ${this.myColor === this.BLACK ? 'white' : 'black'}`;
    }
    
    hideOnlineStatus() {
        const statusBar = document.getElementById('online-status');
        statusBar.classList.add('hidden');
        document.body.classList.remove('online-active');
    }
    
    updateOnlineUI() {
        // 相手の番の場合の表示
        const isMyTurn = this.currentPlayer === this.myColor;
        
        // ヒント・元に戻すボタンの制御
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) hintBtn.disabled = !isMyTurn || this.isGameOver;
        document.getElementById('undo-btn').disabled = true; // オンラインでは常に無効
    }
    
    async sendMove(row, col) {
        if (!this.onlineRoomId) return;
        
        try {
            await window.db.collection('othelloRooms').doc(this.onlineRoomId).update({
                board: this.boardToFlat(this.board),
                currentPlayer: this.currentPlayer,
                lastMove: { row, col },
                lastMoveBy: this.playerId
            });
        } catch (error) {
            console.error('手の送信エラー:', error);
        }
    }
    
    handleRoomUpdate(roomData) {
        // 自分の手の場合は無視
        if (roomData.lastMoveBy === this.playerId) return;
        
        // ゲーム終了済みの場合は無視
        if (this.isGameOver) return;
        
        // 盤面を更新（1次元配列から2次元配列に変換）
        if (roomData.board) {
            this.board = this.flatToBoard(roomData.board);
        }
        this.currentPlayer = roomData.currentPlayer;
        this.lastMove = roomData.lastMove;
        
        // UI更新
        this.render();
        this.updateUI();
        this.updateOnlineUI();
        
        // ゲーム終了チェック
        if (this.checkGameOver()) {
            this.endOnlineGame();
            return;
        }
        
        // パスチェック（オンライン用）
        this.checkOnlinePass();
    }
    
    checkOnlinePass() {
        const validMoves = this.getValidMoves(this.currentPlayer);
        
        if (validMoves.length === 0) {
            const opponentMoves = this.getValidMoves(
                this.currentPlayer === this.BLACK ? this.WHITE : this.BLACK
            );
            
            if (opponentMoves.length === 0) {
                // 両者パスならゲーム終了
                this.endOnlineGame();
                return;
            }
            
            // パス表示
            const isMyTurn = this.currentPlayer === this.myColor;
            if (isMyTurn) {
                this.showPassModal();
            }
        }
    }
    
    handlePassComplete() {
        this.switchPlayer();
        this.render();
        this.updateUI();
        
        if (this.gameMode === 'online') {
            // オンラインの場合はパスを送信
            this.sendPass();
            this.updateOnlineUI();
        } else if (this.gameMode === 'cpu' && this.currentPlayer === this.WHITE) {
            // CPUの番ならCPUを動かす
            this.makeCPUMove();
        }
    }
    
    async sendPass() {
        if (!this.onlineRoomId) return;
        
        try {
            await window.db.collection('othelloRooms').doc(this.onlineRoomId).update({
                currentPlayer: this.currentPlayer,
                lastMoveBy: this.playerId,
                lastMove: null
            });
        } catch (error) {
            console.error('パス送信エラー:', error);
        }
    }
    
    endOnlineGame() {
        this.isGameOver = true;
        const { black, white } = this.countDiscs();
        
        // 結果を判定
        let title, titleClass, message;
        const myDiscs = this.myColor === this.BLACK ? black : white;
        const oppDiscs = this.myColor === this.BLACK ? white : black;
        
        if (myDiscs > oppDiscs) {
            title = '🎉 勝利！';
            titleClass = 'win';
            message = `おめでとうございます！${this.opponentName}さんに勝ちました！`;
        } else if (oppDiscs > myDiscs) {
            title = '😢 敗北...';
            titleClass = 'lose';
            message = `${this.opponentName}さんの勝利です。また挑戦してみてください。`;
        } else {
            title = '🤝 引き分け！';
            titleClass = 'draw';
            message = '接戦でした！';
        }
        
        document.getElementById('online-result-title').textContent = title;
        document.getElementById('online-result-title').className = titleClass;
        document.getElementById('online-result-black').textContent = black;
        document.getElementById('online-result-white').textContent = white;
        document.getElementById('online-result-message').textContent = message;
        
        // クリーンアップ
        this.cleanupOnlineGame();
        
        setTimeout(() => {
            this.onlineResultModal.classList.remove('hidden');
        }, 500);
    }
    
    handleOpponentLeft() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        const { black, white } = this.countDiscs();
        
        document.getElementById('online-result-title').textContent = '🚪 相手が退出しました';
        document.getElementById('online-result-title').className = 'disconnect';
        document.getElementById('online-result-black').textContent = black;
        document.getElementById('online-result-white').textContent = white;
        document.getElementById('online-result-message').textContent = '対戦相手が退出したため、ゲームが終了しました。';
        
        this.cleanupOnlineGame();
        
        this.onlineResultModal.classList.remove('hidden');
    }
    
    async leaveOnlineGame() {
        if (!confirm('オンライン対戦を退出しますか？')) return;
        
        this.cleanupOnlineGame();
        
        // ルームを削除
        if (this.onlineRoomId) {
            try {
                await window.db.collection('othelloRooms').doc(this.onlineRoomId).delete();
            } catch (error) {
                console.error('ルーム削除エラー:', error);
            }
        }
        
        this.showModeModal();
    }
    
    cleanupOnlineGame() {
        // リスナーを解除
        if (this.roomListener) {
            this.roomListener();
            this.roomListener = null;
        }
        
        // ステータスバーを非表示
        this.hideOnlineStatus();
        
        // 状態をリセット
        this.onlineRoomId = null;
        this.myColor = null;
        this.opponentName = '';
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new OthelloGame();
});
