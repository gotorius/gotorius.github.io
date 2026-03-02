/**
 * 統計学ノート - 共通スクリプト
 * ハブページとチャプターページの両方で使用
 */
document.addEventListener('DOMContentLoaded', () => {
    const isHub = document.getElementById('chapter-grid');
    isHub ? initHub() : initChapter();
});

/* ===================================
   Status Helpers (localStorage)
   =================================== */

const getStatus = (num) =>
    localStorage.getItem(`stat-ch-${num}`) || 'not-started';

const setStatus = (num, status) =>
    localStorage.setItem(`stat-ch-${num}`, status);

const getCompletedCount = () =>
    CHAPTERS.filter(ch => getStatus(ch.num) === 'completed').length;

const STATUS_LABELS = {
    'not-started': '未着手',
    'in-progress': '学習中',
    'completed': '完了',
};

/* ===================================
   Hub Page
   =================================== */

function initHub() {
    renderChapterGrid();
    updateProgress();
    initFilter();
}

function renderChapterGrid() {
    const grid = document.getElementById('chapter-grid');
    grid.innerHTML = CHAPTERS.map((ch, i) => {
        const status = getStatus(ch.num);
        return `
            <a href="chapters/chapter${ch.num}.html"
               class="chapter-card"
               data-status="${status}"
               style="animation-delay: ${i * 0.03}s">
                <div class="chapter-card-header">
                    <span class="chapter-num">第${ch.num}章</span>
                    <span class="chapter-status status-${status}">${STATUS_LABELS[status]}</span>
                </div>
                <h3 class="chapter-card-title">${ch.title}</h3>
                <span class="chapter-card-arrow"><i class="fas fa-arrow-right"></i></span>
            </a>`;
    }).join('');
}

function updateProgress() {
    const completed = getCompletedCount();
    const total = CHAPTERS.length;
    const pct = Math.round((completed / total) * 100);
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${completed} / ${total} 章完了`;
}

function initFilter() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            document.querySelectorAll('.chapter-card').forEach(card => {
                const match = filter === 'all' || card.dataset.status === filter;
                card.classList.toggle('hidden', !match);
            });
        });
    });
}

/* ===================================
   Chapter Page
   =================================== */

function initChapter() {
    const chNum = parseInt(document.body.dataset.chapter, 10);
    if (!chNum) return;

    const ch = CHAPTERS.find(c => c.num === chNum);
    if (!ch) return;

    // Inject title & labels
    document.title = `第${chNum}章: ${ch.title} - 統計学学習ノート`;
    setText('chapter-title', ch.title);
    setText('chapter-label', `CHAPTER ${chNum}`);
    setText('nav-chapter-label', `第${chNum}章`);
    setText('breadcrumb-chapter', `第${chNum}章`);

    setupPager(chNum);
    setupStatusToggle(chNum);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setupPager(chNum) {
    const prev = document.getElementById('prev-link');
    const next = document.getElementById('next-link');

    if (prev) {
        if (chNum > 1) {
            prev.href = `chapter${chNum - 1}.html`;
        } else {
            prev.classList.add('disabled');
        }
    }
    if (next) {
        if (chNum < CHAPTERS.length) {
            next.href = `chapter${chNum + 1}.html`;
        } else {
            next.classList.add('disabled');
        }
    }
}

function setupStatusToggle(chNum) {
    const btn = document.getElementById('status-toggle');
    if (!btn) return;

    const TOGGLE_LABELS = {
        'not-started': '<i class="fas fa-play"></i> 学習を始める',
        'in-progress': '<i class="fas fa-check"></i> 完了にする',
        'completed':   '<i class="fas fa-redo"></i> 未完了に戻す',
    };

    const NEXT_STATUS = {
        'not-started': 'in-progress',
        'in-progress': 'completed',
        'completed':   'not-started',
    };

    const update = () => {
        const s = getStatus(chNum);
        btn.className = `status-toggle status-btn-${s}`;
        btn.innerHTML = TOGGLE_LABELS[s];
    };

    btn.addEventListener('click', () => {
        const current = getStatus(chNum);
        setStatus(chNum, NEXT_STATUS[current]);
        update();
    });

    update();
}
