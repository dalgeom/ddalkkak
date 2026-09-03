<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const LETTERS = ['A', 'B', 'C', 'D', 'E'];
	const url = $derived(`https://ddalkkak.app/trivia/${data.category.slug}`);
	const heading = $derived(`${data.category.title} ${data.count}문제`);
	const desc = $derived(
		`${data.category.title} ${data.count}문제. ${data.category.desc}`
	);
</script>

<svelte:head>
	<title>{heading} — 정답·해설 포함 | 딸깍 퍼즐</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{heading} — 정답·해설 포함 | 딸깍 퍼즐" />
	<meta property="og:description" content={data.category.intro} />
	<meta property="og:url" content={url} />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/trivia">상식 퀴즈</a><span aria-hidden="true">›</span><span>{data.category.name}</span>
		</nav>
		<h1>{data.category.title}<br /><b>{data.count}문제</b></h1>
		<p class="lead">{data.category.intro}</p>
		<div class="facts">
			{#each data.byGrade as g (g.name)}
				<div class="fact"><b>{g.count}</b><span>{g.name}</span></div>
			{/each}
		</div>
	</header>

	<!-- 문제 목록만 늘어놓으면 어디서나 볼 수 있는 상식 퀴즈와 구분이 안 된다.
	     그 분야에서 무엇을 자주 틀리는지를 먼저 짚어 둔다 — 이건 은행을 실제로 훑어보고
	     쓴 글이라 다른 데서 옮겨올 수 없는 내용이다. -->
	<section class="sec">
		<h2 class="sh">{data.category.name}, 어디서 갈리나</h2>
		{#each data.category.deepDive.split('\n\n') as para (para)}
			<p class="deep">{para}</p>
		{/each}
	</section>

	<!-- 검색으로 이 페이지에 떨어진 사람은 찾던 답만 읽고 나간다. 26문제와 해설을 다 지나야
	     데일리로 가는 길이 나오면 늦다 — 목록에 들어가기 전에 한 줄로 알린다. -->
	<a class="daily-band" href="/">
		<span class="t">이 문제들, 매일 <b>10문제</b>씩 새로 나와요</span>
		<span class="go">오늘 문제 풀기 →</span>
	</a>

	<section class="sec">
		<h2 class="sh">{data.category.name}, 이런 데서 틀립니다</h2>
		<p class="sub">
			{data.count}문제 중 서로 다른 함정을 보여주는 {data.items.length}개를 골랐습니다. 문제마다 사람들이 어디서
			헛짚는지를 붙여 두었어요. 나머지는 아래 무한 연습에서 {data.category.name}만 골라 만날 수 있습니다.
		</p>
		<ol class="list">
			{#each data.items as q, i (q.id)}
				<li class="q">
					<div class="qhead">
						<span class="no">{i + 1}</span>
						<span class="chip">{q.grade}</span>
					</div>
					<p class="ask">{@html q.question}</p>
					{#if q.choices.length}
						<ul class="choices">
							{#each q.choices as c, ci (ci)}
								<li><span class="badge">{LETTERS[ci]}</span>{c}</li>
							{/each}
						</ul>
					{/if}
					<div class="sol">
						<p class="ans">정답 <b>{q.answer}</b></p>
						<p class="exp">{@html q.explain}</p>
					</div>
					<p class="why">{q.why}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/">오늘의 10문제 풀러 가기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/play?filter=trivia">상식 퀴즈 무한으로 풀기</a>
	</section>

	<section class="sec">
		<h2 class="sh">다른 분야도 있어요</h2>
		<p class="sub">전체 {data.total}문제를 {data.others.length + 1}개 분야로 나눠 두었습니다.</p>
		<div class="cats">
			{#each data.others as c (c.slug)}
				<a class="cat" href="/trivia/{c.slug}">{c.name} <b>{c.count}</b></a>
			{/each}
		</div>
	</section>
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.crumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.crumb a {
		color: var(--accent);
		text-decoration: none;
	}
	.crumb a:hover {
		text-decoration: underline;
	}
	h1 {
		margin: 10px 0;
		font-size: 25px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		margin: 0;
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 18px;
	}
	.fact {
		flex: 1 1 70px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 11px 6px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 17px;
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
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.q {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.qhead {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 9px;
	}
	.no {
		min-width: 22px;
		height: 22px;
		padding: 0 5px;
		border-radius: 7px;
		background: var(--accent);
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		font-variant-numeric: tabular-nums;
	}
	.chip {
		font-size: 12px;
		font-weight: 700;
		background: var(--gold-bg);
		color: var(--gold-text);
		padding: 3px 9px;
		border-radius: 7px;
	}
	.ask {
		margin: 0 0 10px;
		font-size: 15px;
		font-weight: 700;
		line-height: 1.55;
		word-break: keep-all;
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
		background: var(--panel-2);
		border-radius: 10px;
		padding: 8px 12px;
		word-break: keep-all;
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
	/* 「왜 이걸 골랐나·어디서 헛짚나」 — 해설과 구분되게 왼쪽에 선을 둔다 */
	.why {
		margin-top: 10px;
		padding-left: 11px;
		border-left: 3px solid var(--accent);
		font-size: 13.5px;
		line-height: 1.75;
		color: var(--text);
		word-break: keep-all;
	}
	.sol {
		margin-top: 11px;
		padding: 11px 13px;
		background: var(--panel-2);
		border-left: 3px solid var(--accent);
		border-radius: 0 12px 12px 0;
	}
	.ans {
		margin: 0 0 5px;
		font-size: 14px;
		font-weight: 700;
		word-break: keep-all;
	}
	.ans b {
		color: var(--accent);
	}
	.exp {
		margin: 0;
		font-size: 13px;
		line-height: 1.75;
		color: var(--muted);
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

	/* 목록 앞에 서는 한 줄. 광고처럼 보이면 안 되므로 배너가 아니라 안내 톤으로 둔다 */
	/* 분야별 편집 산문 — 문제 목록보다 먼저 읽히도록 본문 리듬으로 */
	.deep + .deep {
		margin-top: 14px;
	}
	.deep {
		margin-top: 10px;
		font-size: 14px;
		line-height: 1.85;
		color: var(--muted);
		word-break: keep-all;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 15px 16px;
	}

	.daily-band {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 18px;
		padding: 14px 16px;
		background: var(--correct-bg);
		border: 1px solid var(--accent);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text);
	}
	.daily-band .t {
		font-size: 14px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.daily-band .t b {
		color: var(--accent);
	}
	.daily-band .go {
		flex: none;
		font-size: 13px;
		font-weight: 800;
		color: var(--accent);
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
