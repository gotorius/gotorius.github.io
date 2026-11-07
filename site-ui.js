(function () {
    'use strict';

    const translations = {
        ja: {
            'nav.primaryAria': 'メインナビゲーション',
            'nav.homeAria': '後藤良輔のプロフィールの先頭へ',
            'apps.note': 'AIで作成したWebApp/Site',
            'apps.statistics.description': '統計を学ぶ',
            'apps.games.description': '遊んでみる',
            'profile.kicker': '研究プロフィール',
            'profile.name': '後藤 良輔',
            'profile.secondaryName': 'Ryosuke Goto',
            'profile.role': '修士学生・コンピュータビジョン',
            'affiliation.program': '筑波大学',
            'affiliation.school': '理工情報生命学術院 システム情報工学研究群',
            'affiliation.schoolName': '理工情報生命学術院',
            'affiliation.schoolGroup': 'システム情報工学研究群',
            'affiliation.degree': '情報理工学位プログラム',
            'affiliation.year': '修士1年',
            'affiliation.lab': 'ヒューマンセンタードビジョン研究室',
            'affiliation.aist': '産業技術総合研究所（AIST）',
            'research.kicker': '研究テーマ',
            'research.tagVision': 'コンピュータビジョン',
            'research.tagMotion': '動作生成',
            'research.tagHOI': '手と物体の相互作用',
            'bio.1': '2026年4月より筑波大学大学院 情報理工学位プログラムに在籍しています。',
            'bio.1.before': '2026年4月より',
            'bio.1.program': '筑波大学大学院 情報理工学位プログラム',
            'bio.1.after': 'に在籍しています。',
            'bio.2': '学部（九州工業大学）では生命情報学・機械学習の基礎を学び、卒業研究では医用画像処理とAIセキュリティに取り組みました。',
            'bio.3': '現在は筑波大学連携大学院として、産業技術総合研究所（AIST）ヒューマンセンタードビジョン研究室・佐藤研究室にて、コンピュータビジョンの研究に従事しています。',
            'bio.3.before': '現在は筑波大学連携大学院として、',
            'bio.3.aist': '産業技術総合研究所（AIST）',
            'bio.3.between': ' ',
            'bio.3.lab': 'ヒューマンセンタードビジョン研究室・佐藤研究室',
            'bio.3.after': 'にて、コンピュータビジョンの研究に従事しています。',
            'bio.4': '現在の研究では、テキストで与えられた指示と物体形状情報をもとに、人の手と物体の3次元的な相互作用動作を生成するText-to-3D Hand-Object Interaction（Text2HOI）に関する研究に取り組んでいます。',
            'section.experience': '長期インターン',
            'section.activities': '活動',
            'section.qualifications': '資格',
            'badge.ra': 'RA',
            'badge.internship': 'インターン',
            'badge.hackathon': 'ハッカソン',
            'badge.conference': '国内学会',
            'badge.courses': '修了講座',
            'experience.aist.title': '産業技術総合研究所（AIST） Research Assistant',
            'experience.aist.dates': '2026年9月–',
            'experience.aist.description': 'AIST FRONTia・Vision',
            'experience.nec.title': '日本電気株式会社（NEC）',
            'experience.nec.dates': '2026年7月–8月',
            'experience.nec.description': 'AI Engineer',
            'activity.hackathon.title': 'Progateハッカソン powered by AWS',
            'activity.hackathon.award': '企業賞 受賞 — 2026年4月',
            'activity.paper.title': '拡散モデルを用いた敵対的摂動除去による医用画像分類システム防御',
            'activity.paper.venue': '情報処理学会 バイオ情報学研究会（SIGBIO） — 2026年3月',
            'activity.courses.title': '東京大学 松尾研究室 修了講座',
            'activity.courses.gci': 'GCI 2024 Winter（2024年）',
            'activity.courses.dl': 'Deep Learning Basic 2025 Autumn（2025年）',
            'activity.courses.llm': '大規模言語モデル講座基礎編（2025年）',
            'qualification.statistics': '統計検定準1級（日本統計学会）',
            'links.code': 'GitHub',
            'links.event': 'イベントページ',
            'links.conference': '学会ページ',
            'contact.aria': '連絡先・プロフィールリンク',
            'footer.note': 'Computer vision · Motion generation',
            'canvas.description': '黄色いロボットアームが手前に散らばったGOTOの文字ブロックを拾ってRYOSUKEの上に並べ、右から来たヒューマノイドが蹴りやパンチで崩し、最後は昇竜拳でGを打ち上げて去る、繰り返しのアニメーション。ドラッグまたは矢印キーで視点を回転。ロボットや文字のクリック、またはEnterキーで停止・再開。Escapeキーで停止します。',
            'meta.description': '後藤良輔の研究プロフィール。コンピュータビジョンとText-to-3D Hand-Object Interactionの研究、およびロボットが名前を並べる3Dアニメーション。',
        },
        en: {
            'nav.primaryAria': 'Main navigation',
            'nav.homeAria': 'Ryosuke Goto — back to top',
            'apps.note': 'Web apps and sites built with AI',
            'apps.statistics.description': 'Learn statistics',
            'apps.games.description': 'Play a game',
            'profile.kicker': 'Research profile',
            'profile.name': 'Ryosuke Goto',
            'profile.secondaryName': '後藤 良輔',
            'profile.role': "Master's student · Computer vision",
            'affiliation.program': 'University of Tsukuba',
            'affiliation.school': 'Graduate School of Science and Technology · Degree Programs in Systems and Information Engineering',
            'affiliation.schoolName': 'Graduate School of Science and Technology',
            'affiliation.schoolGroup': 'Degree Programs in Systems and Information Engineering',
            'affiliation.degree': "Master's Program in Computer Science",
            'affiliation.year': "First-year master's student",
            'affiliation.lab': 'Human-Centered Vision Laboratory',
            'affiliation.aist': 'National Institute of Advanced Industrial Science and Technology (AIST)',
            'research.kicker': 'Research',
            'research.tagVision': 'Computer vision',
            'research.tagMotion': 'Motion generation',
            'research.tagHOI': 'Hand–object interaction',
            'bio.1': "I joined the Master's Program in Computer Science at the University of Tsukuba in April 2026.",
            'bio.1.before': 'I joined the ',
            'bio.1.program': "Master's Program in Computer Science at the University of Tsukuba",
            'bio.1.after': ' in April 2026.',
            'bio.2': 'As an undergraduate at Kyushu Institute of Technology, I studied the foundations of bioinformatics and machine learning. My graduation research focused on medical image processing and AI security.',
            'bio.3': "As part of the University of Tsukuba's cooperative graduate school program, I conduct research in computer vision at AIST's Human-Centered Vision Laboratory (Satoh Laboratory).",
            'bio.3.before': "As part of the University of Tsukuba's cooperative graduate school program, I conduct research in computer vision at ",
            'bio.3.aist': 'AIST',
            'bio.3.between': "'s ",
            'bio.3.lab': 'Human-Centered Vision Laboratory (Satoh Laboratory)',
            'bio.3.after': '.',
            'bio.4': 'My current research focuses on Text-to-3D Hand-Object Interaction (Text2HOI): generating 3D interactions between human hands and objects from text instructions and object shape information.',
            'section.experience': 'Experience',
            'section.activities': 'Activities',
            'section.qualifications': 'Qualifications',
            'badge.ra': 'RA',
            'badge.internship': 'Internship',
            'badge.hackathon': 'Hackathon',
            'badge.conference': 'Domestic conference',
            'badge.courses': 'Courses',
            'experience.aist.title': 'Research Assistant, AIST',
            'experience.aist.dates': 'September 2026–',
            'experience.aist.description': 'AIST FRONTia・Vision',
            'experience.nec.title': 'NEC Corporation',
            'experience.nec.dates': 'July–August 2026',
            'experience.nec.description': 'AI Engineer',
            'activity.hackathon.title': 'Progate Hackathon powered by AWS',
            'activity.hackathon.award': 'Company Award · April 2026',
            'activity.paper.title': 'Defending Medical Image Classification Systems by Removing Adversarial Perturbations with Diffusion Models',
            'activity.paper.venue': 'IPSJ SIGBIO · March 2026',
            'activity.courses.title': 'Courses completed, Matsuo Laboratory, The University of Tokyo',
            'activity.courses.gci': 'GCI 2024 Winter (2024)',
            'activity.courses.dl': 'Deep Learning Basic 2025 Autumn (2025)',
            'activity.courses.llm': 'Large Language Models: Fundamentals (2025)',
            'qualification.statistics': 'Statistics Test, Pre-Grade 1 (Japan Statistical Society)',
            'links.code': 'GitHub',
            'links.event': 'Event page',
            'links.conference': 'Conference page',
            'contact.aria': 'Contact and profile links',
            'footer.note': 'Computer vision · Motion generation',
            'canvas.description': 'Looping animation of a yellow robot arm picking up scattered GOTO letter blocks and arranging them above RYOSUKE. A humanoid enters from the right, scatters the blocks with simple kicks and a punch, finishes by launching G with a jumping uppercut, and leaves. Drag or use the arrow keys to rotate the view. Click a robot or a letter, or press Enter, to pause or resume. Press Escape to pause.',
            'meta.description': "Ryosuke Goto's research profile: computer vision, Text-to-3D Hand-Object Interaction, and an interactive 3D robot animation that arranges his name.",
        },
    };
    const storageKey = 'ryosuke-goto-language';
    const languageToggle = document.getElementById('language-toggle');
    const languageLabel = document.getElementById('language-label');
    let currentLanguage = 'ja';

    function translate(language, persist) {
        currentLanguage = language === 'en' ? 'en' : 'ja';
        const dictionary = translations[currentLanguage];
        const bindings = [
            ['data-i18n', null],
            ['data-i18n-aria-label', 'aria-label'],
            ['data-i18n-content', 'content'],
        ];
        for (const [binding, attribute] of bindings) {
            document.querySelectorAll(`[${binding}]`).forEach(element => {
                const key = element.getAttribute(binding);
                if (!Object.prototype.hasOwnProperty.call(dictionary, key)) return;
                if (attribute) element.setAttribute(attribute, dictionary[key]);
                else element.textContent = dictionary[key];
            });
        }
        document.documentElement.lang = currentLanguage;
        document.title = currentLanguage === 'ja' ? '後藤 良輔 | Ryosuke Goto' : 'Ryosuke Goto | 後藤 良輔';
        if (languageLabel) {
            languageLabel.textContent = currentLanguage === 'ja' ? 'EN' : '日本語';
            languageLabel.lang = currentLanguage === 'ja' ? 'en' : 'ja';
        }
        if (languageToggle) {
            const label = currentLanguage === 'ja' ? '英語に切り替える' : 'Switch to Japanese';
            languageToggle.setAttribute('aria-label', label);
            languageToggle.setAttribute('title', label);
        }
        if (persist) {
            try {
                window.localStorage.setItem(storageKey, currentLanguage);
            } catch (_) {
                // Language changes also work in file previews and private browsing.
            }
        }
    }

    try {
        if (window.localStorage.getItem(storageKey) === 'en') currentLanguage = 'en';
    } catch (_) {
        // The Japanese HTML remains the default when storage is unavailable.
    }
    translate(currentLanguage, false);
    languageToggle?.addEventListener('click', () => translate(currentLanguage === 'ja' ? 'en' : 'ja', true));

    const appsMenu = document.getElementById('apps-menu');
    const appsToggle = document.getElementById('apps-toggle');
    const appsPanel = document.getElementById('apps-panel');
    if (!appsMenu || !appsToggle || !appsPanel) return;

    function syncExpanded() {
        appsToggle.setAttribute('aria-expanded', String(appsMenu.open));
    }
    function closeApps(restoreFocus) {
        if (!appsMenu.open) return;
        appsMenu.open = false;
        syncExpanded();
        if (restoreFocus) appsToggle.focus();
    }
    function appLinks() {
        return Array.from(appsPanel.querySelectorAll('a[href]'));
    }

    appsMenu.addEventListener('toggle', syncExpanded);
    syncExpanded();
    document.addEventListener('pointerdown', event => {
        if (!appsMenu.contains(event.target)) closeApps(false);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && appsMenu.open) {
            event.preventDefault();
            closeApps(true);
        }
    });
    appsToggle.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        appsMenu.open = true;
        syncExpanded();
        const links = appLinks();
        (event.key === 'ArrowDown' ? links[0] : links[links.length - 1])?.focus();
    });
    appsPanel.addEventListener('keydown', event => {
        const links = appLinks();
        const index = links.indexOf(document.activeElement);
        if (index < 0) return;
        let next;
        if (event.key === 'ArrowDown') next = (index + 1) % links.length;
        else if (event.key === 'ArrowUp') next = (index - 1 + links.length) % links.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = links.length - 1;
        else return;
        event.preventDefault();
        links[next].focus();
    });
    appsPanel.addEventListener('click', event => {
        const link = event.target.closest?.('a[href]');
        if (link && appsPanel.contains(link)) closeApps(false);
    });
    appsMenu.addEventListener('focusout', event => {
        if (event.relatedTarget && !appsMenu.contains(event.relatedTarget)) closeApps(false);
    });
}());
