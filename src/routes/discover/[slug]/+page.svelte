<script lang="ts">
	import ProblemView from '$lib/components/ProblemView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = $derived(`https://ddalkkak.app/discover/${data.field.slug}`);
	const heading = $derived(`${data.field.title} ${data.items.length}개`);
	const desc = $derived(
		`${data.field.title} ${data.items.length}개. ${data.field.desc}`
	);
</script>

<svelte:head>
	<title>{heading} — 정답·해설 포함 | 딸깍 퍼즐</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{heading} — 정답·해설 포함 | 딸깍 퍼즐" />
	<meta property="og:description" content={data.field.intro} />
	<meta property="og:url" content={url} />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/discover">발견형 퍼즐</a><span aria-hidden="true">›</span><span>{data.field.name}</span>
		</nav>
		<h1>{data.field.title}<br /><b>{data.items.length}개</b></h1>
		<p class="lead">{data.field.intro}</p>
	</header>

	<section class="sec">
		<h2 class="sh">{data.field.name}에 들어 있는 유형</h2>
		<p class="sub">
			같은 분야 안에서도 묻는 방식이 다릅니다. 아래 {data.chips.length}가지가 이 페이지에 섞여 있습니다.
		</p>
		<div class="chips">
			{#each data.chips as c (c.chip)}
				<span class="chipcount">{c.chip} <b>{c.count}</b></span>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">{data.field.title} 전체와 해설</h2>
		<p class="sub">
			정답은 접어 두었습니다. 먼저 풀어보고 눌러서 확인하세요. 해설에는 답만이 아니라 그 규칙을 어떻게
			알아채는지가 함께 적혀 있습니다.
		</p>
		<ol class="list">
			{#each data.items as p (p.id)}
				<li><ProblemView problem={p} /></li>
			{/each}
		</ol>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/play?filter=puzzle">발견형 무한으로 풀기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/">오늘의 10문제 풀러 가기</a>
	</section>

	<section class="sec">
		<h2 class="sh">다른 분야도 있어요</h2>
		<p class="sub">전체 {data.total}개를 {data.others.length + 1}개 분야로 나눠 두었습니다.</p>
		<div class="cats">
			{#each data.others as f (f.slug)}
				<a class="cat" href="/discover/{f.slug}">{f.name} <b>{f.count}</b></a>
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

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chipcount {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		padding: 7px 11px;
	}
	.chipcount b {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
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
