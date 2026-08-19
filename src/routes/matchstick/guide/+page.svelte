<script lang="ts">
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import { parseEq } from '$lib/matchstick';
	import { MATCH_TOTAL } from '$lib/game';

	/** 한 획 차이 숫자 — 7세그먼트 마스크를 전수 비교해 얻은 목록(가이드의 핵심 도구) */
	const TABLE = [
		{
			t: '획 하나를 더하면',
			d: '다른 자리에서 빼 온 성냥을 여기에 놓을 때',
			pairs: ['0 → 8', '1 → 7', '3 → 9', '5 → 6', '5 → 9', '6 → 8', '9 → 8']
		},
		{
			t: '획 하나를 빼면',
			d: '여기서 성냥을 뽑아 다른 자리로 보낼 때',
			pairs: ['6 → 5', '7 → 1', '8 → 0', '8 → 6', '8 → 9', '9 → 3', '9 → 5']
		},
		{
			t: '제 획 하나를 옮기면',
			d: '같은 숫자 안에서만 옮겨도 다른 숫자가 되는 경우',
			pairs: ['0 → 6', '0 → 9', '2 → 3', '3 → 2', '3 → 5', '5 → 3', '6 → 0', '6 → 9', '9 → 0', '9 → 6']
		}
	];

	const STEPS = [
		{
			n: 1,
			t: '얼마나 틀렸는지 센다',
			d: '0 − 1 = 8 이라면 왼쪽은 −1, 오른쪽은 8. 얼마를 메워야 하는지 알면 고칠 자리가 좁혀진다.'
		},
		{
			n: 2,
			t: '한 획 차이 숫자를 떠올린다',
			d: '위 표가 전부다. 8은 획을 빼서 0·6·9가 되고, 0은 제 획을 옮겨 6·9가 된다.'
		},
		{
			n: 3,
			t: '연산자를 의심한다',
			d: '숫자만 보다 막히면 +와 −를 보라. 세로획 하나를 빼면 +가 −가 되고, 그 성냥을 숫자에 붙일 수 있다.'
		},
		{
			n: 4,
			t: '개수를 검산한다',
			d: '옮기기는 빼기 1회 + 놓기 1회다. 없앤 것도 새로 만든 것도 없어야 정답이다.'
		}
	];

	const EXAMPLES = [
		{
			eq: '0 - 1 = 8',
			sol: '9 - 1 = 8',
			tip: '숫자 하나 안에서 옮기기',
			how: '8을 만들려면 왼쪽이 9여야 한다. 0의 왼쪽 아래 획을 뽑아 가운데에 놓으면 그대로 9가 된다 — 성냥이 0 밖으로 나가지도 않았다.'
		},
		{
			eq: '0 + 2 = 6',
			sol: '8 - 2 = 6',
			tip: '연산자에서 빌려오기',
			how: '숫자만 만지면 답이 없다. + 의 세로획을 뽑으면 연산자는 −가 되고, 그 성냥을 0의 가운데에 놓으면 8이 된다. 8 − 2 = 6.'
		},
		{
			eq: '0 + 2 = 18',
			sol: '8 + 2 = 10',
			tip: '답에서 빌려오기',
			how: '고칠 곳이 왼쪽이라는 법은 없다. 답 18의 8에서 가운데 획을 뽑아 앞의 0에 붙이면 8 + 2 = 10이 된다.'
		}
	];
</script>

<svelte:head>
	<title>성냥개비 문제 푸는 법 — 한 획 차이 숫자표와 4단계 풀이 | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="성냥개비 퍼즐, 성냥 하나만 옮겨 식을 참으로 만드는 법. 한 획 차이 숫자표(0↔8, 6↔5, 9↔3…)와 4단계 풀이법, 연산자를 이용하는 기술을 실제 예제로 설명합니다."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick/guide" />
	<meta property="og:title" content="성냥개비 문제 푸는 법 — 한 획 차이 숫자표와 4단계 풀이 | 딸깍 퍼즐" />
	<meta
		property="og:description"
		content="한 획 차이 숫자표와 4단계 풀이법. 연산자를 이용하는 기술까지 실제 예제로."
	/>
	<meta property="og:url" content="https://ddalkkak.app/matchstick/guide" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">성냥개비 풀이법</span>
		<h1>성냥 하나만 옮겨<br /><b>틀린 식을 참으로</b></h1>
		<p class="lead">
			성냥개비 퍼즐의 규칙은 하나다. 어딘가에서 성냥 <b>한 개</b>를 뽑아 다른 자리에 놓아, 틀린 식을
			참으로 만든다. 성냥을 버리거나 새로 가져올 수는 없다. 규칙이 이렇게 단순한데도 막히는 이유는
			<b>어떤 숫자가 어떤 숫자로 바뀔 수 있는지</b>를 모르기 때문이다. 그 표부터 외우면 대부분 풀린다.
		</p>
	</header>

	<section class="sec">
		<h2 class="sh">핵심 도구 — 한 획 차이 숫자표</h2>
		<p class="sub">
			전광판 숫자는 획 7개를 켜고 끄는 조합이다. 아래가 성냥 하나로 바뀔 수 있는 모든 짝이다.
		</p>
		<div class="tables">
			{#each TABLE as g (g.t)}
				<div class="tbl">
					<b class="tt">{g.t}</b>
					<span class="td">{g.d}</span>
					<div class="pairs">
						{#each g.pairs as p (p)}
							<span class="pair">{p}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<p class="note">
			1·4·7은 획이 적어서(2·4·3개) 거의 늘 손대는 쪽이 되고, 8은 획이 7개로 가장 많아 빼기 좋은
			저수지다. 2와 4는 다른 숫자로 잘 안 변한다 — 그래서 함정으로 자주 쓰인다.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">4단계로 접근한다</h2>
		<ol class="steps">
			{#each STEPS as s (s.n)}
				<li>
					<span class="num">{s.n}</span>
					<div>
						<b>{s.t}</b>
						<span>{s.d}</span>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<section class="sec">
		<h2 class="sh">예제 3개로 익히기</h2>
		<p class="sub">쉬운 것부터 어려운 것 순서다. 보드를 보고 먼저 풀어본 뒤 정답을 펼쳐보자.</p>
		<div class="exs">
			{#each EXAMPLES as e (e.eq)}
				<div class="ex">
					<span class="chip">{e.tip}</span>
					<div class="board">
						<MatchstickBoard
							board={parseEq(e.eq)}
							picked={null}
							onstick={() => {}}
							interactive={false}
							label={e.eq.replace('-', '−')}
						/>
					</div>
					<details>
						<summary>정답과 풀이 보기</summary>
						<div class="board sol">
							<MatchstickBoard
								board={parseEq(e.sol)}
								picked={null}
								onstick={() => {}}
								interactive={false}
								label={'정답 ' + e.sol.replace('-', '−')}
							/>
						</div>
						<p class="ans">{e.sol.replace('-', '−')}</p>
						<p class="how">{e.how}</p>
					</details>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">{MATCH_TOTAL}문제를 전수 분석해서 얻은 사실</h2>
		<div class="facts">
			<div class="fact">
				<b>28%</b>
				<span>정답이 <b>연산자(+/−)</b> 획을 건드린다. 숫자만 노려보다 막히면 여기가 답이다.</span>
			</div>
			<div class="fact">
				<b>0개</b>
				<span>답의 <b>자릿수가 바뀌는</b> 문제는 없다. 한 자리 답을 두 자리로 만들려는 시도는 버려도 된다.</span>
			</div>
			<div class="fact">
				<b>1개</b>
				<span>모든 문제의 정답은 <b>정확히 하나</b>다. 여러 답이 되는 문제는 전수 검증으로 걸러냈다.</span>
			</div>
		</div>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/matchstick">성냥개비 {MATCH_TOTAL}문제 풀러 가기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/">오늘의 10문제 풀어보기</a>
		<p class="xlink">
			규칙을 스스로 찾아내는 <a href="/guide">발견형 퍼즐 풀이 가이드</a>도 있어요.
		</p>
	</section>
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 26px 20px 22px;
	}
	.kicker {
		display: inline-block;
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.4px;
		color: var(--accent);
		background: var(--correct-bg);
		border-radius: 7px;
		padding: 4px 11px;
	}
	h1 {
		margin: 12px 0 10px;
		font-size: 26px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.lead b {
		color: var(--text);
	}

	.sec {
		margin-top: 26px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 6px 2px;
		word-break: keep-all;
	}
	.sub {
		margin: 0 0 12px 2px;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}
	.note {
		margin: 12px 2px 0;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}

	/* 한 획 차이 표 */
	.tables {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.tbl {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 15px 16px;
	}
	.tt {
		font-size: 15px;
		display: block;
	}
	.td {
		display: block;
		margin-top: 3px;
		font-size: 12.5px;
		color: var(--muted-2);
		word-break: keep-all;
	}
	.pairs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 11px;
	}
	.pair {
		font-size: 14px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.3px;
		color: var(--text);
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 6px 10px;
	}

	/* 4단계 */
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.steps li {
		display: flex;
		gap: 11px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 14px 15px;
	}
	.num {
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 13px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.steps b {
		display: block;
		font-size: 14.5px;
		margin-bottom: 4px;
	}
	.steps span:not(.num) {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}

	/* 예제 */
	.exs {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.ex {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.chip {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--muted);
		padding: 3px 9px;
		border-radius: 7px;
		margin-bottom: 12px;
	}
	.board :global(.mboard) {
		padding: 14px 10px;
	}
	.board :global(.fit) {
		max-width: 260px;
	}
	.board.sol {
		margin-top: 10px;
	}
	details {
		margin-top: 12px;
		background: var(--panel-2);
		border-radius: 12px;
		padding: 11px 14px;
	}
	summary {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
	}
	.ans {
		margin: 10px 0 6px;
		font-size: 16px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.how {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}

	/* 전수 분석 사실 */
	.facts {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.fact {
		display: flex;
		align-items: baseline;
		gap: 12px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-left: 3px solid var(--accent);
		border-radius: 14px;
		padding: 14px 15px;
	}
	.fact > b {
		flex: none;
		font-size: 17px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		min-width: 42px;
	}
	.fact span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}
	.fact span b {
		color: var(--text);
	}

	.ctas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15.5px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.cta.ghost {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border-strong);
		box-shadow: none;
		font-weight: 700;
	}
	.cta.ghost:hover {
		background: var(--panel-2);
	}
	.xlink {
		margin: 4px 2px 0;
		text-align: center;
		font-size: 13px;
		color: var(--muted);
		word-break: keep-all;
	}
	.xlink a {
		color: var(--accent);
		font-weight: 700;
	}
</style>
