/**
 * 統計学ノート - 共通スクリプト
 * ハブページとチャプターページの両方で使用
 */
document.addEventListener('DOMContentLoaded', () => {
    // 共通ナビバー: モバイルハンバーガーメニュー
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        // メニュー外クリックで閉じる
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    const isHub = document.getElementById('chapter-grid');
    isHub ? initHub() : initChapter();
});

/* ===================================
   Hub Page
   =================================== */

function initHub() {
    const grid = document.getElementById('chapter-grid');
    grid.innerHTML = CHAPTERS.map((ch, i) => `
        <a href="chapters/chapter${ch.num}.html"
           class="chapter-card"
           style="animation-delay: ${i * 0.03}s">
            <div class="chapter-card-header">
                <span class="chapter-num">第${ch.num}章</span>
            </div>
            <h3 class="chapter-card-title">${ch.title}</h3>
            <span class="chapter-card-arrow"><i class="fas fa-arrow-right"></i></span>
        </a>`
    ).join('');

    const examGrid = document.getElementById('exam-grid');
    examGrid.innerHTML = CHAPTERS.map((ch, i) => {
        const hasPage = [8, 9, 10, 11, 12, 13, 14, 15].includes(ch.num); // 解説ページが存在する章番号
        if (hasPage) {
            return `
        <a href="chapters/exam${ch.num}.html"
           class="exam-card exam-card--ready"
           style="animation-delay: ${i * 0.03}s">
            <div class="chapter-card-header">
                <span class="chapter-num">第${ch.num}章</span>
                <span class="exam-badge exam-badge--ready"><i class="fas fa-circle-check"></i> 解説あり</span>
            </div>
            <h3 class="chapter-card-title">${ch.title}</h3>
            <span class="chapter-card-arrow"><i class="fas fa-arrow-right"></i></span>
        </a>`;
        }
        return `
        <div class="exam-card"
             style="animation-delay: ${i * 0.03}s">
            <div class="chapter-card-header">
                <span class="chapter-num">第${ch.num}章</span>
                <span class="exam-badge"><i class="fas fa-clock"></i> 準備中</span>
            </div>
            <h3 class="chapter-card-title">${ch.title}</h3>
        </div>`;
    }).join('');

    // モード切り替え
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            grid.style.display = mode === 'study' ? '' : 'none';
            examGrid.style.display = mode === 'exam' ? '' : 'none';
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

    document.title = `第${chNum}章: ${ch.title} - 統計学まとめノート`;
    setText('chapter-title', ch.title);
    setText('chapter-label', `CHAPTER ${chNum}`);
    setText('nav-chapter-label', `第${chNum}章`);
    setText('breadcrumb-chapter', `第${chNum}章`);

    setupPager(chNum);
    buildChapterNav(chNum);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function buildChapterNav(chNum) {
    const sidebar = document.querySelector('.chapter-toc-sidebar');
    if (!sidebar) return;

    const nav = document.createElement('div');
    nav.className = 'chapter-nav-box';

    const title = document.createElement('h2');
    title.innerHTML = '<i class="fas fa-book"></i>全章一覧';
    nav.appendChild(title);

    const list = document.createElement('ul');
    CHAPTERS.forEach(ch => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `chapter${ch.num}.html`;
        a.innerHTML = `<span class="cnav-num">${ch.num}</span><span class="cnav-title">${ch.title}</span>`;
        if (ch.num === chNum) {
            li.classList.add('cnav-current');
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        list.appendChild(li);
    });
    nav.appendChild(list);
    sidebar.appendChild(nav);

    // 現在章が見えるようにスクロール
    const currentItem = list.querySelector('.cnav-current a');
    if (currentItem) {
        requestAnimationFrame(() => currentItem.scrollIntoView({ block: 'nearest' }));
    }
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
