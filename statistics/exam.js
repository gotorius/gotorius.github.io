/**
 * 統計検定 準1級 模擬試験エンジン
 * - 問題バンクから30問をランダム出題
 * - 60分タイマー
 * - 結果表示（正答数・正答率・各問正誤・解説）
 */
(function () {
    'use strict';

    const TOTAL_QUESTIONS = 30;
    const TIME_LIMIT = 60 * 60; // 60分（秒）

    let questions = [];
    let currentIndex = 0;
    let answers = [];       // ユーザの回答（choice index or null）
    let timerInterval = null;
    let remainingTime = TIME_LIMIT;
    let examFinished = false;

    /* ---------- DOM refs ---------- */
    const startScreen   = document.getElementById('exam-start');
    const examScreen    = document.getElementById('exam-main');
    const resultScreen  = document.getElementById('exam-result');

    const btnStart      = document.getElementById('btn-start');
    const btnNext       = document.getElementById('btn-next');
    const btnPrev       = document.getElementById('btn-prev');
    const btnFinish     = document.getElementById('btn-finish');
    const btnRetry      = document.getElementById('btn-retry');

    const timerEl       = document.getElementById('timer');
    const progressEl    = document.getElementById('progress-text');
    const progressBar   = document.getElementById('progress-bar');
    const qCategoryEl   = document.getElementById('q-category');
    const qNumberEl     = document.getElementById('q-number');
    const qTextEl       = document.getElementById('q-text');
    const choicesEl     = document.getElementById('choices');
    const qNavEl        = document.getElementById('q-nav');

    /* ---------- Utils ---------- */
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function renderMath(el) {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(el, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    }

    /* ---------- Init ---------- */
    function initExam() {
        // カテゴリバランスを考慮しつつランダム抽出
        questions = selectQuestions(TOTAL_QUESTIONS);
        answers = new Array(questions.length).fill(null);
        currentIndex = 0;
        remainingTime = TIME_LIMIT;
        examFinished = false;

        startScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        examScreen.classList.remove('hidden');

        buildNavGrid();
        renderQuestion();
        startTimer();
    }

    /** カテゴリ分散を考慮した出題 */
    function selectQuestions(n) {
        const byCategory = {};
        EXAM_QUESTIONS.forEach(q => {
            if (!byCategory[q.category]) byCategory[q.category] = [];
            byCategory[q.category].push(q);
        });
        const categories = Object.keys(byCategory);
        // カテゴリごとにシャッフル
        categories.forEach(c => { byCategory[c] = shuffle(byCategory[c]); });

        const selected = [];
        let round = 0;
        while (selected.length < n) {
            let added = false;
            for (const c of categories) {
                if (selected.length >= n) break;
                if (round < byCategory[c].length) {
                    selected.push(byCategory[c][round]);
                    added = true;
                }
            }
            if (!added) break;
            round++;
        }
        return shuffle(selected);
    }

    /* ---------- Timer ---------- */
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            remainingTime--;
            updateTimerDisplay();
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                finishExam();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        timerEl.innerHTML = `<i class="fas fa-clock"></i> ${formatTime(remainingTime)}`;
        if (remainingTime <= 300) {
            timerEl.classList.add('timer-warning');
        }
    }

    /* ---------- Render question ---------- */
    function renderQuestion() {
        const q = questions[currentIndex];

        qCategoryEl.textContent = q.category;
        qNumberEl.textContent = `問 ${currentIndex + 1} / ${questions.length}`;
        qTextEl.innerHTML = q.question;

        choicesEl.innerHTML = '';
        q.choices.forEach((c, i) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            if (answers[currentIndex] === i) btn.classList.add('selected');
            btn.innerHTML = `<span class="choice-label">${String.fromCharCode(65 + i)}</span><span class="choice-text">${c}</span>`;
            btn.addEventListener('click', () => selectChoice(i));
            choicesEl.appendChild(btn);
        });

        // progress
        const answered = answers.filter(a => a !== null).length;
        progressEl.textContent = `${answered} / ${questions.length} 回答済み`;
        progressBar.style.width = `${(answered / questions.length) * 100}%`;

        // nav buttons
        btnPrev.disabled = currentIndex === 0;

        // nav grid highlight
        qNavEl.querySelectorAll('.nav-dot').forEach((dot, i) => {
            dot.classList.toggle('current', i === currentIndex);
            dot.classList.toggle('answered', answers[i] !== null);
        });

        // render math
        renderMath(qTextEl);
        renderMath(choicesEl);
    }

    function selectChoice(idx) {
        answers[currentIndex] = idx;
        renderQuestion();
    }

    function buildNavGrid() {
        qNavEl.innerHTML = '';
        questions.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'nav-dot';
            dot.textContent = i + 1;
            dot.title = `問${i + 1}`;
            dot.addEventListener('click', () => {
                currentIndex = i;
                renderQuestion();
            });
            qNavEl.appendChild(dot);
        });
    }

    /* ---------- Finish ---------- */
    function finishExam() {
        if (examFinished) return;
        examFinished = true;
        clearInterval(timerInterval);

        examScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');

        let correct = 0;
        questions.forEach((q, i) => {
            if (answers[i] === q.answer) correct++;
        });

        const rate = ((correct / questions.length) * 100).toFixed(1);
        document.getElementById('result-score').textContent = `${correct} / ${questions.length}`;
        document.getElementById('result-rate').textContent = `${rate}%`;

        const elapsed = TIME_LIMIT - remainingTime;
        document.getElementById('result-time').textContent = formatTime(elapsed);

        // pass / fail
        const badge = document.getElementById('result-badge');
        if (correct >= 20) {
            badge.textContent = '合格ライン到達！';
            badge.className = 'result-badge pass';
        } else {
            badge.textContent = 'もう少し…';
            badge.className = 'result-badge fail';
        }

        // category breakdown
        renderCategoryBreakdown(correct);

        // detail list
        renderResultDetails();
    }

    function renderCategoryBreakdown() {
        const cats = {};
        questions.forEach((q, i) => {
            if (!cats[q.category]) cats[q.category] = { total: 0, correct: 0 };
            cats[q.category].total++;
            if (answers[i] === q.answer) cats[q.category].correct++;
        });

        const container = document.getElementById('category-breakdown');
        container.innerHTML = '';
        Object.entries(cats).forEach(([cat, data]) => {
            const pct = Math.round((data.correct / data.total) * 100);
            const row = document.createElement('div');
            row.className = 'cat-row';
            row.innerHTML = `
                <span class="cat-name">${cat}</span>
                <span class="cat-score">${data.correct}/${data.total}</span>
                <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
                <span class="cat-pct">${pct}%</span>`;
            container.appendChild(row);
        });
    }

    function renderResultDetails() {
        const container = document.getElementById('result-details');
        container.innerHTML = '';

        questions.forEach((q, i) => {
            const isCorrect = answers[i] === q.answer;
            const div = document.createElement('div');
            div.className = `result-item ${isCorrect ? 'correct' : 'wrong'}`;

            const userAnswer = answers[i] !== null
                ? `${String.fromCharCode(65 + answers[i])}) ${q.choices[answers[i]]}`
                : '<em>未回答</em>';
            const correctAnswer = `${String.fromCharCode(65 + q.answer)}) ${q.choices[q.answer]}`;

            div.innerHTML = `
                <div class="result-item-header">
                    <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
                    <span class="result-q-num">問${i + 1}</span>
                    <span class="result-q-cat">${q.category}</span>
                </div>
                <div class="result-q-text">${q.question}</div>
                <div class="result-answers">
                    <div class="result-your-answer ${isCorrect ? '' : 'wrong-answer'}">
                        <strong>あなたの回答：</strong>${userAnswer}
                    </div>
                    ${!isCorrect ? `<div class="result-correct-answer"><strong>正解：</strong>${correctAnswer}</div>` : ''}
                </div>
                <div class="result-explanation">
                    <strong>解説：</strong>${q.explanation}
                </div>`;
            container.appendChild(div);
            renderMath(div);
        });
    }

    /* ---------- Events ---------- */
    btnStart.addEventListener('click', initExam);

    btnNext.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    });

    btnFinish.addEventListener('click', () => {
        const unanswered = answers.filter(a => a === null).length;
        let msg = '試験を終了しますか？';
        if (unanswered > 0) {
            msg = `未回答が ${unanswered} 問あります。終了しますか？`;
        }
        if (confirm(msg)) {
            finishExam();
        }
    });

    btnRetry.addEventListener('click', () => {
        resultScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });

})();
