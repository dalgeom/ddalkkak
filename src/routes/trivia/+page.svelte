<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>상식 퀴즈 {data.total}문제 — 분야별·난이도별 무료 퀴즈 | 딸깍</title>
	<meta
		name="description"
		content="지리·역사·과학·속담·스포츠 등 {data.categories.length}개 분야, 초등부터 어른까지 난이도 4단계 상식 퀴즈 {data.total}문제. 가입 없이 무료로, 해설과 함께 풀어보세요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/trivia" />
	<meta property="og:title" content="상식 퀴즈 {data.total}문제 — 분야별·난이도별 무료 퀴즈 | 딸깍" />
	<meta
		property="og:description"
		content="{data.categories.length}개 분야 × 난이도 4단계. 해설이 함께 나오는 무료 상식 퀴즈."
	/>
	<meta property="og:url" content="https://ddalkkak.app/trivia" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">상식 퀴즈</span>
		<h1>초등부터 어른까지<br /><b>상식 퀴즈 {data.total}문제</b></h1>
		<p class="lead">
			지리·역사·과학부터 속담·스포츠·우주까지 {data.categories.length}개 분야를 난이도 4단계로
			나눴습니다. 모든 문제에 "정답은 ○○!"로 시작하는 해설이 붙어 있어서, 맞혀도 틀려도 하나씩
			알아가는 재미가 있어요. 가입도 결제도 없습니다.
		</p>
		<div class="facts">
			<div class="fact"><b>{data.total}</b><span>전체 문제</span></div>
			<div class="fact"><b>{data.categories.length}개</b><span>분야</span></div>
			<div class="fact"><b>4단계</b><span>난이도</span></div>
		</div>
	</header>

	<section class="sec">
		<h2 class="sh">난이도 미리보기 — 한 문제씩 풀어보세요</h2>
		<div class="samples">
			{#each data.samples as s (s.id)}
				<div class="sample">
					<div class="meta"><span class="chip">{s.category}</span><span class="chip grade">{s.grade}</span></div>
					<div class="q">{@html s.question}</div>
					<ul class="choices">
						{#each s.choices as c, i (i)}
							<li><span class="badge">{['A', 'B', 'C', 'D', 'E'][i]}</span>{c}</li>
						{/each}
					</ul>
					<details>
						<summary>정답 보기</summary>
						<p class="ans">정답은 <b>{s.answer}</b></p>
						<p class="exp">{@html s.explain}</p>
					</details>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">{data.categories.length}개 분야, 골라 푸는 재미</h2>
		<p class="sub">
			분야를 누르면 그 분야 문제 전체를 정답·해설과 함께 볼 수 있습니다. 직접 풀고 싶다면 무한
			연습에서 분야·난이도를 골라 원하는 만큼 풀 수 있어요.
		</p>
		<div class="cats">
			{#each data.categories as c (c.name)}
				<a class="cat" href="/trivia/{c.slug}">{c.name} <b>{c.count}</b></a>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">난이도는 이렇게 나뉘어요</h2>
		<div class="grades">
			{#each data.grades as g (g.name)}
				<div class="grade-row">
					<b>{g.name}</b>
					<span class="cnt">{g.count}문제</span>
					<span class="desc">
						{g.name === '초등'
							? '누구나 아는 것 같지만 은근 헷갈리는 기본기'
							: g.name === '중등'
								? '학교에서 배웠는데 가물가물한 것들'
								: g.name === '고등'
									? '아는 사람이 살짝 우쭐해지는 수준'
									: '맞히면 박수 받는 어른의 상식'}
					</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/play?filter=trivia">상식 퀴즈 무한으로 풀기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/">오늘의 10문제 풀러 가기</a>
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
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 18px;
	}
	.fact {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 12px 6px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 18px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.fact span {
		font-size: 11.5px;
		color: var(--muted-2);
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
		word-break: keep-all;
	}

	.samples {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.sample {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.meta {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
	}
	.chip {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--muted);
		padding: 3px 9px;
		border-radius: 7px;
	}
	.chip.grade {
		background: var(--gold-bg);
		color: var(--gold-text);
	}
	.q {
		font-size: 15px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
		margin-bottom: 10px;
	}
	.choices {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.choices li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--text);
		background: var(--panel-2);
		border-radius: 10px;
		padding: 8px 12px;
	}
	.badge {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		color: var(--muted);
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}
	details {
		margin-top: 10px;
		background: var(--panel-2);
		border-radius: 12px;
		padding: 10px 14px;
	}
	summary {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
	}
	.ans {
		margin: 10px 0 6px;
		font-size: 14px;
		font-weight: 700;
	}
	.ans b {
		color: var(--accent);
	}
	.exp {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}

	.cats {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.cat {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		padding: 7px 11px;
		text-decoration: none;
	}
	.cat:hover {
		background: var(--panel-2);
	}
	.cat b {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}

	.grades {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.grade-row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 13px 15px;
		flex-wrap: wrap;
	}
	.grade-row b {
		font-size: 14px;
		color: var(--accent);
		flex: none;
	}
	.cnt {
		font-size: 12px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
		flex: none;
	}
	.desc {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		word-break: keep-all;
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
</style>
