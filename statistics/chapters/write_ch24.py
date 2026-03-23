#!/usr/bin/env python3
filepath = '/Users/gotou1/goto/statistics/chapters/chapter24.html'
content = open(filepath, 'r').read()

main_start = content.find('<main class="chapter-body">')
header = content[:main_start]

new_main = """<main class="chapter-body">
        <div class="container">
            <div class="chapter-layout">

                <!-- ====== サイドバー目次 ====== -->
                <aside class="chapter-toc-sidebar">
                    <div class="toc-box">
                        <h2><i class="fas fa-list"></i>目次</h2>
                        <ol>
                            <li><a href="#intro">はじめに</a></li>
                            <li><a href="#distance">距離・非類似度</a></li>
                            <li><a href="#hierarchical">階層的クラスタリング</a></li>
                            <li><a href="#linkage">連結法の種類</a></li>
                            <li><a href="#kmeans">k-means法</a></li>
                            <li><a href="#mixture">混合分布とEMアルゴリズム</a></li>
                            <li><a href="#formulas">公式まとめ</a></li>
                            <li><a href="#problems">例題・演習</a></li>
                            <li><a href="#notes">まとめ・ポイント</a></li>
                        </ol>
                    </div>
                </aside>

                <div class="chapter-content">

                <section class="content-section section-anchor" id="intro">
                    <h2><i class="fas fa-book-open"></i> はじめに：「似たものを自動でグループ化する」</h2>
                    <p>
                        マーケターが「購買パターンが似た顧客をグループに分けてそれぞれに最適な広告を打ちたい」と考えるとき、
                        生物学者が「遺伝子発現パターンが近い遺伝子を同一グループにまとめたい」と考えるとき、
                        データそのものを眺めてグループに分ける作業が必要になります。
                        しかし、正解ラベル（「この顧客は顧客AタイプかBタイプか」という答え）はありません。
                        このような状況で使う手法が<strong>クラスター分析（cluster analysis）</strong>です。
                    </p>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-question-circle"></i> クラスター分析とは何か</p>
                        <p>
                            クラスター分析は、ラベルのないデータを「似ているもの同士」のグループ（クラスター）に
                            自動で分類する<strong>教師なし学習（unsupervised learning）</strong>の代表的手法です。
                        </p>
                        <p>
                            前章の判別分析は「正解ラベル付きデータから判別ルールを学ぶ」教師あり学習でした。
                            クラスター分析はその対極——「正解ラベルなしで、データ自体の構造からグループを発見する」手法です。
                        </p>
                    </div>
                    <h3>なぜ「距離」が重要か</h3>
                    <p>
                        「似ている」を定量化するのが<strong>距離（distance）</strong>または<strong>非類似度（dissimilarity）</strong>です。
                        同じデータに対して、どの距離を使うかでクラスターの形が大きく変わります。
                        たとえば、身長（cm）と体重（kg）を一緒に扱う場合、身長の1cm差と体重の1kg差が等しい意味を持つとは限りません——
                        このような<strong>スケール問題</strong>を解決するマハラノビス距離が重要になります。
                    </p>
                    <h3>この章で学ぶこと</h3>
                    <ol>
                        <li><strong>距離・非類似度：</strong>ミンコフスキー距離（ユークリッド・マンハッタン）、マハラノビス距離</li>
                        <li><strong>階層的クラスタリング：</strong>デンドログラムで全ての統合過程を可視化</li>
                        <li><strong>連結法（linkage）：</strong>単連結・完全連結・重心法・群平均法・ウォード法の比較</li>
                        <li><strong>非階層的クラスタリング（k-means法）：</strong>$k$ 個のクラスターに反復的に分類する高速な手法</li>
                        <li><strong>混合分布とEMアルゴリズム：</strong>確率モデルベースのソフトな分類</li>
                    </ol>
                    <p><strong>キーワード：</strong>ミンコフスキー距離、マハラノビス距離、デンドログラム、ウォード法、k-means、EMアルゴリズム、混合正規分布</p>
                </section>

                <section class="content-section section-anchor" id="distance">
                    <h2><i class="fas fa-ruler"></i> 距離・非類似度</h2>

                    <h3>ミンコフスキー距離</h3>
                    <p>
                        $p$ 次元空間の2点 $\\boldsymbol{x} = (x_1, \\ldots, x_p)^T$、$\\boldsymbol{y} = (y_1, \\ldots, y_p)^T$ 間の
                        <strong>ミンコフスキー距離</strong>（次数 $m$）：
                    </p>
                    <div class="formula-block">
                        $$d_m(\\boldsymbol{x}, \\boldsymbol{y}) = \\left(\\sum_{k=1}^{p} |x_k - y_k|^m\\right)^{1/m}$$
                    </div>
                    <table>
                        <thead><tr><th>次数 $m$</th><th>名称</th><th>特徴</th></tr></thead>
                        <tbody>
                            <tr><td>$m=1$</td><td>マンハッタン距離（L1ノルム）</td><td>絶対値の和。外れ値に頑健</td></tr>
                            <tr><td>$m=2$</td><td>ユークリッド距離（L2ノルム）</td><td>直線距離。最も一般的</td></tr>
                            <tr><td>$m=\\infty$</td><td>チェビシェフ距離</td><td>最大成分差 $\\max_k|x_k-y_k|$</td></tr>
                        </tbody>
                    </table>

                    <h3>マハラノビス距離</h3>
                    <p>
                        共分散行列 $\\Sigma$ を考慮した、スケール不変・相関考慮の距離：
                    </p>
                    <div class="formula-block">
                        $$d_M(\\boldsymbol{x}, \\boldsymbol{y}) = \\sqrt{(\\boldsymbol{x}-\\boldsymbol{y})^T \\Sigma^{-1} (\\boldsymbol{x}-\\boldsymbol{y})}$$
                    </div>
                    <p>
                        $\\Sigma = I$（単位行列）のときはユークリッド距離に一致する。
                        変量間の相関や分散の違いを自動的に補正するため、異なる単位・スケールの変量が混在するデータに適している。
                    </p>

                    <h3>距離行列</h3>
                    <p>
                        $n$ 個のサンプル全ての組み合わせの距離をまとめた $n \\times n$ の対称行列。
                        対角要素は0。これが階層的クラスタリングの入力になる。
                    </p>

                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-exclamation-triangle"></i> スケールに注意</p>
                        <p>
                            ユークリッド距離はスケールに敏感です。例えば変量1を「cm」から「m」に変えると距離が1/100になります。
                            クラスター分析を行う前に<strong>標準化（平均0・分散1）</strong>するか、マハラノビス距離を使うかを検討してください。
                        </p>
                    </div>
                </section>

                <section class="content-section section-anchor" id="hierarchical">
                    <h2><i class="fas fa-sitemap"></i> 階層的クラスタリング</h2>

                    <h3>凝集型（ボトムアップ）アプローチ</h3>
                    <p>
                        最も一般的な階層的クラスタリングは<strong>凝集型（agglomerative）</strong>で、
                        全サンプルを個別のクラスターとして出発し、最も近いクラスターを順に統合していく：
                    </p>
                    <ol>
                        <li>各サンプルを独立したクラスター（$n$ 個）とする</li>
                        <li>距離が最も小さい2クラスターを統合する（$n-1$ 個に）</li>
                        <li>新しいクラスターと他のクラスター間の距離を更新する</li>
                        <li>$n-1$ 回繰り返す（最終的に1つのクラスターになる）</li>
                    </ol>

                    <h3>デンドログラム（樹形図）</h3>
                    <p>
                        統合の過程を縦軸（クラスター間距離）、横軸（サンプル）で表した図が
                        <strong>デンドログラム（dendrogram）</strong>。
                        縦軸の「切断位置」によって、クラスター数を自由に決められる。
                    </p>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-cut"></i> クラスター数の決め方</p>
                        <p>
                            デンドログラムで「隣接する統合間距離が急激に増加する」段階を探し、
                            その直前の段階のクラスター数を採用することが多い（<strong>ジャンプ基準</strong>）。
                            「なぜ急に距離が増えたか」は、それ以上統合するとかなり異なるものを同じグループに入れることを意味する。
                        </p>
                    </div>
                </section>

                <section class="content-section section-anchor" id="linkage">
                    <h2><i class="fas fa-link"></i> 連結法（Linkage Method）の種類</h2>

                    <p>
                        クラスター統合時の「クラスター間距離」の定義が<strong>連結法（リンケージ）</strong>。
                        どの連結法を使うかでクラスターの形が変わる。
                    </p>

                    <h3>5種類の連結法</h3>
                    <p>
                        クラスター $C_A$（重心 $\\bar{\\boldsymbol{x}}_A$、サイズ $n_A$）と $C_B$（重心 $\\bar{\\boldsymbol{x}}_B$、サイズ $n_B$）の距離：
                    </p>
                    <table>
                        <thead><tr><th>連結法</th><th>定義</th><th>特徴</th></tr></thead>
                        <tbody>
                            <tr>
                                <td><strong>単連結（single linkage）</strong></td>
                                <td>最近傍点間距離 $\\min_{\\boldsymbol{x}\\in C_A,\\boldsymbol{y}\\in C_B} d(\\boldsymbol{x},\\boldsymbol{y})$</td>
                                <td>鎖状に長く繋がるクラスター（chaining）が出やすい</td>
                            </tr>
                            <tr>
                                <td><strong>完全連結（complete linkage）</strong></td>
                                <td>最遠点間距離 $\\max_{\\boldsymbol{x}\\in C_A,\\boldsymbol{y}\\in C_B} d(\\boldsymbol{x},\\boldsymbol{y})$</td>
                                <td>コンパクトで均一なクラスターが得られやすい</td>
                            </tr>
                            <tr>
                                <td><strong>重心法（centroid linkage）</strong></td>
                                <td>重心間距離 $d(\\bar{\\boldsymbol{x}}_A, \\bar{\\boldsymbol{x}}_B)$</td>
                                <td>重心が逆転する「逆転現象」が起きることがある</td>
                            </tr>
                            <tr>
                                <td><strong>群平均法（average linkage）</strong></td>
                                <td>全点対の平均距離 $\\dfrac{1}{n_A n_B}\\sum_{\\boldsymbol{x}\\in A}\\sum_{\\boldsymbol{y}\\in B}d(\\boldsymbol{x},\\boldsymbol{y})$</td>
                                <td>単・完全連結の中間的性質。バランスよく使われる</td>
                            </tr>
                            <tr>
                                <td><strong>ウォード法（Ward's method）</strong></td>
                                <td>統合後の群内平方和の増加量を最小化</td>
                                <td>均等なサイズのコンパクトなクラスターが得られやすい。最もよく使われる</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3>ウォード法の詳細</h3>
                    <p>
                        クラスター $C_k$ の<strong>群内平方和（within-cluster sum of squares）</strong>：
                        $W_k = \\sum_{\\boldsymbol{x} \\in C_k} \\|\\boldsymbol{x} - \\bar{\\boldsymbol{x}}_k\\|^2$
                    </p>
                    <p>
                        2つのクラスター $C_A$、$C_B$ を統合したときの群内平方和の増加量 $\\Delta W$：
                    </p>
                    <div class="formula-block">
                        $$\\Delta W = W_{A \\cup B} - W_A - W_B = \\frac{n_A n_B}{n_A + n_B}\\|\\bar{\\boldsymbol{x}}_A - \\bar{\\boldsymbol{x}}_B\\|^2$$
                    </div>
                    <p>$\\Delta W$ が最小となる組み合わせを統合していく。</p>
                </section>

                <section class="content-section section-anchor" id="kmeans">
                    <h2><i class="fas fa-random"></i> k-means法（非階層的クラスタリング）</h2>

                    <h3>アルゴリズム</h3>
                    <p>
                        クラスター数 $k$ を事前に指定し、$k$ 個のクラスターに繰り返し割り当てる：
                    </p>
                    <ol>
                        <li>$k$ 個の初期クラスター重心 $\\boldsymbol{\\mu}_1, \\ldots, \\boldsymbol{\\mu}_k$ をランダムに選ぶ</li>
                        <li>各データ点を<strong>最近傍の重心</strong>のクラスターに割り当てる（割り当てステップ）</li>
                        <li>各クラスターの重心を所属データの平均で更新する（更新ステップ）</li>
                        <li>割り当てが変化しなくなるまで2・3を繰り返す</li>
                    </ol>

                    <h3>目的関数（最小化）</h3>
                    <div class="formula-block">
                        $$J = \\sum_{k=1}^{K}\\sum_{\\boldsymbol{x}_i \\in C_k} \\|\\boldsymbol{x}_i - \\boldsymbol{\\mu}_k\\|^2$$
                    </div>
                    <p>
                        これは各クラスター内の点と重心の距離の平方和の総計。
                        k-meansは $J$ の局所最小解に収束する（大域最適解は保証されない）。
                    </p>

                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-exclamation-triangle"></i> k-meansの注意点</p>
                        <ul>
                            <li><strong>初期値依存：</strong>初期重心の選び方によって結果が変わる。k-means++初期化で改善できる</li>
                            <li><strong>クラスター形状：</strong>クラスターが球状でないと（非凸な形状、異なる分散）うまく分離できない</li>
                            <li><strong>$k$ の決め方：</strong>エルボー法（$J$ の減少率）またはシルエット係数で最適 $k$ を選ぶ</li>
                            <li><strong>スケール依存：</strong>ユークリッド距離を使うため、事前の標準化が必要</li>
                        </ul>
                    </div>

                    <h3>エルボー法</h3>
                    <p>
                        $k=1, 2, \\ldots$ と変えながら $J$（群内平方和）をプロットし、
                        $J$ の減少率が急に鈍化する「肘（elbow）」の場所が最適 $k$ の候補となる。
                    </p>
                </section>

                <section class="content-section section-anchor" id="mixture">
                    <h2><i class="fas fa-chart-area"></i> 混合分布とEMアルゴリズム</h2>

                    <h3>確率モデルによるソフトクラスタリング</h3>
                    <p>
                        k-meansは各点を必ず1つのクラスターに「ハード」に割り当てます。
                        <strong>混合分布モデル（mixture model）</strong>は、各クラスター $k$ に正規分布などの確率分布を仮定し、
                        各点がクラスター $k$ に属する<strong>確率（所属確率）</strong>を計算する「ソフト」なクラスタリングです。
                    </p>

                    <h3>混合正規分布モデル</h3>
                    <p>データが $K$ 個の正規分布の混合から生成されると仮定：</p>
                    <div class="formula-block">
                        $$p(\\boldsymbol{x}) = \\sum_{k=1}^{K} \\pi_k \\, \\mathcal{N}(\\boldsymbol{x}; \\boldsymbol{\\mu}_k, \\Sigma_k)$$
                    </div>
                    <p>
                        $\\pi_k$：混合比（$\\sum_k \\pi_k = 1$、$\\pi_k \\geq 0$）<br>
                        $\\mathcal{N}(\\boldsymbol{x}; \\boldsymbol{\\mu}_k, \\Sigma_k)$：平均 $\\boldsymbol{\\mu}_k$、分散共分散行列 $\\Sigma_k$ の多変量正規分布
                    </p>

                    <h3>EMアルゴリズム（期待値最大化法）</h3>
                    <p>
                        対数尤度 $\\log p(\\boldsymbol{x}_1, \\ldots, \\boldsymbol{x}_n)$ を最大化するパラメータを反復的に推定：
                    </p>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-sync-alt"></i> EMの2ステップ</p>
                        <p>
                            <strong>E-ステップ（期待値ステップ）：</strong>
                            現在のパラメータ $\\{\\pi_k, \\boldsymbol{\\mu}_k, \\Sigma_k\\}$ を使って、
                            各サンプル $\\boldsymbol{x}_i$ がクラスター $k$ に属する事後確率（責任度）を計算：
                        </p>
                        <div class="formula-block">
                            $$r_{ik} = \\frac{\\pi_k \\mathcal{N}(\\boldsymbol{x}_i; \\boldsymbol{\\mu}_k, \\Sigma_k)}{\\sum_{j=1}^{K}\\pi_j \\mathcal{N}(\\boldsymbol{x}_i; \\boldsymbol{\\mu}_j, \\Sigma_j)}$$
                        </div>
                        <p>
                            <strong>M-ステップ（最大化ステップ）：</strong>
                            責任度 $r_{ik}$ を使って、加重平均でパラメータを更新：
                        </p>
                        <div class="formula-block">
                            $$\\hat{\\pi}_k = \\frac{\\sum_i r_{ik}}{n}, \\quad
                            \\hat{\\boldsymbol{\\mu}}_k = \\frac{\\sum_i r_{ik}\\boldsymbol{x}_i}{\\sum_i r_{ik}}, \\quad
                            \\hat{\\Sigma}_k = \\frac{\\sum_i r_{ik}(\\boldsymbol{x}_i-\\hat{\\boldsymbol{\\mu}}_k)(\\boldsymbol{x}_i-\\hat{\\boldsymbol{\\mu}}_k)^T}{\\sum_i r_{ik}}$$
                        </div>
                        <p>E-M を繰り返すことで対数尤度は単調増加し、局所最大解に収束する。</p>
                    </div>

                    <h3>k-meansとEMの関係</h3>
                    <p>
                        $\\Sigma_k = \\sigma^2 I$（等分散球形）かつ $r_{ik}$ を「最大の事後確率を持つクラスターに1、他は0」と
                        ハード割り当てに近似したものが k-means と等価になる。
                        つまり k-means は GMM-EM の特殊ケースと見なせる。
                    </p>
                </section>

                <section class="content-section section-anchor" id="formulas">
                    <h2><i class="fas fa-square-root-alt"></i> 公式まとめ</h2>

                    <h3>ミンコフスキー距離</h3>
                    <div class="formula-block">
                        $$d_m(\\boldsymbol{x}, \\boldsymbol{y}) = \\left(\\sum_{k=1}^{p}|x_k - y_k|^m\\right)^{1/m}$$
                    </div>

                    <h3>マハラノビス距離</h3>
                    <div class="formula-block">
                        $$d_M(\\boldsymbol{x}, \\boldsymbol{y}) = \\sqrt{(\\boldsymbol{x}-\\boldsymbol{y})^T\\Sigma^{-1}(\\boldsymbol{x}-\\boldsymbol{y})}$$
                    </div>

                    <h3>ウォード法の統合コスト</h3>
                    <div class="formula-block">
                        $$\\Delta W = \\frac{n_A n_B}{n_A + n_B}\\|\\bar{\\boldsymbol{x}}_A - \\bar{\\boldsymbol{x}}_B\\|^2$$
                    </div>

                    <h3>k-meansの目的関数</h3>
                    <div class="formula-block">
                        $$J = \\sum_{k=1}^{K}\\sum_{\\boldsymbol{x}_i \\in C_k}\\|\\boldsymbol{x}_i - \\boldsymbol{\\mu}_k\\|^2$$
                    </div>

                    <h3>混合正規分布の責任度（EMのEステップ）</h3>
                    <div class="formula-block">
                        $$r_{ik} = \\frac{\\pi_k \\mathcal{N}(\\boldsymbol{x}_i; \\boldsymbol{\\mu}_k, \\Sigma_k)}{\\sum_j \\pi_j \\mathcal{N}(\\boldsymbol{x}_i; \\boldsymbol{\\mu}_j, \\Sigma_j)}$$
                    </div>
                </section>

                <section class="content-section section-anchor" id="problems">
                    <h2><i class="fas fa-pencil-alt"></i> 例題・演習</h2>

                    <h3>問24.1：連結法の比較</h3>
                    <div class="example-block">
                        <span class="prob-badge badge-q">問題</span>
                        <p>
                            5点 A, B, C, D, E があり、ユークリッド距離行列の最小値は $d(A,B)=1$、
                            次に小さいのが $d(C,D)=1.5$、次が $d(AB,C)=2$（AとCの距離）とする。
                            単連結法とウォード法で最初の統合順序はどうなるか。
                        </p>
                    </div>
                    <div class="answer-block">
                        <span class="prob-badge badge-a">解答</span>
                        <p>
                            <strong>単連結法：</strong>最小距離の組を統合 → A,B を統合（距離1）。
                            次に C,D を統合（距離1.5）。
                            次に {A,B} と C の最近傍距離を計算——単連結なので
                            $d(\\{A,B\\}, C) = \\min(d(A,C), d(B,C))$。
                        </p>
                        <p>
                            <strong>ウォード法：</strong>統合コスト $\\Delta W = \\dfrac{n_A n_B}{n_A+n_B}\\|...\\|^2$ が最小の組を選ぶ。
                            A,B の統合コスト $= \\dfrac{1 \\cdot 1}{2} \\times 1^2 = 0.5$（最小）なので同じく A,B から統合。
                        </p>
                        <p>両手法とも第1統合は A,B だが、その後の統合順序はクラスター間距離の定義で異なる。</p>
                    </div>

                    <h3>問24.2：k-meansの収束</h3>
                    <div class="example-block">
                        <span class="prob-badge badge-q">問題</span>
                        <p>
                            1次元データ $\\{1, 2, 8, 9, 25\\}$ を $k=2$ でk-meansする。
                            初期重心を $\\mu_1=1, \\mu_2=25$ とする。
                            1回目の割り当てとその後の更新結果を示せ。
                        </p>
                    </div>
                    <div class="answer-block">
                        <span class="prob-badge badge-a">解答</span>
                        <p>
                            <strong>第1回割り当て：</strong>各点を近い重心に割り当て：
                        </p>
                        <table>
                            <thead><tr><th>点</th><th>$|x-1|$</th><th>$|x-25|$</th><th>割り当て</th></tr></thead>
                            <tbody>
                                <tr><td>1</td><td>0</td><td>24</td><td>$C_1$</td></tr>
                                <tr><td>2</td><td>1</td><td>23</td><td>$C_1$</td></tr>
                                <tr><td>8</td><td>7</td><td>17</td><td>$C_1$</td></tr>
                                <tr><td>9</td><td>8</td><td>16</td><td>$C_1$</td></tr>
                                <tr><td>25</td><td>24</td><td>0</td><td>$C_2$</td></tr>
                            </tbody>
                        </table>
                        <p>
                            <strong>重心更新：</strong>$\\mu_1 = (1+2+8+9)/4 = 5$、$\\mu_2 = 25$
                        </p>
                        <p>
                            <strong>第2回割り当て：</strong>$|8-5|=3 &lt; |8-25|=17$ → $C_1$；$|9-5|=4 &lt; |9-25|=16$ → $C_1$。割り当て変化なし。
                        </p>
                        <p>
                            <strong>収束</strong>：$C_1=\\{1,2,8,9\\}$（重心5）、$C_2=\\{25\\}$（重心25）。
                        </p>
                    </div>

                    <h3>問24.3：距離指標の選択</h3>
                    <div class="example-block">
                        <span class="prob-badge badge-q">問題</span>
                        <p>
                            「身長（cm）・体重（kg）・年収（万円）」の3変量でクラスタリングしたい。
                            ユークリッド距離をそのまま使う問題点と、その解決策を述べよ。
                        </p>
                    </div>
                    <div class="answer-block">
                        <span class="prob-badge badge-a">解答</span>
                        <p><strong>問題点：</strong></p>
                        <ul>
                            <li>スケール差：年収の差（例：500万円差）がユークリッド距離に非常に大きく効く一方、身長差（例：10cm）はほぼ無視される</li>
                            <li>単位に依存：「cm」を「m」に変えると結果が変わる</li>
                        </ul>
                        <p><strong>解決策：</strong></p>
                        <ul>
                            <li>各変量を標準化 $z = (x-\\bar{x})/\\sigma$ にしてからユークリッド距離を使う</li>
                            <li>または標本共分散行列 $S$ を使ったマハラノビス距離を採用する（相関も補正できる）</li>
                        </ul>
                    </div>
                </section>

                <section class="content-section section-anchor" id="notes">
                    <h2><i class="fas fa-sticky-note"></i> まとめ・ポイント</h2>
                    <ul>
                        <li>クラスター分析は<strong>教師なし学習</strong>——ラベルなしデータからパターンを自動発見する</li>
                        <li>事前に標準化してからユークリッド距離を使うのが基本。スケール差が大きい場合は必須</li>
                        <li>単連結は「鎖状」クラスター、完全連結はコンパクトなクラスター、ウォード法は均一サイズ</li>
                        <li>ウォード法が実用上最も安定したクラスターを与えることが多い</li>
                        <li>k-meansは高速だが初期値依存・球状クラスター前提。複数回実行して最良解を選ぶ</li>
                        <li>エルボー法（k-means）やデンドログラムのジャンプ基準でクラスター数を決める</li>
                        <li>GMM（混合正規分布）＋EMアルゴリズムはソフト（確率的）クラスタリング</li>
                        <li>k-means ≈ GMM-EM の等分散球形モデルの特殊ケース</li>
                        <li>クラスタリングの「正解」はない——ドメイン知識や可視化で解釈・評価することが重要</li>
                    </ul>
                </section>

                <nav class="chapter-pager">
                    <a href="#" class="pager-link" id="prev-link">
                        <i class="fas fa-arrow-left"></i> 前の章
                    </a>
                    <a href="../index.html" class="pager-home">
                        <i class="fas fa-th-large"></i> 目次
                    </a>
                    <a href="#" class="pager-link" id="next-link">
                        次の章 <i class="fas fa-arrow-right"></i>
                    </a>
                </nav>

                </div>
            </div>
        </div>
    </main>

    <footer class="stat-footer">
        <div class="container">
            <p>&copy; 2026 R.Goto - 統計学学習ノート</p>
        </div>
    </footer>

    <script src="../data.js"></script>
    <script src="../script.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
        onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true},{left: '$', right: '$', display: false}]});"></script>
</body>
</html>"""

new_content = header + new_main
with open(filepath, 'w') as f:
    f.write(new_content)
lines = new_content.count('\n') + 1
print('Done. Lines:', lines)
