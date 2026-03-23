#!/usr/bin/env python3
filepath = '/Users/gotou1/goto/statistics/chapters/chapter23.html'
content = open(filepath, 'r').read()

# ヘッダー（navbar+header）を取得 - <main>の直前まで
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
                            <li><a href="#fisher">フィッシャーの線形判別</a></li>
                            <li><a href="#quadratic">2次判別分析</a></li>
                            <li><a href="#canonical">正準判別分析（多群）</a></li>
                            <li><a href="#svm">サポートベクターマシン</a></li>
                            <li><a href="#evaluation">評価指標</a></li>
                            <li><a href="#formulas">公式まとめ</a></li>
                            <li><a href="#problems">例題・演習</a></li>
                            <li><a href="#notes">まとめ・ポイント</a></li>
                        </ol>
                    </div>
                </aside>

                <div class="chapter-content">

                <section class="content-section section-anchor" id="intro">
                    <h2><i class="fas fa-book-open"></i> はじめに：「新しいデータはどのグループに属するか」</h2>
                    <p>
                        病院で患者の血液検査データ（血糖値・コレステロール・ヘモグロビン等）を見て
                        「この患者は糖尿病リスクが高いか低いか」を判断する、
                        スパムメールフィルターで「このメールは迷惑メールか否か」を分類する、
                        手書き文字を「A〜Zのどの文字か」に認識する——
                        これらはすべて<strong>分類（classification）</strong>の問題です。
                    </p>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-question-circle"></i> 判別分析とは何か</p>
                        <p>
                            <strong>判別分析（discriminant analysis）</strong>は、あらかじめクラスラベル（群）が付いた
                            <strong>学習データ</strong>（訓練データ）を使って「判別するためのルール（判別関数）」を構築し、
                            そのルールを使って<strong>ラベルが未知の新データ</strong>がどのクラスに属するかを予測する手法です。
                        </p>
                        <p>
                            これは<strong>教師あり学習（supervised learning）</strong>の一種で、
                            前章の主成分分析（教師なし学習）とは対照的に、
                            「正解ラベル」の情報を積極的に活用します。
                        </p>
                    </div>
                    <h3>主成分分析との違い</h3>
                    <p>
                        主成分分析も「データを低次元に射影する」手法でしたが、その目的は「データの散らばりを最大化する」でした。
                        判別分析の目的は「<strong>クラス間の分離を最大化する</strong>」です——
                        つまり、同じクラスのデータはできるだけ固まり、異なるクラスのデータはできるだけ離れるような方向に射影します。
                    </p>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-lightbulb"></i> 具体的なイメージ</p>
                        <p>
                            2次元平面上に「赤い点（クラス1）」と「青い点（クラス2）」が散らばっているとします。
                            主成分分析は「全点の散らばりが最大になる方向」を選ぶため、赤と青が混在したまま射影されることもあります。
                            一方、判別分析は「赤と青が最もよく分離される方向」を選ぶため、射影後に2クラスがはっきり分かれます。
                        </p>
                    </div>
                    <h3>この章で学ぶこと</h3>
                    <ol>
                        <li><strong>フィッシャーの線形判別：</strong>群間分散を群内分散で割った比を最大化する射影方向 → 線形判別境界</li>
                        <li><strong>2次判別分析：</strong>各群の分散構造が異なる場合に非線形（2次曲面）の境界を使う</li>
                        <li><strong>正準判別分析（重判別分析）：</strong>フィッシャー判別の多群（3群以上）への拡張</li>
                        <li><strong>サポートベクターマシン（SVM）：</strong>マージン最大化原理。カーネル法で非線形判別へ拡張</li>
                        <li><strong>評価指標：</strong>混同行列・ROC曲線・AUCで判別性能を定量評価する</li>
                    </ol>
                    <p><strong>キーワード：</strong>フィッシャーの線形判別関数、マハラノビス距離、2次判別分析、正準判別分析、SVM、カーネル法、混同行列、ROC曲線、AUC</p>
                </section>

                <section class="content-section section-anchor" id="fisher">
                    <h2><i class="fas fa-project-diagram"></i> フィッシャーの線形判別分析</h2>

                    <h3>設定（2群の場合）</h3>
                    <p>
                        群 $G_1$（$n_1$ 個）と群 $G_2$（$n_2$ 個）が $p$ 次元特徴空間に存在する。
                        $G_j$ のサンプル平均ベクトルを $\\bar{\\boldsymbol{x}}^{(j)}$、標本共分散行列を $S_j$（$j=1,2$）とする。
                    </p>

                    <h3>線形判別の基準：群間/群内分散比の最大化</h3>
                    <p>
                        方向ベクトル $\\boldsymbol{w}$ への射影 $z = \\boldsymbol{w}^T\\boldsymbol{x}$ を考えると：
                    </p>
                    <ul>
                        <li>射影後の群間分散（大きいほど良い）：
                            $(\\bar{z}_1 - \\bar{z}_2)^2 = \\boldsymbol{w}^T(\\bar{\\boldsymbol{x}}^{(1)}-\\bar{\\boldsymbol{x}}^{(2)})(\\bar{\\boldsymbol{x}}^{(1)}-\\bar{\\boldsymbol{x}}^{(2)})^T\\boldsymbol{w}$
                        </li>
                        <li>射影後の群内分散（小さいほど良い）：
                            $\\boldsymbol{w}^T S_W \\boldsymbol{w}$。ここで $S_W = \\dfrac{(n_1-1)S_1+(n_2-1)S_2}{n_1+n_2-2}$（プールド共分散行列）
                        </li>
                    </ul>
                    <p>
                        比 $J(\\boldsymbol{w}) = \\dfrac{\\boldsymbol{w}^T(\\bar{\\boldsymbol{x}}^{(1)}-\\bar{\\boldsymbol{x}}^{(2)})(\\bar{\\boldsymbol{x}}^{(1)}-\\bar{\\boldsymbol{x}}^{(2)})^T\\boldsymbol{w}}{\\boldsymbol{w}^T S_W \\boldsymbol{w}}$
                        を最大化する $\\boldsymbol{w}$ は：
                    </p>
                    <div class="formula-block">
                        $$\\boldsymbol{w} = S_W^{-1}(\\bar{\\boldsymbol{x}}^{(1)} - \\bar{\\boldsymbol{x}}^{(2)})$$
                    </div>

                    <h3>フィッシャーの線形判別関数</h3>
                    <div class="formula-block">
                        $$f(\\boldsymbol{x}) = (\\bar{\\boldsymbol{x}}^{(1)}-\\bar{\\boldsymbol{x}}^{(2)})^T S_W^{-1}\\left(\\boldsymbol{x} - \\frac{\\bar{\\boldsymbol{x}}^{(1)}+\\bar{\\boldsymbol{x}}^{(2)}}{2}\\right)$$
                    </div>
                    <p>$f(\\boldsymbol{x}) &gt; 0 \\Rightarrow$ 群 $G_1$ に分類、$f(\\boldsymbol{x}) &lt; 0 \\Rightarrow$ 群 $G_2$ に分類。</p>

                    <h3>マハラノビス距離との関係</h3>
                    <p>
                        プールド共分散 $S_W$ を使ったマハラノビス距離：
                        $D_j^2 = (\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(j)})^T S_W^{-1}(\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(j)})$
                    </p>
                    <p>$D_1^2 - D_2^2 = -2f(\\boldsymbol{x})$ なので、「マハラノビス距離が短い方の群に分類」と等価。</p>

                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-ruler-combined"></i> マハラノビス距離 vs ユークリッド距離</p>
                        <p>
                            ユークリッド距離は変量のスケール・相関を無視します。
                            マハラノビス距離は共分散行列 $\\Sigma$ の逆行列を使うことで、
                            「変量のスケール差を正規化し、相関を考慮した距離」になります。
                            たとえば変量1の分散が変量2の100倍であれば、変量2の1単位変化を変量1の10単位変化と同等に扱います。
                        </p>
                    </div>
                </section>

                <section class="content-section section-anchor" id="quadratic">
                    <h2><i class="fas fa-wave-square"></i> 2次判別分析</h2>

                    <h3>各群で共分散行列が異なる場合</h3>
                    <p>
                        線形判別は「2群の共分散行列が同じ」という仮定（$\\Sigma_1 = \\Sigma_2$）のもとで有効です。
                        この仮定が成り立たない場合、各群の共分散行列 $S_1, S_2$ を別々に使う
                        <strong>2次判別分析（quadratic discriminant analysis, QDA）</strong>が必要です。
                    </p>

                    <h3>2次判別関数</h3>
                    <p>各群へのマハラノビス距離（群ごとに $\\Sigma_j$ を使う）を比較して分類：</p>
                    <div class="formula-block">
                        $$g(\\boldsymbol{x}) = D_2^2 - D_1^2$$
                        $$= (\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(2)})^T S_2^{-1}(\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(2)}) - (\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(1)})^T S_1^{-1}(\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(1)})$$
                    </div>
                    <p>$g(\\boldsymbol{x}) &gt; 0 \\Rightarrow G_1$（$D_1^2 &lt; D_2^2$）、$g(\\boldsymbol{x}) &lt; 0 \\Rightarrow G_2$。</p>
                    <p>
                        $g(\\boldsymbol{x})$ は $\\boldsymbol{x}$ の2次関数（行列 $S_1^{-1}-S_2^{-1}$ の2次形式を含む）なので、
                        判別境界が<strong>2次曲面</strong>（楕円・放物線・双曲線など）になる。
                    </p>

                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-exclamation-triangle"></i> 2次判別の注意点</p>
                        <p>
                            各群の $S_j$ を別々に推定するため、パラメータ数が線形判別の2倍になります。
                            サンプルサイズが小さいと推定精度が下がり、<strong>過学習（overfitting）</strong>が起きやすくなります。
                            サンプルが少ない場合は線形判別の方が安定していることも多いです。
                        </p>
                    </div>
                </section>

                <section class="content-section section-anchor" id="canonical">
                    <h2><i class="fas fa-layer-group"></i> 正準判別分析（多群・重判別分析）</h2>

                    <h3>3群以上への拡張</h3>
                    <p>
                        $g$ 個の群 $G_1, \\ldots, G_g$ がある場合、フィッシャー判別を拡張した
                        <strong>正準判別分析（canonical discriminant analysis）</strong>を使う。
                    </p>

                    <h3>群間・群内変動行列</h3>
                    <p>全サンプル平均 $\\bar{\\boldsymbol{x}} = \\dfrac{1}{N}\\sum_{j=1}^{g}n_j\\bar{\\boldsymbol{x}}^{(j)}$（$N = \\sum_j n_j$）として：</p>
                    <div class="formula-block">
                        $$S_B = \\sum_{j=1}^{g} n_j(\\bar{\\boldsymbol{x}}^{(j)}-\\bar{\\boldsymbol{x}})(\\bar{\\boldsymbol{x}}^{(j)}-\\bar{\\boldsymbol{x}})^T \\quad \\text{（群間変動行列）}$$
                    </div>
                    <div class="formula-block">
                        $$S_W = \\sum_{j=1}^{g}(n_j-1)S_j \\quad \\text{（群内変動行列）}$$
                    </div>

                    <h3>固有値問題</h3>
                    <p>群間/群内分散比を最大化する正準判別関数の係数 $\\boldsymbol{w}$ は：</p>
                    <div class="formula-block">
                        $$S_W^{-1}S_B\\boldsymbol{w} = \\lambda\\boldsymbol{w}$$
                    </div>
                    <p>
                        固有値問題を解くと、最大 $d = \\min(p, g-1)$ 個の正準判別関数が得られる。
                        （$S_B$ のランクが最大でも $g-1$ のため。）
                        得られた判別スコアで多次元の群の分布を可視化（2次元散布図）したり、
                        各サンプルを最近傍群の重心に分類できる。
                    </p>
                </section>

                <section class="content-section section-anchor" id="svm">
                    <h2><i class="fas fa-border-style"></i> サポートベクターマシン（SVM）</h2>

                    <h3>マージン最大化の考え方</h3>
                    <p>
                        2クラス（ラベル $y_i \\in \\{+1, -1\\}$）の線形分離問題で、
                        分離超平面 $\\boldsymbol{w}^T\\boldsymbol{x} + b = 0$ を「<strong>最も余裕を持って分離する</strong>」ように決める。
                    </p>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-arrows-alt-h"></i> マージンとは</p>
                        <p>
                            分離超平面から最も近い各クラスのデータ点（<strong>サポートベクター</strong>）までの距離の合計がマージンです。
                            マージンが大きいほど「未知データへの余裕（汎化性能）」が大きくなると考えます。
                            フィッシャー判別は平均の差を最大化しましたが、SVMは境界付近の最悪ケースを同時に最大化します。
                        </p>
                    </div>

                    <h3>ハードマージンSVM（線形分離可能な場合）</h3>
                    <div class="formula-block">
                        $$\\min_{\\boldsymbol{w},b} \\frac{1}{2}\\|\\boldsymbol{w}\\|^2 \\quad \\text{s.t.}\\quad y_i(\\boldsymbol{w}^T\\boldsymbol{x}_i + b) \\geq 1\\; (\\forall i)$$
                    </div>
                    <p>マージン幅 $= 2/\\|\\boldsymbol{w}\\|$。これを最大化するには $\\|\\boldsymbol{w}\\|$ を最小化する。</p>

                    <h3>ソフトマージンSVM（許容誤分類あり）</h3>
                    <p>完全分離できない場合はスラック変数 $\\xi_i \\geq 0$（誤分類の程度）を導入：</p>
                    <div class="formula-block">
                        $$\\min_{\\boldsymbol{w},b,\\boldsymbol{\\xi}} \\frac{1}{2}\\|\\boldsymbol{w}\\|^2 + C\\sum_{i=1}^{n}\\xi_i \\quad \\text{s.t.}\\quad y_i(\\boldsymbol{w}^T\\boldsymbol{x}_i + b) \\geq 1-\\xi_i,\\;\\xi_i \\geq 0$$
                    </div>
                    <ul>
                        <li>$C$ が大きい → 誤分類を許容しない（過学習リスク↑）</li>
                        <li>$C$ が小さい → 誤分類を許容（汎化性能↑、精度↓）</li>
                    </ul>

                    <h3>カーネル法（非線形SVM）</h3>
                    <p>
                        元のデータ空間で線形分離できない場合、
                        高次元の特徴空間 $\\phi: \\boldsymbol{x} \\mapsto \\phi(\\boldsymbol{x})$ に写像してから線形分離する。
                        <strong>カーネルトリック</strong>を使うと $\\phi(\\boldsymbol{x})$ を直接計算せず
                        カーネル関数 $K(\\boldsymbol{x},\\boldsymbol{y}) = \\phi(\\boldsymbol{x})^T\\phi(\\boldsymbol{y})$ だけで計算できる。
                    </p>
                    <ul>
                        <li>多項式カーネル：$K(\\boldsymbol{x},\\boldsymbol{y}) = (\\boldsymbol{x}^T\\boldsymbol{y} + c)^d$</li>
                        <li>RBFカーネル（ガウスカーネル）：$K(\\boldsymbol{x},\\boldsymbol{y}) = \\exp(-\\gamma\\|\\boldsymbol{x}-\\boldsymbol{y}\\|^2)$</li>
                    </ul>
                </section>

                <section class="content-section section-anchor" id="evaluation">
                    <h2><i class="fas fa-chart-bar"></i> 判別性能の評価指標</h2>

                    <h3>混同行列（Confusion Matrix）</h3>
                    <table>
                        <thead>
                            <tr><th></th><th>予測：陽性(+)</th><th>予測：陰性(&#x2212;)</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>実際：陽性(+)</strong></td><td>TP（真陽性）</td><td>FN（偽陰性）</td></tr>
                            <tr><td><strong>実際：陰性(&#x2212;)</strong></td><td>FP（偽陽性）</td><td>TN（真陰性）</td></tr>
                        </tbody>
                    </table>

                    <h3>各評価指標</h3>
                    <table>
                        <thead><tr><th>指標</th><th>定義</th><th>意味</th></tr></thead>
                        <tbody>
                            <tr><td>正解率（Accuracy）</td><td>$(TP+TN)/N$</td><td>全体の正解割合</td></tr>
                            <tr><td>感度（Sensitivity）＝再現率</td><td>$TP/(TP+FN)$</td><td>陽性を陽性と正しく予測できた割合</td></tr>
                            <tr><td>特異度（Specificity）</td><td>$TN/(TN+FP)$</td><td>陰性を陰性と正しく予測できた割合</td></tr>
                            <tr><td>適合率（Precision）</td><td>$TP/(TP+FP)$</td><td>陽性予測のうち実際に陽性の割合</td></tr>
                            <tr><td>F値（F-measure）</td><td>$2\\times\\dfrac{P \\times R}{P+R}$</td><td>適合率と再現率の調和平均</td></tr>
                        </tbody>
                    </table>

                    <h3>ROC曲線とAUC</h3>
                    <p>
                        判別スコアの閾値を連続的に変えたときの
                        「偽陽性率（= 1&#x2212;特異度）」を横軸、「感度」を縦軸にプロットした曲線が
                        <strong>ROC曲線（Receiver Operating Characteristic curve）</strong>。
                    </p>
                    <ul>
                        <li><strong>AUC（Area Under the Curve）：</strong>ROC曲線下の面積。0.5（ランダム）〜1.0（完全分類）</li>
                        <li>AUCはクラス不均衡の影響を受けにくい安定した総合評価指標</li>
                    </ul>
                    <div class="concept-box">
                        <p class="box-title"><i class="fas fa-info-circle"></i> 感度と特異度のトレードオフ</p>
                        <p>
                            閾値を下げると陽性判定が増え → 感度↑・特異度↓（偽陽性増加）。
                            閾値を上げると陽性判定が減り → 感度↓・特異度↑（偽陰性増加）。
                            医療現場では「見逃し（FN）を減らしたい（感度優先）」か
                            「過剰診断（FP）を減らしたい（特異度優先）」かで閾値を選ぶ。
                        </p>
                    </div>
                </section>

                <section class="content-section section-anchor" id="formulas">
                    <h2><i class="fas fa-square-root-alt"></i> 公式まとめ</h2>

                    <h3>フィッシャーの線形判別係数</h3>
                    <div class="formula-block">
                        $$\\boldsymbol{w} = S_W^{-1}(\\bar{\\boldsymbol{x}}^{(1)} - \\bar{\\boldsymbol{x}}^{(2)}), \\quad S_W = \\frac{(n_1-1)S_1+(n_2-1)S_2}{n_1+n_2-2}$$
                    </div>

                    <h3>マハラノビスの平方距離（群 $j$ まで）</h3>
                    <div class="formula-block">
                        $$D_j^2 = (\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(j)})^T S_W^{-1}(\\boldsymbol{x}-\\bar{\\boldsymbol{x}}^{(j)})$$
                    </div>

                    <h3>正準判別の固有値問題</h3>
                    <div class="formula-block">
                        $$S_W^{-1}S_B\\boldsymbol{w} = \\lambda\\boldsymbol{w}, \\quad d = \\min(p,\\, g-1) \\text{ 個の判別関数}$$
                    </div>

                    <h3>SVMの目的関数（ソフトマージン）</h3>
                    <div class="formula-block">
                        $$\\min \\frac{1}{2}\\|\\boldsymbol{w}\\|^2 + C\\sum_{i}\\xi_i \\quad \\text{s.t.}\\quad y_i(\\boldsymbol{w}^T\\boldsymbol{x}_i + b) \\geq 1-\\xi_i,\\;\\xi_i \\geq 0$$
                    </div>
                </section>

                <section class="content-section section-anchor" id="problems">
                    <h2><i class="fas fa-pencil-alt"></i> 例題・演習</h2>

                    <h3>問23.1：SVMと汎化性能</h3>
                    <div class="example-block">
                        <span class="prob-badge badge-q">問題</span>
                        <p>RBFカーネルを使ったSVMで正則化パラメータ $C$ を非常に大きくしたとき、何が起きるか説明せよ。</p>
                    </div>
                    <div class="answer-block">
                        <span class="prob-badge badge-a">解答</span>
                        <p>$C$ が大きいと誤分類のペナルティが大きくなるため、SVMは学習データをすべて正しく分類しようとする（ハードマージンに近づく）。その結果：</p>
                        <ul>
                            <li>訓練データへの<strong>過学習（overfitting）</strong>が起きやすい</li>
                            <li>決定境界が複雑になりすぎ、未知データへの<strong>汎化性能が低下</strong>する</li>
                        </ul>
                        <p>適切な $C$ と $\\gamma$（RBFの広がり幅）の組み合わせは交差検証で選択する。</p>
                    </div>

                    <h3>問23.2：正準判別分析の次元数</h3>
                    <div class="example-block">
                        <span class="prob-badge badge-q">問題</span>
                        <p>$p=8$ 個の特徴量で $g=3$ 群の正準判別分析を行う。最大何個の正準判別関数が得られるか。</p>
                    </div>
                    <div class="answer-block">
                        <span class="prob-badge badge-a">解答</span>
                        <p>$d = \\min(p, g-1) = \\min(8, 2) = \\mathbf{2}$ 個</p>
                        <p>
                            第1正準判別：最も群を分離する方向（寄与率最大）<br>
                            第2正準判別：第1と直交し、残りの分離情報を最大化する方向
                        </p>
                        <p>2次元の正準判別スコアを散布図にプロットすることで、3群の配置を視覚的に確認できる。</p>
                    </div>

                    <h3>問23.3：混同行列と評価指標</h3>
                    <div class="example-block">
                        <span class="prob-badge badge-q">問題</span>
                        <p>
                            100件のがん診断データで、実際の陽性（がん）が40件・陰性が60件。
                            判別モデルの予測：陽性と予測したうち真に陽性が30件、陰性と予測したうち真に陰性が52件。
                            感度・特異度・正解率・適合率を求めよ。
                        </p>
                    </div>
                    <div class="answer-block">
                        <span class="prob-badge badge-a">解答</span>
                        <p>混同行列：TP=30, FN=10, FP=8, TN=52（計100件）</p>
                        <table>
                            <thead><tr><th>指標</th><th>計算</th><th>値</th></tr></thead>
                            <tbody>
                                <tr><td>感度（再現率）</td><td>$30/(30+10)$</td><td>0.750（75%）</td></tr>
                                <tr><td>特異度</td><td>$52/(52+8)$</td><td>0.867（87%）</td></tr>
                                <tr><td>正解率</td><td>$(30+52)/100$</td><td>0.820（82%）</td></tr>
                                <tr><td>適合率（精度）</td><td>$30/(30+8)$</td><td>0.789（79%）</td></tr>
                            </tbody>
                        </table>
                        <p>FN=10（見逃し10件）が医療上問題になるため、閾値を下げて感度を高める（特異度とのトレードオフ）ことが多い。</p>
                    </div>
                </section>

                <section class="content-section section-anchor" id="notes">
                    <h2><i class="fas fa-sticky-note"></i> まとめ・ポイント</h2>
                    <ul>
                        <li>フィッシャー判別は正規分布の仮定不要。群間/群内分散比の最大化がベース</li>
                        <li>線形判別は「共分散行列が2群で等しい」仮定。等しくない場合は2次判別を使う</li>
                        <li>2次判別はパラメータ数が多く、サンプルが少ない場合は不安定（過学習リスク）</li>
                        <li>正準判別分析で得られる判別関数数は最大 $\\min(p, g-1)$ 個</li>
                        <li>SVM は「マージン最大化」が原理。カーネル法で非線形判別へ拡張可能</li>
                        <li>$C$ パラメータ：大きい → 過学習、小さい → 汎化性能↑（交差検証で選択）</li>
                        <li>ROC-AUCはクラス不均衡でも安定した評価指標（正解率はクラス比に依存）</li>
                        <li>正準判別分析 ≈ PCAの「教師あり」版（分散最大化 → 群間/群内比最大化）</li>
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
print('Done. Lines:', new_content.count('\\n')+1)
