<script lang="ts">
	import type { PageData } from './$types';
	import DailyBand from '$lib/components/DailyBand.svelte';

	let { data }: { data: PageData } = $props();

	const url = $derived(`https://ddalkkak.app/chosung/${data.category.slug}`);
	const heading = $derived(`${data.category.title} ${data.count}문제`);
</script>

<svelte:head>
	<title>{heading} — 정답·뜻 포함 | 딸깍 퍼즐</title>
	<meta name="description" content="{heading}. {data.category.intro}" />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{heading} — 정답·뜻 포함 | 딸깍 퍼즐" />
	<meta property="og:description" content={data.category.intro} />
	<meta property="og:url" content={url} />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/chosung">초성 퀴즈</a><span aria-hidden="true">›</span><span>{data.category.name}</span>
		</nav>
		<h1>{data.category.title}<br /><b>{data.count}문제</b></h1>
		<p class="lead">{data.category.intro}</p>
		<div class="facts">
			{#each data.lengths as l (l.len)}
				<div class="fact"><b>{l.count}</b><span>{l.len}글자</span></div>
			{/each}
		</div>
		<a class="cta top" href="/chosung?c={data.category.slug}">
			{data.category.name} 초성 바로 풀기 <span aria-hidden="true">→</span>
		</a>
	</header>

	<section class="sec">
		<h2 class="sh">{data.category.name} 초성, 어디서 막히나</h2>
		{#each data.category.deepDive.split('\n\n') as para (para)}
			<p class="deep">{para}</p>
		{/each}
	</section>

	<section class="sec">
		<h2 class="sh">먼저 풀어 보세요 — 대표 {data.items.length}문제</h2>
		<p class="sub">초성을 보고 떠올린 뒤 「정답 보기」를 누르세요. 나머지 {data.count - data.items.length}문제는 위 버튼에서 풉니다.</p>
		<ol class="list">
			{#each data.items as q, i (q.word)}
				<li class="q">
					<span class="no">{i + 1}</span>
					<span class="cho">{q.cho}</span>
					<details>
						<summary>정답 보기</summary>
						<p class="ans"><b>{q.word}</b> — {q.hint}</p>
					</details>
				</li>
			{/each}
		</ol>
	</section>

	{#if data.collisions.length}
		<section class="sec">
			<h2 class="sh">초성이 같은 {data.category.name}</h2>
			<p class="sub">이 분야에서 초성이 똑같은 낱말들입니다. 어느 쪽을 써도 정답으로 받습니다.</p>
			<ul class="coll">
				{#each data.collisions as g (g.cho)}
					<li><span class="cho">{g.cho}</span>{g.words.join(' · ')}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<DailyBand>초성 말고도, 매일 <b>10문제</b>씩 새로 나와요</DailyBand>

	<section class="sec">
		<h2 class="sh">다른 초성 퀴즈</h2>
		<div class="cats">
			{#each data.others as c (c.slug)}
				<a class="cat" href="/chosung/{c.slug}">{c.title} <b>{c.count}</b></a>
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
		color: var(--accent-text);
		text-decoration: none;
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
		color: var(--accent-text);
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
		flex: 1 1 60px;
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
		color: var(--accent-text);
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
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.q {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 12px 14px;
	}
	.no {
		min-width: 22px;
		height: 22px;
		border-radius: 7px;
		background: var(--accent);
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.cho {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 3px;
	}
	details {
		flex-basis: 100%;
	}
	summary {
		cursor: pointer;
		font-size: 13px;
		font-weight: 700;
		color: var(--accent-text);
	}
	.ans {
		margin: 8px 0 0;
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.ans b {
		color: var(--accent-text);
	}
	.coll {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.coll li {
		display: flex;
		align-items: baseline;
		gap: 12px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		padding: 10px 14px;
		font-size: 14.5px;
		font-weight: 700;
	}
	.coll .cho {
		font-size: 16px;
		color: var(--accent-text);
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
	.cat b {
		color: var(--accent-text);
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
	.cta.top {
		margin-top: 16px;
	}
</style>
