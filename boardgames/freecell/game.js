/**
 * フリーセル - JavaScript ゲームロジック
 */

class FreeCellGame {
    constructor() {
        // カードのスートと色
        this.suits = {
            hearts: { symbol: '♥', color: 'red' },
            diamonds: { symbol: '♦', color: 'red' },
            clubs: { symbol: '♣', color: 'black' },
            spades: { symbol: '♠', color: 'black' }
        };
        
        // カードのランク
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        // ゲーム状態
        this.freeCells = [null, null, null, null];
        this.homeCells = { hearts: [], diamonds: [], clubs: [], spades: [] };
        this.columns = [[], [], [], [], [], [], [], []];
        
        // UI状態
        this.selectedCard = null;
        this.selectedSource = null;
        this.moves = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.timerStarted = false;
        this.history = [];
        this.isAutoCompleting = false;
        this.currentSeed = null;
        
        // 背景テーマ
        this.backgrounds = [
            { name: 'グリーン', gradient: 'linear-gradient(135deg, #1a3d28 0%, #0d2818 100%)' },
            { name: 'グリーン', gradient: 'linear-gradient(135deg, #155020ff 0%, #155020 100%)' },
            { name: 'ブルー', gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
            { name: 'パープル', gradient: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%)' },
            { name: 'レッド', gradient: 'linear-gradient(135deg, #b71c1c 0%, #c62828 100%)' },
            { name: 'ダーク', gradient: 'linear-gradient(135deg, #212121 0%, #424242 100%)' },
            { name: 'オレンジ', gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)' }
        ];
        this.currentBgIndex = parseInt(localStorage.getItem('freecell-bg-index')) || 0;
        
        // 背景を適用
        this.applyBackground();
        
        // 対戦モード状態
        this.battleMode = false;
        this.battleRoomId = null;
        this.playerId = null;
        this.opponentId = null;
        this.battleListener = null;
        this.battleStartTime = null;
        
        // DOM要素
        this.initDOMElements();
        this.initEventListeners();
        
        // ゲーム開始
        this.newGame();
    }
    
    initDOMElements() {
        this.freeCellElements = document.querySelectorAll('.free-cell');
        this.homeCellElements = document.querySelectorAll('.home-cell');
        this.columnElements = document.querySelectorAll('.column');
        this.movesDisplay = document.getElementById('moves-count');
        this.timerDisplay = document.getElementById('timer');
        this.winModal = document.getElementById('win-modal');
        this.rankingModal = document.getElementById('ranking-modal');
    }
    
    initEventListeners() {
        // ボタンイベント
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('auto-complete-btn').addEventListener('click', () => this.autoComplete());
        document.getElementById('bg-change-btn').addEventListener('click', () => this.changeBackground());
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.winModal.classList.add('hidden');
            this.newGame();
        });
        
        // ランキング関連のイベント
        document.getElementById('ranking-btn').addEventListener('click', () => this.showRanking());
        document.getElementById('close-ranking-btn').addEventListener('click', () => {
            this.rankingModal.classList.add('hidden');
        });
        document.getElementById('save-score-btn').addEventListener('click', () => this.saveScore());
        
        // 対戦モード関連のイベント
        document.getElementById('battle-btn').addEventListener('click', () => this.showBattleLobby());
        document.getElementById('close-battle-btn').addEventListener('click', () => this.closeBattleLobby());
        document.getElementById('start-matching-btn').addEventListener('click', () => this.startMatching());
        document.getElementById('cancel-matching-btn').addEventListener('click', () => this.cancelMatching());
        document.getElementById('leave-battle-btn').addEventListener('click', () => this.leaveBattle());
        document.getElementById('close-result-btn').addEventListener('click', () => {
            document.getElementById('battle-result-modal').classList.add('hidden');
            this.newGame();
        });
        
        // ランキングタブ切り替え（ソート順）
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderRankingList(e.target.dataset.tab);
            });
        });
        
        // ランキングタイプ切り替え（総合/デイリー）
        document.querySelectorAll('.type-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentRankingType = e.target.dataset.type;
                const activeTab = document.querySelector('.tab-btn.active');
                this.renderRankingList(activeTab ? activeTab.dataset.tab : 'performance');
            });
        });
        
        // カードのクリックイベント（イベント委譲）
        const gameBoard = document.querySelector('.game-board');
        gameBoard.addEventListener('click', (e) => {
            this.handleCardClick(e);
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.key === 'Escape') {
                this.clearSelection();
                this.winModal.classList.add('hidden');
                this.rankingModal.classList.add('hidden');
            }
        });
    }
    
    // カードクリック処理
    handleCardClick(e) {
        if (this.isAutoCompleting) return;
        
        const cardEl = e.target.closest('.card');
        
        // カードをクリックした場合 → 自動移動
        if (cardEl) {
            const cardId = cardEl.dataset.id;
            let card = null;
            let source = null;
            
            // フリーセルをチェック
            for (let i = 0; i < 4; i++) {
                if (this.freeCells[i] && this.freeCells[i].id === cardId) {
                    card = this.freeCells[i];
                    source = { type: 'freecell', index: i };
                    break;
                }
            }
            
            // カード列をチェック
            if (!card) {
                for (let i = 0; i < 8; i++) {
                    const column = this.columns[i];
                    const cardIndex = column.findIndex(c => c.id === cardId);
                    if (cardIndex !== -1) {
                        const stack = column.slice(cardIndex);
                        if (this.isValidStack(stack)) {
                            card = column[cardIndex];
                            source = { type: 'column', index: i, cardIndex };
                        }
                        break;
                    }
                }
            }
            
            if (card && source) {
                this.selectedCard = card;
                this.selectedSource = source;
                this.autoMoveCard();
            }
            return;
        }
        
        // 空のフリーセルをクリック
        const freeCell = e.target.closest('.free-cell');
        if (freeCell && this.selectedCard) {
            const index = Array.from(this.freeCellElements).indexOf(freeCell);
            if (index !== -1 && this.canMoveToFreeCell(index)) {
                this.moveToFreeCell(index);
            }
            return;
        }
        
        // 空のホームセルをクリック
        const homeCell = e.target.closest('.home-cell');
        if (homeCell && this.selectedCard) {
            const suit = homeCell.dataset.suit;
            if (this.canMoveToHome(this.selectedCard, suit)) {
                this.moveToHome(suit);
            }
            return;
        }
        
        // 空のカード列をクリック
        const column = e.target.closest('.column');
        if (column && this.selectedCard) {
            const index = Array.from(this.columnElements).indexOf(column);
            if (index !== -1 && this.canMoveToColumn(this.selectedCard, index, this.selectedSource)) {
                this.moveToColumn(index);
            }
            return;
        }
    }
    
    // カードを最適な場所へ自動移動
    autoMoveCard() {
        if (!this.selectedCard || !this.selectedSource) return;
        
        const card = this.selectedCard;
        const source = this.selectedSource;
        
        // 1. ホームセルへ移動を試みる（1枚の場合のみ）
        const isOneCard = source.type === 'freecell' || 
            (source.type === 'column' && source.cardIndex === this.columns[source.index].length - 1);
        
        if (isOneCard && this.canMoveToHome(card, card.suit)) {
            this.moveToHome(card.suit);
            return;
        }
        
        // 2. 適切なカード列へ移動を試みる（空でない列優先）
        for (let i = 0; i < 8; i++) {
            if (this.columns[i].length > 0 && 
                (source.type !== 'column' || source.index !== i) &&
                this.canMoveToColumn(card, i, source)) {
                this.moveToColumn(i);
                return;
            }
        }
        
        // 3. 空のカード列へ移動を試みる
        for (let i = 0; i < 8; i++) {
            if (this.columns[i].length === 0 && 
                (source.type !== 'column' || source.index !== i) &&
                this.canMoveToColumn(card, i, source)) {
                this.moveToColumn(i);
                return;
            }
        }
        
        // 4. フリーセルへ移動を試みる（1枚の場合のみ）
        if (isOneCard) {
            for (let i = 0; i < 4; i++) {
                if (!this.freeCells[i]) {
                    this.moveToFreeCell(i);
                    return;
                }
            }
        }
        
        // 移動先がない場合
        this.clearSelection();
    }
    
    // 有効なスタックかチェック（降順・色交互）
    isValidStack(cards) {
        for (let i = 0; i < cards.length - 1; i++) {
            const current = cards[i];
            const next = cards[i + 1];
            
            // ランクが1つ下でなければならない
            if (current.rank !== next.rank + 1) return false;
            
            // 色が交互でなければならない
            if (this.suits[current.suit].color === this.suits[next.suit].color) return false;
        }
        return true;
    }
    
    // デッキ作成
    createDeck() {
        const deck = [];
        for (const suit of Object.keys(this.suits)) {
            for (let rank = 0; rank < 13; rank++) {
                deck.push({ suit, rank, id: `${suit}-${rank}` });
            }
        }
        return deck;
    }
    
    // シード値ベースの乱数生成器（Mulberry32）
    seededRandom(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    
    // シャッフル（Fisher-Yates）- シード値対応
    shuffle(array, seed = null) {
        const shuffled = [...array];
        const random = seed !== null ? this.seededRandom(seed) : Math.random;
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // シード値を生成
    generateSeed() {
        return Math.floor(Math.random() * 2147483647);
    }
    
    // 新しいゲーム（シード値指定可能）
    newGame(seed = null) {
        // 対戦中なら対戦を終了
        if (this.battleMode && !seed) {
            this.leaveBattle();
        }
        
        // 状態リセット
        this.freeCells = [null, null, null, null];
        this.homeCells = { hearts: [], diamonds: [], clubs: [], spades: [] };
        this.columns = [[], [], [], [], [], [], [], []];
        this.selectedCard = null;
        this.selectedSource = null;
        this.moves = 0;
        this.history = [];
        this.isAutoCompleting = false;
        this.currentSeed = seed !== null ? seed : this.generateSeed();
        
        // 自動完成ボタンを非表示
        const autoContainer = document.getElementById('auto-complete-container');
        if (autoContainer) {
            autoContainer.classList.add('hidden');
        }
        
        // タイマーリセット（一手目まで開始しない）
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timer = 0;
        this.timerStarted = false;
        this.timerDisplay.textContent = '00:00';
        
        // デッキ作成・シャッフル・配布（シード値使用）
        const deck = this.shuffle(this.createDeck(), this.currentSeed);
        
        // 8列に配布（最初の4列に7枚、残り4列に6枚）
        for (let i = 0; i < 52; i++) {
            this.columns[i % 8].push(deck[i]);
        }
        
        // 描画
        this.render();
        this.updateUI();
    }
    
    // タイマー更新
    updateTimer() {
        this.timer++;
        const minutes = Math.floor(this.timer / 60).toString().padStart(2, '0');
        const seconds = (this.timer % 60).toString().padStart(2, '0');
        this.timerDisplay.textContent = `${minutes}:${seconds}`;
    }
    
    // タイマー開始（一手目で開始）
    startTimer() {
        if (!this.timerStarted && !this.battleMode) {
            this.timerStarted = true;
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        }
    }
    
    // 背景変更
    changeBackground() {
        this.currentBgIndex = (this.currentBgIndex + 1) % this.backgrounds.length;
        localStorage.setItem('freecell-bg-index', this.currentBgIndex);
        this.applyBackground();
    }
    
    // 背景適用
    applyBackground() {
        const bg = this.backgrounds[this.currentBgIndex];
        document.body.style.background = bg.gradient;
    }
    
    // カードのHTML生成
    createCardElement(card, index = 0, offset = 35) {
        const suitInfo = this.suits[card.suit];
        const rankDisplay = this.ranks[card.rank];
        
        const cardEl = document.createElement('div');
        cardEl.className = `card ${suitInfo.color}`;
        cardEl.dataset.suit = card.suit;
        cardEl.dataset.rank = card.rank;
        cardEl.dataset.id = card.id;
        cardEl.style.top = `${index * offset}px`;
        
        // 絵札かどうか判定
        const isFaceCard = card.rank >= 10; // J=10, Q=11, K=12
        let centerContent = suitInfo.symbol;
        
        if (isFaceCard) {
            const faceType = ['J', 'Q', 'K'][card.rank - 10];
            centerContent = this.getFaceCardSVG(faceType, suitInfo.color, suitInfo.symbol);
        }
        
        cardEl.innerHTML = `
            <div class="card-corner top-left">
                <span class="card-rank">${rankDisplay}</span>
                <span class="card-suit">${suitInfo.symbol}</span>
            </div>
            <div class="card-center">${centerContent}</div>
            <div class="card-corner bottom-right">
                <span class="card-rank">${rankDisplay}</span>
                <span class="card-suit">${suitInfo.symbol}</span>
            </div>
        `;
        
        return cardEl;
    }
    
    // 絵札のSVG生成
    getFaceCardSVG(type, color, suitSymbol) {
        const fillColor = color === 'red' ? '#d32f2f' : '#212121';
        const bgColor = color === 'red' ? '#ffebee' : '#f5f5f5';
        
        if (type === 'J') {
            // ジャック - 若い従者
            return `
                <svg viewBox="0 0 50 70" class="face-card-svg">
                    <rect x="2" y="2" width="46" height="66" rx="3" fill="${bgColor}" stroke="${fillColor}" stroke-width="1"/>
                    <!-- 帽子 -->
                    <ellipse cx="25" cy="15" rx="14" ry="8" fill="${fillColor}"/>
                    <rect x="11" y="13" width="28" height="4" fill="${fillColor}"/>
                    <!-- 羽飾り -->
                    <path d="M30 8 Q35 3 33 12" stroke="${fillColor}" fill="none" stroke-width="1.5"/>
                    <!-- 顔 -->
                    <circle cx="25" cy="26" r="10" fill="#ffcc99" stroke="${fillColor}" stroke-width="0.5"/>
                    <!-- 目 -->
                    <circle cx="22" cy="24" r="1.5" fill="${fillColor}"/>
                    <circle cx="28" cy="24" r="1.5" fill="${fillColor}"/>
                    <!-- 口 -->
                    <path d="M22 29 Q25 31 28 29" stroke="${fillColor}" fill="none" stroke-width="0.8"/>
                    <!-- 襟 -->
                    <path d="M15 36 L25 42 L35 36" fill="${fillColor}"/>
                    <!-- 体 -->
                    <rect x="17" y="40" width="16" height="20" fill="${fillColor}"/>
                    <!-- 装飾 -->
                    <line x1="25" y1="42" x2="25" y2="58" stroke="${bgColor}" stroke-width="2"/>
                    <!-- スートマーク -->
                    <text x="25" y="54" text-anchor="middle" fill="${bgColor}" font-size="8">${suitSymbol}</text>
                </svg>
            `;
        } else if (type === 'Q') {
            // クイーン - 女王
            return `
                <svg viewBox="0 0 50 70" class="face-card-svg">
                    <rect x="2" y="2" width="46" height="66" rx="3" fill="${bgColor}" stroke="${fillColor}" stroke-width="1"/>
                    <!-- 王冠 -->
                    <path d="M13 18 L17 8 L21 15 L25 5 L29 15 L33 8 L37 18 Z" fill="${fillColor}"/>
                    <rect x="13" y="16" width="24" height="4" fill="${fillColor}"/>
                    <!-- 宝石 -->
                    <circle cx="25" cy="10" r="2" fill="${bgColor}"/>
                    <!-- 顔 -->
                    <circle cx="25" cy="28" r="10" fill="#ffcc99" stroke="${fillColor}" stroke-width="0.5"/>
                    <!-- 髪 -->
                    <ellipse cx="25" cy="22" rx="11" ry="6" fill="${fillColor}"/>
                    <!-- 目 -->
                    <ellipse cx="22" cy="27" rx="1.5" ry="2" fill="${fillColor}"/>
                    <ellipse cx="28" cy="27" rx="1.5" ry="2" fill="${fillColor}"/>
                    <!-- まつげ -->
                    <path d="M20 25 L22 26" stroke="${fillColor}" stroke-width="0.5"/>
                    <path d="M28 26 L30 25" stroke="${fillColor}" stroke-width="0.5"/>
                    <!-- 口 -->
                    <ellipse cx="25" cy="32" rx="2" ry="1" fill="#e57373"/>
                    <!-- 体・ドレス -->
                    <path d="M15 38 Q25 42 35 38 L38 60 L12 60 Z" fill="${fillColor}"/>
                    <!-- ネックレス -->
                    <ellipse cx="25" cy="40" rx="6" ry="2" fill="none" stroke="${bgColor}" stroke-width="1"/>
                    <!-- スートマーク -->
                    <text x="25" y="54" text-anchor="middle" fill="${bgColor}" font-size="8">${suitSymbol}</text>
                </svg>
            `;
        } else {
            // キング - 王
            return `
                <svg viewBox="0 0 50 70" class="face-card-svg">
                    <rect x="2" y="2" width="46" height="66" rx="3" fill="${bgColor}" stroke="${fillColor}" stroke-width="1"/>
                    <!-- 王冠 -->
                    <path d="M12 20 L16 8 L21 16 L25 6 L29 16 L34 8 L38 20 Z" fill="${fillColor}"/>
                    <rect x="12" y="18" width="26" height="5" fill="${fillColor}"/>
                    <!-- 宝石 -->
                    <circle cx="25" cy="11" r="2.5" fill="${bgColor}"/>
                    <circle cx="17" cy="14" r="1.5" fill="${bgColor}"/>
                    <circle cx="33" cy="14" r="1.5" fill="${bgColor}"/>
                    <!-- 顔 -->
                    <circle cx="25" cy="32" r="10" fill="#ffcc99" stroke="${fillColor}" stroke-width="0.5"/>
                    <!-- ひげ -->
                    <path d="M17 35 Q25 42 33 35" fill="${fillColor}"/>
                    <!-- 目 -->
                    <circle cx="22" cy="30" r="1.5" fill="${fillColor}"/>
                    <circle cx="28" cy="30" r="1.5" fill="${fillColor}"/>
                    <!-- 眉 -->
                    <path d="M19 28 L24 27" stroke="${fillColor}" stroke-width="1"/>
                    <path d="M26 27 L31 28" stroke="${fillColor}" stroke-width="1"/>
                    <!-- 体・ローブ -->
                    <rect x="14" y="42" width="22" height="22" fill="${fillColor}"/>
                    <!-- 装飾ライン -->
                    <line x1="25" y1="44" x2="25" y2="62" stroke="${bgColor}" stroke-width="3"/>
                    <rect x="22" y="46" width="6" height="4" fill="${bgColor}"/>
                    <!-- スートマーク -->
                    <text x="25" y="58" text-anchor="middle" fill="${fillColor}" font-size="8">${suitSymbol}</text>
                </svg>
            `;
        }
    }
    
    // 描画
    render() {
        // フリーセル描画
        this.freeCellElements.forEach((cell, index) => {
            cell.innerHTML = '';
            if (this.freeCells[index]) {
                cell.appendChild(this.createCardElement(this.freeCells[index]));
            }
        });
        
        // ホームセル描画
        this.homeCellElements.forEach(cell => {
            const suit = cell.dataset.suit;
            const cards = this.homeCells[suit];
            cell.innerHTML = '';
            
            if (cards.length > 0) {
                const topCard = cards[cards.length - 1];
                cell.appendChild(this.createCardElement(topCard));
            } else {
                cell.innerHTML = this.suits[suit].symbol;
            }
        });
        
        // カード列描画
        this.columnElements.forEach((columnEl, index) => {
            columnEl.innerHTML = '';
            const column = this.columns[index];
            const cardCount = column.length;
            
            // カードの重なりオフセットを計算（枚数が多いほど小さくする）
            // 最大高さを300pxとして調整
            const maxHeight = 300;
            const cardHeight = 115;
            const defaultOffset = 35;
            let offset = defaultOffset;
            
            if (cardCount > 1) {
                const neededHeight = cardHeight + (cardCount - 1) * defaultOffset;
                if (neededHeight > maxHeight) {
                    offset = Math.max(15, (maxHeight - cardHeight) / (cardCount - 1));
                }
            }
            
            column.forEach((card, cardIndex) => {
                const cardEl = this.createCardElement(card, cardIndex, offset);
                columnEl.appendChild(cardEl);
            });
        });
        
        // 選択状態の更新
        this.updateSelection();
        
        // 移動可能なカードを明るく表示
        this.updateMovableCards();
    }
    
    // UI更新
    updateUI() {
        this.movesDisplay.textContent = this.moves;
        document.getElementById('undo-btn').disabled = this.history.length === 0;
    }
    
    // 移動可能なカードの表示を更新
    updateMovableCards() {
        // すべてのカードを暗く
        document.querySelectorAll('.card').forEach(el => {
            el.classList.remove('movable', 'not-movable');
            el.classList.add('not-movable');
        });
        
        // フリーセルのカードはすべて移動可能
        this.freeCellElements.forEach((cell, index) => {
            if (this.freeCells[index]) {
                const cardEl = cell.querySelector('.card');
                if (cardEl) {
                    cardEl.classList.remove('not-movable');
                    cardEl.classList.add('movable');
                }
            }
        });
        
        // カード列の移動可能なカードを明るく
        this.columnElements.forEach((columnEl, colIndex) => {
            const column = this.columns[colIndex];
            const cards = columnEl.querySelectorAll('.card');
            
            // 各カードから始まるスタックが有効かチェック
            for (let i = column.length - 1; i >= 0; i--) {
                const stack = column.slice(i);
                if (this.isValidStack(stack)) {
                    // このスタックがどこかに移動可能かチェック
                    const source = { type: 'column', index: colIndex, cardIndex: i };
                    let canMove = false;
                    
                    // ホームセルへ移動可能か（スタックが1枚の場合のみ）
                    if (stack.length === 1 && this.canMoveToHome(column[i], column[i].suit)) {
                        canMove = true;
                    }
                    
                    // フリーセルへ移動可能か（スタックが1枚の場合のみ）
                    if (stack.length === 1) {
                        for (let j = 0; j < 4; j++) {
                            if (!this.freeCells[j]) {
                                canMove = true;
                                break;
                            }
                        }
                    }
                    
                    // 他のカード列へ移動可能か
                    for (let j = 0; j < 8; j++) {
                        if (j !== colIndex && this.canMoveToColumn(column[i], j, source)) {
                            canMove = true;
                            break;
                        }
                    }
                    
                    if (canMove && cards[i]) {
                        // このカードから下のスタックをすべて明るく
                        for (let k = i; k < column.length; k++) {
                            if (cards[k]) {
                                cards[k].classList.remove('not-movable');
                                cards[k].classList.add('movable');
                            }
                        }
                    }
                } else {
                    // 無効なスタックなら、これ以上上のカードはチェック不要
                    break;
                }
            }
        });
    }
    
    // 選択状態の更新
    updateSelection() {
        // すべての選択を解除
        document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        
        if (this.selectedCard && this.selectedSource) {
            const { type, index, cardIndex } = this.selectedSource;
            
            if (type === 'freecell') {
                const cell = this.freeCellElements[index];
                const card = cell.querySelector('.card');
                if (card) card.classList.add('selected');
            } else if (type === 'column') {
                const column = this.columnElements[index];
                const cards = column.querySelectorAll('.card');
                for (let i = cardIndex; i < cards.length; i++) {
                    cards[i].classList.add('selected');
                }
            }
            
            // 移動可能な場所をハイライト
            this.highlightValidMoves();
        }
    }
    
    // 移動可能な場所をハイライト
    highlightValidMoves() {
        if (!this.selectedCard) return;
        
        // フリーセル
        this.freeCellElements.forEach((cell, index) => {
            if (this.canMoveToFreeCell(index)) {
                cell.classList.add('highlight');
            }
        });
        
        // ホームセル
        this.homeCellElements.forEach(cell => {
            const suit = cell.dataset.suit;
            if (this.canMoveToHome(this.selectedCard, suit)) {
                cell.classList.add('highlight');
            }
        });
        
        // カード列
        this.columnElements.forEach((column, index) => {
            if (this.canMoveToColumn(this.selectedCard, index, this.selectedSource)) {
                column.classList.add('highlight');
            }
        });
    }
    
    // 選択解除
    clearSelection() {
        this.selectedCard = null;
        this.selectedSource = null;
        this.updateSelection();
    }
    
    // 移動可能な最大枚数を計算
    getMaxMovableCards(targetIsEmpty = false) {
        const emptyFreeCells = this.freeCells.filter(c => c === null).length;
        const emptyColumns = this.columns.filter(c => c.length === 0).length - (targetIsEmpty ? 1 : 0);
        
        // 公式: (空きフリーセル + 1) × 2^(空きカード列)
        return (emptyFreeCells + 1) * Math.pow(2, emptyColumns);
    }
    
    // フリーセルへ移動可能かチェック
    canMoveToFreeCell(index) {
        if (this.freeCells[index] !== null) return false;
        if (!this.selectedCard || !this.selectedSource) return false;
        
        // フリーセルには1枚のカードのみ移動可能
        if (this.selectedSource.type === 'column') {
            const column = this.columns[this.selectedSource.index];
            if (this.selectedSource.cardIndex !== column.length - 1) return false;
        }
        
        return true;
    }
    
    // ホームセルへ移動可能かチェック
    canMoveToHome(card, suit) {
        if (card.suit !== suit) return false;
        
        const homeStack = this.homeCells[suit];
        
        if (homeStack.length === 0) {
            return card.rank === 0; // Aのみ
        }
        
        const topCard = homeStack[homeStack.length - 1];
        return card.rank === topCard.rank + 1;
    }
    
    // カード列へ移動可能かチェック
    canMoveToColumn(card, columnIndex, source) {
        const column = this.columns[columnIndex];
        
        // 自分自身の列には移動不可
        if (source.type === 'column' && source.index === columnIndex) return false;
        
        // 移動枚数チェック
        if (source.type === 'column') {
            const sourceColumn = this.columns[source.index];
            const movingCards = sourceColumn.length - source.cardIndex;
            const maxMovable = this.getMaxMovableCards(column.length === 0);
            if (movingCards > maxMovable) return false;
        }
        
        // 空の列には何でも置ける
        if (column.length === 0) return true;
        
        const topCard = column[column.length - 1];
        
        // ランクが1つ下で色が異なる
        return card.rank === topCard.rank - 1 && 
               this.suits[card.suit].color !== this.suits[topCard.suit].color;
    }
    
    // フリーセルへ移動
    moveToFreeCell(index) {
        const sourceEl = this.getSourceCardElement();
        const targetEl = this.freeCellElements[index];
        
        this.animateCardMove(sourceEl, targetEl, () => {
            this.saveState();
            
            if (this.selectedSource.type === 'freecell') {
                this.freeCells[this.selectedSource.index] = null;
            } else if (this.selectedSource.type === 'column') {
                this.columns[this.selectedSource.index].pop();
            }
            
            this.freeCells[index] = this.selectedCard;
            this.moves++;
            this.startTimer();
            
            this.clearSelection();
            this.render();
            this.updateUI();
            this.checkAutoComplete();
        });
    }
    
    // ホームセルへ移動
    moveToHome(suit) {
        const sourceEl = this.getSourceCardElement();
        const targetEl = document.querySelector(`.home-cell[data-suit="${suit}"]`);
        
        this.animateCardMove(sourceEl, targetEl, () => {
            this.saveState();
            
            if (this.selectedSource.type === 'freecell') {
                this.freeCells[this.selectedSource.index] = null;
            } else if (this.selectedSource.type === 'column') {
                this.columns[this.selectedSource.index].pop();
            }
            
            this.homeCells[suit].push(this.selectedCard);
            this.moves++;
            this.startTimer();
            
            this.clearSelection();
            this.render();
            this.updateUI();
            this.checkWin();
            this.checkAutoComplete();
        });
    }
    
    // カード列へ移動
    moveToColumn(columnIndex) {
        const sourceEl = this.getSourceCardElement();
        const targetColumn = this.columnElements[columnIndex];
        const targetCards = targetColumn.querySelectorAll('.card');
        const targetEl = targetCards.length > 0 ? targetCards[targetCards.length - 1] : targetColumn;
        
        this.animateCardMove(sourceEl, targetEl, () => {
            this.saveState();
            
            let cardsToMove = [];
            
            if (this.selectedSource.type === 'freecell') {
                cardsToMove = [this.selectedCard];
                this.freeCells[this.selectedSource.index] = null;
            } else if (this.selectedSource.type === 'column') {
                cardsToMove = this.columns[this.selectedSource.index].splice(this.selectedSource.cardIndex);
            }
            
            this.columns[columnIndex].push(...cardsToMove);
            this.moves++;
            this.startTimer();
            
            this.clearSelection();
            this.render();
            this.updateUI();
            this.checkAutoComplete();
        });
    }
    
    // 状態保存（Undo用）
    saveState() {
        this.history.push({
            freeCells: [...this.freeCells],
            homeCells: {
                hearts: [...this.homeCells.hearts],
                diamonds: [...this.homeCells.diamonds],
                clubs: [...this.homeCells.clubs],
                spades: [...this.homeCells.spades]
            },
            columns: this.columns.map(col => [...col]),
            moves: this.moves
        });
        
        // 履歴は最大50手まで
        if (this.history.length > 50) {
            this.history.shift();
        }
    }
    
    // 元に戻す
    undo() {
        if (this.history.length === 0 || this.isAutoCompleting) return;
        
        const state = this.history.pop();
        this.freeCells = state.freeCells;
        this.homeCells = state.homeCells;
        this.columns = state.columns;
        this.moves = state.moves;
        
        this.clearSelection();
        this.render();
        this.updateUI();
    }
    
    // ヒント表示
    showHint() {
        if (this.isAutoCompleting) return;
        
        // 既存のヒントをクリア
        document.querySelectorAll('.card.hint').forEach(el => el.classList.remove('hint'));
        
        // ホームセルへ移動可能なカードを探す
        const hint = this.findBestMove();
        
        if (hint) {
            const { card, source } = hint;
            
            if (source.type === 'freecell') {
                const cell = this.freeCellElements[source.index];
                const cardEl = cell.querySelector('.card');
                if (cardEl) cardEl.classList.add('hint');
            } else if (source.type === 'column') {
                const column = this.columnElements[source.index];
                const cards = column.querySelectorAll('.card');
                if (cards[source.cardIndex]) {
                    cards[source.cardIndex].classList.add('hint');
                }
            }
            
            // 3秒後にヒント解除
            setTimeout(() => {
                document.querySelectorAll('.card.hint').forEach(el => el.classList.remove('hint'));
            }, 3000);
        }
    }
    
    // 最良の手を見つける
    findBestMove() {
        // 1. ホームセルへ移動可能なカード
        for (let i = 0; i < 4; i++) {
            if (this.freeCells[i]) {
                const card = this.freeCells[i];
                if (this.canMoveToHome(card, card.suit)) {
                    return { card, source: { type: 'freecell', index: i } };
                }
            }
        }
        
        for (let i = 0; i < 8; i++) {
            const column = this.columns[i];
            if (column.length > 0) {
                const card = column[column.length - 1];
                if (this.canMoveToHome(card, card.suit)) {
                    return { card, source: { type: 'column', index: i, cardIndex: column.length - 1 } };
                }
            }
        }
        
        // 2. 有効なカード列間の移動
        for (let i = 0; i < 8; i++) {
            const column = this.columns[i];
            for (let j = 0; j < column.length; j++) {
                const stack = column.slice(j);
                if (this.isValidStack(stack)) {
                    const card = column[j];
                    const source = { type: 'column', index: i, cardIndex: j };
                    
                    for (let k = 0; k < 8; k++) {
                        if (k !== i && this.canMoveToColumn(card, k, source)) {
                            // 空の列への移動はスキップ（無限ループ防止）
                            if (this.columns[k].length > 0) {
                                return { card, source };
                            }
                        }
                    }
                }
            }
        }
        
        // 3. フリーセルからカード列への移動
        for (let i = 0; i < 4; i++) {
            if (this.freeCells[i]) {
                const card = this.freeCells[i];
                const source = { type: 'freecell', index: i };
                
                for (let j = 0; j < 8; j++) {
                    if (this.columns[j].length > 0 && this.canMoveToColumn(card, j, source)) {
                        return { card, source };
                    }
                }
            }
        }
        
        return null;
    }
    
    // 移動元のカード要素を取得
    getSourceCardElement() {
        if (this.selectedSource.type === 'freecell') {
            const cell = this.freeCellElements[this.selectedSource.index];
            return cell.querySelector('.card');
        } else if (this.selectedSource.type === 'column') {
            const column = this.columnElements[this.selectedSource.index];
            const cards = column.querySelectorAll('.card');
            return cards[this.selectedSource.cardIndex];
        }
        return null;
    }
    
    // カード移動アニメーション
    animateCardMove(sourceEl, targetEl, callback) {
        if (!sourceEl || !targetEl) {
            callback();
            return;
        }
        
        // 移動する全カードを取得（複数枚移動の場合）
        const cardsToAnimate = [];
        if (this.selectedSource.type === 'column') {
            const column = this.columnElements[this.selectedSource.index];
            const cards = column.querySelectorAll('.card');
            for (let i = this.selectedSource.cardIndex; i < cards.length; i++) {
                cardsToAnimate.push(cards[i]);
            }
        } else {
            cardsToAnimate.push(sourceEl);
        }
        
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        
        // 移動距離を計算
        const deltaX = targetRect.left - sourceRect.left;
        const deltaY = targetRect.top - sourceRect.top + (targetEl.classList.contains('card') ? 35 : 0);
        
        // 各カードにアニメーションを適用
        cardsToAnimate.forEach((card, index) => {
            card.style.transition = 'none';
            card.style.zIndex = '1000';
            card.style.position = 'relative';
            
            // 強制リフロー
            card.offsetHeight;
            
            card.style.transition = 'transform 0.2s ease-out';
            card.style.transform = `translate(${deltaX}px, ${deltaY + index * 35}px)`;
        });
        
        // アニメーション完了後にコールバック実行
        setTimeout(() => {
            cardsToAnimate.forEach(card => {
                card.style.transition = '';
                card.style.transform = '';
                card.style.zIndex = '';
                card.style.position = '';
            });
            callback();
        }, 200);
    }
    
    // 自動完成チェック
    checkAutoComplete() {
        // 各列が降順（上から下にランクが減少）に並んでいるかチェック
        let canAutoComplete = true;
        
        for (const column of this.columns) {
            for (let i = 0; i < column.length - 1; i++) {
                if (column[i].rank < column[i + 1].rank) {
                    canAutoComplete = false;
                    break;
                }
            }
            if (!canAutoComplete) break;
        }
        
        // 自動完成ボタンの表示/非表示を制御
        const autoContainer = document.getElementById('auto-complete-container');
        if (canAutoComplete && !this.isAutoCompleting) {
            autoContainer.classList.remove('hidden');
        } else {
            autoContainer.classList.add('hidden');
        }
    }
    
    // 自動完成
    async autoComplete() {
        if (this.isAutoCompleting) return;
        this.isAutoCompleting = true;
        
        // 自動完成開始時にタイマーを停止
        clearInterval(this.timerInterval);
        
        // ボタンを非表示
        const autoContainer = document.getElementById('auto-complete-container');
        autoContainer.classList.add('hidden');
        
        let moved = true;
        while (moved) {
            moved = false;
            
            // フリーセルからホームへ
            for (let i = 0; i < 4; i++) {
                if (this.freeCells[i]) {
                    const card = this.freeCells[i];
                    if (this.canMoveToHome(card, card.suit)) {
                        // 自動完成用の直接移動（アニメーションなし）
                        this.saveState();
                        this.freeCells[i] = null;
                        this.homeCells[card.suit].push(card);
                        this.moves++;
                        this.render();
                        this.updateUI();
                        moved = true;
                        await this.delay(100);
                        break; // 1回移動したらループを抜けて再チェック
                    }
                }
            }
            
            if (moved) continue;
            
            // カード列からホームへ
            for (let i = 0; i < 8; i++) {
                const column = this.columns[i];
                if (column.length > 0) {
                    const card = column[column.length - 1];
                    if (this.canMoveToHome(card, card.suit)) {
                        // 自動完成用の直接移動（アニメーションなし）
                        this.saveState();
                        this.columns[i].pop();
                        this.homeCells[card.suit].push(card);
                        this.moves++;
                        this.render();
                        this.updateUI();
                        moved = true;
                        await this.delay(100);
                        break; // 1回移動したらループを抜けて再チェック
                    }
                }
            }
        }
        
        this.isAutoCompleting = false;
        this.checkWin();
    }
    
    // ディレイ
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 勝利チェック
    checkWin() {
        const totalInHome = Object.values(this.homeCells).reduce((sum, cards) => sum + cards.length, 0);
        
        if (totalInHome === 52) {
            clearInterval(this.timerInterval);
            
            // 対戦モードの場合
            if (this.battleMode) {
                this.battleWin();
                return;
            }
            
            // 通常モードの場合：勝利モーダル表示
            document.getElementById('final-moves').textContent = this.moves;
            document.getElementById('final-time').textContent = this.timerDisplay.textContent;
            document.getElementById('player-name').value = '';
            document.getElementById('save-score-btn').textContent = 'スコアを登録';
            document.getElementById('save-score-btn').disabled = false;
            this.winModal.classList.remove('hidden');
        }
    }
    
    // スコアを保存（Firebase）
    async saveScore() {
        const playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            alert('名前を入力してください');
            return;
        }
        
        const saveBtn = document.getElementById('save-score-btn');
        saveBtn.textContent = '登録中...';
        saveBtn.disabled = true;
        
        try {
            const now = new Date();
            const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const score = {
                name: playerName,
                time: this.timer,
                timeDisplay: this.timerDisplay.textContent,
                moves: this.moves,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                dateDisplay: this.formatDate(now),
                dateString: dateString
            };
            
            // Firebaseに保存
            await db.collection('rankings').add(score);
            
            saveBtn.textContent = '登録しました！';
            
            // 1秒後にランキング表示
            setTimeout(() => {
                this.winModal.classList.add('hidden');
                this.showRanking();
            }, 1000);
            
        } catch (error) {
            console.error('スコア保存エラー:', error);
            alert('スコアの保存に失敗しました。もう一度お試しください。');
            saveBtn.textContent = 'スコアを登録';
            saveBtn.disabled = false;
        }
    }
    
    // ランキング表示
    showRanking() {
        this.rankingModal.classList.remove('hidden');
        // 現在アクティブなタブで表示
        const activeTab = document.querySelector('.tab-btn.active');
        const activeTypeTab = document.querySelector('.type-tab-btn.active');
        this.rankingPage = 0;
        this.rankingsPerPage = 10;
        this.totalRankings = [];
        this.currentRankingType = activeTypeTab ? activeTypeTab.dataset.type : 'all';
        this.renderRankingList(activeTab ? activeTab.dataset.tab : 'performance');
    }
    
    // 今日の日付を取得（YYYY-MM-DD形式）
    getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 日付文字列を取得（スコアデータから）
    getDateStringFromScore(score) {
        if (score.dateString) {
            return score.dateString;
        }
        if (score.date && score.date.toDate) {
            const d = score.date.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return null;
    }
    
    // パフォーマンススコアを計算（手数とタイムの複合評価）
    // 低いほど良い：手数の重み60% + タイム（秒）の重み40%
    calculatePerformance(moves, timeInSeconds) {
        // 理想値：52手（最小手数）、60秒（1分）
        // 手数スコア：moves（そのまま使用、低いほど良い）
        // タイムスコア：秒数（低いほど良い）
        // パフォーマンス = moves * 0.6 + timeInSeconds * 0.4
        return Math.round((moves * 0.6 + timeInSeconds * 0.4) * 100) / 100;
    }
    
    // ランキングリストを描画（Firebase）
    async renderRankingList(sortBy) {
        const listContainer = document.getElementById('ranking-list');
        listContainer.innerHTML = '<div class="ranking-empty">読み込み中...</div>';
        
        const isDaily = this.currentRankingType === 'daily';
        const todayString = this.getTodayDateString();
        
        try {
            // Firebaseからランキング取得（全件取得してソート）
            const snapshot = await db.collection('rankings')
                .limit(100)
                .get();
            
            if (snapshot.empty) {
                const emptyMessage = isDaily 
                    ? 'まだ今日の記録がありません<br>ゲームをクリアして記録を残そう！'
                    : 'まだ記録がありません<br>ゲームをクリアして記録を残そう！';
                listContainer.innerHTML = `<div class="ranking-empty">${emptyMessage}</div>`;
                return;
            }
            
            this.totalRankings = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const performance = this.calculatePerformance(data.moves, data.time);
                const scoreData = {
                    id: doc.id,
                    ...data,
                    performance: performance,
                    dateDisplay: data.dateDisplay || (data.date ? this.formatDate(data.date.toDate()) : '不明')
                };
                
                // デイリーモードの場合は今日の記録のみフィルタ
                if (isDaily) {
                    const scoreDateString = this.getDateStringFromScore(data);
                    if (scoreDateString === todayString) {
                        this.totalRankings.push(scoreData);
                    }
                } else {
                    this.totalRankings.push(scoreData);
                }
            });
            
            // デイリーで記録がない場合
            if (isDaily && this.totalRankings.length === 0) {
                listContainer.innerHTML = '<div class="ranking-empty">まだ今日の記録がありません<br>ゲームをクリアして記録を残そう！</div>';
                return;
            }
            
            // ソート
            if (sortBy === 'performance') {
                this.totalRankings.sort((a, b) => a.performance - b.performance);
            } else if (sortBy === 'time') {
                this.totalRankings.sort((a, b) => a.time - b.time);
            } else {
                this.totalRankings.sort((a, b) => a.moves - b.moves);
            }
            
            this.rankingPage = 0;
            this.currentSortBy = sortBy;
            this.renderRankingPage();
            
        } catch (error) {
            console.error('ランキング取得エラー:', error);
            listContainer.innerHTML = '<div class="ranking-empty">ランキングの取得に失敗しました<br>再度お試しください</div>';
        }
    }
    
    renderRankingPage() {
        const listContainer = document.getElementById('ranking-list');
        const start = this.rankingPage * this.rankingsPerPage;
        const end = start + this.rankingsPerPage;
        const pageRankings = this.totalRankings.slice(start, end);
        const totalPages = Math.ceil(this.totalRankings.length / this.rankingsPerPage);
        
        const rankingsHtml = pageRankings.map((score, index) => {
            const rank = start + index + 1;
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
            
            let mainScore, subScore;
            if (this.currentSortBy === 'performance') {
                mainScore = `${score.performance}`;
                subScore = `${score.timeDisplay} / ${score.moves}手`;
            } else if (this.currentSortBy === 'time') {
                mainScore = score.timeDisplay;
                subScore = `${score.moves}手`;
            } else {
                mainScore = `${score.moves}手`;
                subScore = score.timeDisplay;
            }
            
            // 名前の長さに応じてクラスを追加
            const nameLength = score.name.length;
            let nameSizeClass = '';
            if (nameLength > 15) {
                nameSizeClass = 'name-very-long';
            } else if (nameLength > 10) {
                nameSizeClass = 'name-long';
            }
            
            return `
                <div class="ranking-item ${rankClass}">
                    <div class="ranking-rank">${rankEmoji}</div>
                    <div class="ranking-info">
                        <div class="ranking-name ${nameSizeClass}">${this.escapeHtml(score.name)}</div>
                        <div class="ranking-details">${score.dateDisplay}</div>
                    </div>
                    <div class="ranking-score">${mainScore}</div>
                    <div class="ranking-sub-score">${subScore}</div>
                </div>
            `;
        }).join('');
        
        const paginationHtml = totalPages > 1 ? `
            <div class="ranking-pagination">
                <button class="pagination-btn" ${this.rankingPage === 0 ? 'disabled' : ''} onclick="game.prevRankingPage()">◀ 前</button>
                <span class="pagination-info">${this.rankingPage + 1} / ${totalPages}</span>
                <button class="pagination-btn" ${this.rankingPage >= totalPages - 1 ? 'disabled' : ''} onclick="game.nextRankingPage()">次 ▶</button>
            </div>
        ` : '';
        
        listContainer.innerHTML = `
            <div class="ranking-grid">${rankingsHtml}</div>
            ${paginationHtml}
        `;
    }
    
    prevRankingPage() {
        if (this.rankingPage > 0) {
            this.rankingPage--;
            this.renderRankingPage();
        }
    }
    
    nextRankingPage() {
        const totalPages = Math.ceil(this.totalRankings.length / this.rankingsPerPage);
        if (this.rankingPage < totalPages - 1) {
            this.rankingPage++;
            this.renderRankingPage();
        }
    }
    
    // ランキングをクリア（Firebase）
    async clearRankings() {
        if (!confirm('ランキングをすべて削除しますか？\nこの操作は取り消せません。')) {
            return;
        }
        
        try {
            const snapshot = await db.collection('rankings').get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            this.renderRankingList('time');
            alert('ランキングを削除しました');
        } catch (error) {
            console.error('ランキング削除エラー:', error);
            alert('削除に失敗しました');
        }
    }
    
    // 日付フォーマット
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }
    
    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========================================
    // 対戦モード関連のメソッド
    // ========================================
    
    // 対戦ロビーを表示
    showBattleLobby() {
        document.getElementById('battle-lobby-modal').classList.remove('hidden');
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('matching-screen').classList.add('hidden');
        
        // 保存された名前があれば復元
        const savedName = localStorage.getItem('battleName') || '';
        document.getElementById('battle-name').value = savedName;
    }
    
    // 対戦ロビーを閉じる
    closeBattleLobby() {
        if (this.matchingListener) {
            this.cancelMatching();
        }
        document.getElementById('battle-lobby-modal').classList.add('hidden');
    }
    
    // マッチング開始
    async startMatching() {
        const playerName = document.getElementById('battle-name').value.trim();
        if (!playerName) {
            alert('名前を入力してください');
            return;
        }
        
        // 対戦モードを取得
        const battleModeInput = document.querySelector('input[name="battle-mode"]:checked');
        const battleMode = battleModeInput ? battleModeInput.value : 'performance';
        
        // 名前を保存
        localStorage.setItem('battleName', playerName);
        
        // 画面切り替え
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('matching-screen').classList.remove('hidden');
        
        // プレイヤーIDを生成
        this.playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.playerName = playerName;
        this.selectedBattleMode = battleMode;
        
        try {
            // 待機中のルームを探す（同じ対戦モードのみ）
            const waitingRooms = await db.collection('battleRooms')
                .where('status', '==', 'waiting')
                .where('battleMode', '==', battleMode)
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
            alert('マッチングに失敗しました');
            this.cancelMatching();
        }
    }
    
    // ルームを作成
    async createRoom() {
        const seed = this.generateSeed();
        
        const roomRef = await db.collection('battleRooms').add({
            status: 'waiting',
            seed: seed,
            battleMode: this.selectedBattleMode,
            player1: {
                id: this.playerId,
                name: this.playerName,
                time: 0,
                moves: 0,
                finished: false
            },
            player2: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        this.battleRoomId = roomRef.id;
        
        // ルームの変更を監視
        this.matchingListener = db.collection('battleRooms').doc(this.battleRoomId)
            .onSnapshot((doc) => {
                const data = doc.data();
                if (data && data.status === 'playing') {
                    // 対戦開始！
                    this.startBattle(data);
                }
            });
        
        this.updateWaitingCount();
    }
    
    // ルームに参加
    async joinRoom(roomId, roomData) {
        this.battleRoomId = roomId;
        
        await db.collection('battleRooms').doc(roomId).update({
            status: 'playing',
            player2: {
                id: this.playerId,
                name: this.playerName,
                time: 0,
                moves: 0,
                finished: false
            },
            startedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 更新後のデータを取得して対戦開始
        const updatedDoc = await db.collection('battleRooms').doc(roomId).get();
        this.startBattle(updatedDoc.data());
    }
    
    // 待機人数を更新
    async updateWaitingCount() {
        const snapshot = await db.collection('battleRooms')
            .where('status', '==', 'waiting')
            .get();
        document.getElementById('waiting-count').textContent = 
            `現在 ${snapshot.size} 人が待機中`;
    }
    
    // マッチングをキャンセル
    async cancelMatching() {
        if (this.matchingListener) {
            this.matchingListener();
            this.matchingListener = null;
        }
        
        if (this.battleRoomId) {
            try {
                await db.collection('battleRooms').doc(this.battleRoomId).delete();
            } catch (error) {
                console.error('ルーム削除エラー:', error);
            }
            this.battleRoomId = null;
        }
        
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('matching-screen').classList.add('hidden');
    }
    
    // 対戦開始
    startBattle(roomData) {
        // モーダルを閉じる
        document.getElementById('battle-lobby-modal').classList.add('hidden');
        
        if (this.matchingListener) {
            this.matchingListener();
            this.matchingListener = null;
        }
        
        // 対戦モード設定
        this.battleMode = true;
        this.battleStartTime = Date.now();
        this.currentBattleMode = roomData.battleMode || 'performance';
        
        // 自分がどのプレイヤーか判定
        if (roomData.player1.id === this.playerId) {
            this.opponentId = roomData.player2.id;
            this.opponentName = roomData.player2.name;
        } else {
            this.opponentId = roomData.player1.id;
            this.opponentName = roomData.player1.name;
        }
        
        // 対戦ステータスバーを表示
        document.getElementById('battle-status').classList.remove('hidden');
        document.getElementById('opponent-name').textContent = this.opponentName;
        document.body.classList.add('battle-active');
        
        // 同じシード値でゲーム開始
        this.newGame(roomData.seed);
        
        // 相手の状態を監視
        this.battleListener = db.collection('battleRooms').doc(this.battleRoomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    this.updateOpponentStatus(doc.data());
                }
            });
        
        // 自分の状態を定期的に更新
        this.battleUpdateInterval = setInterval(() => this.updateMyBattleStatus(), 1000);
    }
    
    // 自分の対戦状態を更新
    async updateMyBattleStatus() {
        if (!this.battleMode || !this.battleRoomId) return;
        
        try {
            const roomDoc = await db.collection('battleRooms').doc(this.battleRoomId).get();
            if (!roomDoc.exists) return;
            
            const roomData = roomDoc.data();
            const playerKey = roomData.player1.id === this.playerId ? 'player1' : 'player2';
            
            const update = {};
            update[`${playerKey}.time`] = this.timer;
            update[`${playerKey}.moves`] = this.moves;
            
            await db.collection('battleRooms').doc(this.battleRoomId).update(update);
            
            // 自分のステータス表示を更新
            document.getElementById('my-battle-time').textContent = this.timerDisplay.textContent;
            document.getElementById('my-battle-moves').textContent = `${this.moves}手`;
        } catch (error) {
            console.error('状態更新エラー:', error);
        }
    }
    
    // 相手の状態を更新
    updateOpponentStatus(roomData) {
        const opponentData = roomData.player1.id === this.opponentId ? roomData.player1 : roomData.player2;
        
        // 相手のステータス表示を更新
        const minutes = Math.floor(opponentData.time / 60).toString().padStart(2, '0');
        const seconds = (opponentData.time % 60).toString().padStart(2, '0');
        document.getElementById('opponent-time').textContent = `${minutes}:${seconds}`;
        document.getElementById('opponent-moves').textContent = `${opponentData.moves}手`;
        
        // 相手がクリアしたかチェック
        if (opponentData.finished && !this.battleEnded) {
            this.battleEnded = true;
            this.endBattle(false, roomData);
        }
    }
    
    // 対戦クリア（勝利）
    async battleWin() {
        if (!this.battleMode || !this.battleRoomId || this.battleEnded) return;
        
        this.battleEnded = true;
        
        try {
            const roomDoc = await db.collection('battleRooms').doc(this.battleRoomId).get();
            if (!roomDoc.exists) return;
            
            const roomData = roomDoc.data();
            const playerKey = roomData.player1.id === this.playerId ? 'player1' : 'player2';
            const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
            
            const update = {};
            update[`${playerKey}.time`] = this.timer;
            update[`${playerKey}.moves`] = this.moves;
            update[`${playerKey}.finished`] = true;
            
            // 相手が既に完了している場合、勝者を判定
            if (roomData[opponentKey].finished) {
                const myScore = this.calculateBattleScore(this.moves, this.timer, roomData.battleMode);
                const opponentScore = this.calculateBattleScore(
                    roomData[opponentKey].moves, 
                    roomData[opponentKey].time, 
                    roomData.battleMode
                );
                
                if (myScore < opponentScore) {
                    update['winnerId'] = this.playerId;
                } else {
                    update['winnerId'] = roomData[opponentKey].id;
                }
            } else {
                // 先にクリアした場合は暫定勝者
                update['winnerId'] = this.playerId;
            }
            
            update['status'] = 'finished';
            
            await db.collection('battleRooms').doc(this.battleRoomId).update(update);
            
            // 更新後のデータで結果表示
            const updatedDoc = await db.collection('battleRooms').doc(this.battleRoomId).get();
            const finalData = updatedDoc.data();
            const isWinner = finalData.winnerId === this.playerId;
            this.endBattle(isWinner, finalData);
        } catch (error) {
            console.error('勝利処理エラー:', error);
        }
    }
    
    // 対戦スコアを計算
    calculateBattleScore(moves, time, mode) {
        if (mode === 'time') {
            return time;
        } else if (mode === 'moves') {
            return moves;
        } else {
            // performance: 手数 × 0.6 + タイム × 0.4
            return moves * 0.6 + time * 0.4;
        }
    }
    
    // 対戦終了
    endBattle(isWinner, roomData) {
        // タイマーとリスナーを停止
        if (this.battleUpdateInterval) {
            clearInterval(this.battleUpdateInterval);
            this.battleUpdateInterval = null;
        }
        if (this.battleListener) {
            this.battleListener();
            this.battleListener = null;
        }
        clearInterval(this.timerInterval);
        
        // 勝者と敗者の情報を取得
        const player1 = roomData.player1;
        const player2 = roomData.player2;
        
        let winner, loser;
        if (isWinner) {
            winner = player1.id === this.playerId ? player1 : player2;
            loser = player1.id === this.playerId ? player2 : player1;
        } else {
            winner = player1.id === this.opponentId ? player1 : player2;
            loser = player1.id === this.opponentId ? player2 : player1;
        }
        
        // 結果モーダルを表示
        const resultTitle = document.getElementById('result-title');
        if (isWinner) {
            resultTitle.textContent = '🎉 勝利！';
            resultTitle.className = 'win';
        } else {
            resultTitle.textContent = '😢 敗北...';
            resultTitle.className = 'lose';
        }
        
        // 対戦モード表示
        const battleMode = roomData.battleMode || 'performance';
        const modeNames = {
            'performance': 'パフォーマンス',
            'time': 'タイム',
            'moves': '手数'
        };
        document.getElementById('battle-mode-display').textContent = `【${modeNames[battleMode]}勝負】`;
        
        // 勝者情報
        document.getElementById('winner-name').textContent = winner.name;
        const winnerMinutes = Math.floor(winner.time / 60).toString().padStart(2, '0');
        const winnerSeconds = (winner.time % 60).toString().padStart(2, '0');
        document.getElementById('winner-time').textContent = `${winnerMinutes}:${winnerSeconds}`;
        document.getElementById('winner-moves').textContent = `${winner.moves}手`;
        
        // 敗者情報
        document.getElementById('loser-name').textContent = loser.name;
        if (loser.finished) {
            const loserMinutes = Math.floor(loser.time / 60).toString().padStart(2, '0');
            const loserSeconds = (loser.time % 60).toString().padStart(2, '0');
            document.getElementById('loser-time').textContent = `${loserMinutes}:${loserSeconds}`;
            document.getElementById('loser-moves').textContent = `${loser.moves}手`;
        } else {
            document.getElementById('loser-time').textContent = '未完了';
            document.getElementById('loser-moves').textContent = '-';
        }
        
        document.getElementById('battle-result-modal').classList.remove('hidden');
        
        // 対戦ステータスバーを非表示
        document.getElementById('battle-status').classList.add('hidden');
        document.body.classList.remove('battle-active');
        
        // 対戦モードをリセット
        this.battleMode = false;
        this.battleEnded = false;
    }
    
    // 対戦を離脱
    async leaveBattle() {
        if (!confirm('対戦を離脱しますか？\n（相手の勝利になります）')) {
            return;
        }
        
        // タイマーとリスナーを停止
        if (this.battleUpdateInterval) {
            clearInterval(this.battleUpdateInterval);
            this.battleUpdateInterval = null;
        }
        if (this.battleListener) {
            this.battleListener();
            this.battleListener = null;
        }
        
        // 相手の勝利として処理
        if (this.battleRoomId) {
            try {
                const roomDoc = await db.collection('battleRooms').doc(this.battleRoomId).get();
                if (roomDoc.exists) {
                    await db.collection('battleRooms').doc(this.battleRoomId).update({
                        status: 'finished',
                        winnerId: this.opponentId
                    });
                }
            } catch (error) {
                console.error('離脱処理エラー:', error);
            }
        }
        
        // 対戦ステータスバーを非表示
        document.getElementById('battle-status').classList.add('hidden');
        document.body.classList.remove('battle-active');
        
        // 対戦モードをリセット
        this.battleMode = false;
        this.battleRoomId = null;
        this.battleEnded = false;
        
        // 新しいゲームを開始
        this.newGame();
    }
}

// グローバル変数としてゲームインスタンスを保持
let game;

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    game = new FreeCellGame();
});
