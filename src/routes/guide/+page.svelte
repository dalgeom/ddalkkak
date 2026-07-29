<script lang="ts">
	import ExampleList from '$lib/components/ExampleList.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import { parseEq } from '$lib/matchstick';

	/** 4단계 — 설명만 하면 안 읽힌다. 각 단계에 그 단계에서 실제로 하는 생각을 붙인다. */
	const STEPS = [
		{
			n: 1,
			name: '방황',
			line: '가설을 여러 개 던진다',
			body: '더하기일까? 곱하기일까? 자릿수를 세는 걸까, 글자 모양일까? 처음엔 여러 가설을 꼬리에 꼬리를 물고 시도하게 됩니다.',
			note: '헤매는 게 정상이에요. 이 시간이 길수록 풀었을 때 더 재밌습니다.'
		},
		{
			n: 2,
			name: '발판',
			line: '데이터에서 걸리는 부분을 찾는다',
			body: '돌파구는 가설을 전부 소진해서가 아니라, 예시 속에서 눈에 걸리는 작은 부분에서 옵니다.',
			note: '아래 다섯 가지 중 하나로 나타나는 경우가 대부분이에요.'
		},
		{
			n: 3,
			name: '해금',
			line: '발판 하나가 전체를 연다',
			body: '걸린 부분을 붙잡고 한 걸음만 더 가면, 나머지 예시가 한꺼번에 설명됩니다. 그 순간이 딸깍입니다.',
			note: ''
		},
		{
			n: 4,
			name: '검산',
			line: '나머지 예시로 확인한다',
			body: '찾은 규칙을 다른 예시에 넣어 봅니다. 하나라도 안 맞으면 규칙이 아직 덜 여문 것이에요.',
			note: ''
		}
	];

	/** 발판 5종 — 말로만 하면 안 와닿아서 각각 실제 예시를 붙였다 */
	const FOOTHOLDS = [
		{
			name: '부분 패턴',
			desc: '일부 자리만 규칙적으로 반복될 때',
			ex: '13 → 3\n20 → 0\n43 → 3\n50 → ?'
		},
		{
			name: '숨은 공통 성질',
			desc: '나온 것들이 전부 같은 성질을 가질 때',
			ex: '2 · 4 · 6 · 8\n전부 짝수\n그럼 다음은?'
		},
		{
			name: '이상치',
			desc: '하나만 유독 튀는 값이 있을 때',
			ex: '3 5 7 9 20 11\n하나만 이상하다'
		},
		{
			name: '구조 어긋남',
			desc: '개수·길이가 한 군데만 다를 때',
			ex: '윗줄 5개\n아랫줄 6개\n번갈아 봐야 하나?'
		},
		{
			name: '지각 반전',
			desc: '보고 있으면 다른 형태가 툭 보일 때',
			ex: 'ㄱㅁ\n글자인가, 그림인가?'
		}
	];

	/** 자주 나오는 규칙의 결 */
	const FAMILIES = [
		{
			tag: '연산 뒤에 숨기기',
			desc: '답이 그냥 합이나 곱이 아니라, 그 결과를 이어붙이거나 자리를 바꾼 것',
			ex: '5+3 = 28\n9+1 = 810\n7+3 = ?'
		},
		{
			tag: '글자를 그림으로 보기',
			desc: "글자의 '뜻'이 아니라 닫힌 칸 수·좌우대칭·획수 같은 '모양'이 규칙",
			ex: '나무 → 2\n가나다 → 1\n고구마 → ?'
		},
		{
			tag: '값이 아니라 순서·위치',
			desc: "숫자의 크기가 아니라 '몇 번째'인지, 어느 자리에 있는지가 답",
			ex: 'A 3 D 5 I 7 ? 9 Y'
		},
		{
			tag: '재료 바꿔 읽기',
			desc: '색·요일·시계·알파벳 순번처럼, 눈앞의 재료를 다른 체계로 번역해야 보이는 규칙',
			ex: '10 = 돌\n50 = 풀\n100 = 사람\n500 = ?'
		}
	];

	const TIPS = [
		{
			t: '힌트를 하나씩 여세요',
			d: '힌트는 규칙을 통째로 알려주기보다 발판 쪽으로 눈을 돌려 줍니다. 포기하고 나가는 것보다 훨씬 낫습니다.'
		},
		{
			t: '값의 범위를 단서로 삼으세요',
			d: '결과가 작으면 큰 연산은 아닙니다. 예시에 쓰인 글자와 문제의 글자가 다르면 산술 문제가 아닐 가능성이 높습니다.'
		},
		{
			t: '찍지 말고 좁혀 가세요',
			d: '탐정처럼 아닌 것부터 지워 나가면, 남은 후보가 저절로 줄어듭니다.'
		}
	];

	const demoBoard = parseEq('8 - 0 = 8');
</script>

<svelte:head>
	<title>발견형 퍼즐 푸는 법 — 딸깍</title>
	<meta
		name="description"
		content="규칙을 알려주지 않는 발견형 퍼즐, 어떻게 풀까? 방황·발판·해금·검산 4단계와 자주 나오는 규칙의 결을 실제 예시로 정리했습니다."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/guide" />
	<meta property="og:title" content="발견형 퍼즐 푸는 법 — 딸깍" />
	<meta
		property="og:description"
		content="규칙을 알려주지 않는 발견형 퍼즐, 어떻게 풀까? 4단계 풀이법과 자주 나오는 규칙의 결."
	/>
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/guide" />
</svelte:head>

<article>
	<!-- 표지 -->
	<header class="cover">
		<span class="kicker">풀이 가이드</span>
		<h1>규칙을 알려주지 않는 퍼즐,<br /><b>어떻게 풀까?</b></h1>
		<p class="lead">
			발견형 퍼즐은 예시 몇 개만 주고, 그 안에 숨은 규칙을 스스로 찾아 물음표를 채우는 문제입니다.
			막막해 보여도 푸는 흐름은 늘 같습니다.
		</p>
		<div class="demo">
			<ExampleList text={'5+3 = 28\n9+1 = 810\n7+3 = ?'} />
			<p class="demo-cap">이런 문제입니다. 답이 뭘까요?</p>
		</div>
	</header>

	<!-- 4단계 -->
	<section class="sec">
		<h2 class="sh">푸는 흐름 네 단계</h2>
		<ol class="steps">
			{#each STEPS as s (s.n)}
				<li class="step">
					<div class="step-head">
						<span class="num">{s.n}</span>
						<div>
							<b>{s.name}</b>
							<span class="step-line">{s.line}</span>
						</div>
					</div>
					<p class="step-body">{s.body}</p>
					{#if s.note}<p class="step-note">{s.note}</p>{/if}
				</li>
			{/each}
		</ol>
	</section>

	<!-- 발판 5종 -->
	<section class="sec">
		<h2 class="sh">발판 다섯 가지</h2>
		<p class="sub">막혔을 때 눈이 걸리는 지점은 대개 이 다섯 중 하나입니다.</p>
		<div class="cards">
			{#each FOOTHOLDS as f (f.name)}
				<div class="card">
					<div class="card-t">
						<b>{f.name}</b>
						<span>{f.desc}</span>
					</div>
					<ExampleList text={f.ex} />
				</div>
			{/each}
		</div>
	</section>

	<!-- 규칙의 결 -->
	<section class="sec">
		<h2 class="sh">자주 나오는 규칙의 결</h2>
		<p class="sub">규칙은 무한하지만, 자주 등장하는 큰 갈래를 알아 두면 방황이 짧아집니다.</p>
		<div class="cards">
			{#each FAMILIES as f (f.tag)}
				<div class="card">
					<div class="card-t">
						<b>{f.tag}</b>
						<span>{f.desc}</span>
					</div>
					<ExampleList text={f.ex} />
				</div>
			{/each}
		</div>
	</section>

	<!-- 막힐 때 -->
	<section class="sec">
		<h2 class="sh">막힐 때</h2>
		<div class="tips">
			{#each TIPS as t (t.t)}
				<div class="tip">
					<b>{t.t}</b>
					<span>{t.d}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- 다른 유형 -->
	<section class="sec">
		<h2 class="sh">발견형 말고도 있어요</h2>
		<div class="others">
			<div class="other">
				<b>상식 퀴즈</b>
				<span>18개 분야, 초등부터 어른까지. 고르거나 짧게 답을 적고, 해설이 함께 나옵니다.</span>
			</div>
			<div class="other">
				<div class="ob"><MatchstickBoard board={demoBoard} picked={null} onstick={() => {}} interactive={false} label="8 − 0 = 8" /></div>
				<b>성냥개비</b>
				<span>성냥 하나만 옮겨 틀린 식을 참으로 만듭니다. 획을 눌러 집고 빈 자리에 놓으세요.</span>
			</div>
		</div>
	</section>

	<section class="sec closing">
		<h2 class="sh">매일 자정에 새로 열립니다</h2>
		<p class="sub">
			발견형·상식·성냥개비를 섞은 10문제가 매일 새로 열리고, 그날은 모두가 같은 문제를 풉니다.
		</p>
		<a class="cta" href="/">오늘의 10문제 풀어보기 <span class="arr" aria-hidden="true">→</span></a>
	</section>
</article>

<style>
	article {
		padding-bottom: 8px;
	}

	/* ── 표지 ── */
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
	.demo {
		margin-top: 18px;
	}
	.demo-cap {
		margin-top: 8px;
		text-align: center;
		font-size: 12.5px;
		color: var(--muted-2);
	}

	/* ── 섹션 ── */
	.sec {
		margin-top: 26px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 6px 2px;
	}
	.sub {
		margin: 0 0 12px 2px;
		font-size: 13px;
		color: var(--muted);
		word-break: keep-all;
	}

	/* ── 4단계 ── */
	.steps {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 0;
		margin: 0;
	}
	.step {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.step-head {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-bottom: 9px;
	}
	.num {
		width: 30px;
		height: 30px;
		flex: none;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.step-head b {
		display: block;
		font-size: 16px;
	}
	.step-line {
		font-size: 12.5px;
		color: var(--muted-2);
	}
	.step-body {
		font-size: 14px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.step-note {
		margin-top: 8px;
		padding: 9px 12px;
		border-radius: 10px;
		background: var(--gold-bg);
		border: 1px solid var(--gold);
		color: var(--gold-text);
		font-size: 12.5px;
		line-height: 1.6;
		word-break: keep-all;
	}

	/* ── 카드(발판·규칙) ── */
	.cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 15px;
	}
	.card-t {
		margin-bottom: 11px;
	}
	.card-t b {
		display: block;
		font-size: 15px;
		margin-bottom: 3px;
	}
	.card-t span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		word-break: keep-all;
	}

	/* ── 팁 ── */
	.tips {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.tip {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		padding: 13px 15px;
	}
	.tip b {
		display: block;
		font-size: 14px;
		margin-bottom: 4px;
	}
	.tip span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}

	/* ── 다른 유형 ── */
	.others {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.other {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 15px;
	}
	.ob {
		margin-bottom: 12px;
	}
	.other b {
		display: block;
		font-size: 15px;
		margin-bottom: 3px;
	}
	.other span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		word-break: keep-all;
	}

	/* ── 마무리 ── */
	.closing {
		text-align: center;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 22px 18px;
	}
	.closing .sh {
		margin-left: 0;
	}
	.closing .sub {
		margin-left: 0;
		margin-bottom: 16px;
	}
	.cta {
		display: block;
		padding: 16px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.arr {
		display: inline-block;
		animation: arr 1.6s var(--ease-out) infinite;
	}
	@keyframes arr {
		0%,
		55%,
		100% {
			transform: translateX(0);
		}
		70% {
			transform: translateX(5px);
		}
		85% {
			transform: translateX(1px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.arr {
			animation: none;
		}
	}

	@media (min-width: 768px) {
		.cover {
			padding: 34px 30px 28px;
		}
		h1 {
			font-size: 30px;
		}
	}
</style>
