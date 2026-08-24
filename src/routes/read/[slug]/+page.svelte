<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = $derived(`https://ddalkkak.app/read/${data.article.slug}`);

	/** 글쓴이. 1인이 만들고 쓰는 사이트라 사이트 이름을 그대로 쓴다. */
	const AUTHOR = '딸깍';

	/* 누가 언제 쓴 글인지를 검색엔진이 읽을 수 있게 남긴다. 사람 눈에는 제목 아래 한 줄로
	   보이고, 여기서는 같은 사실을 구조화해서 한 번 더 적는다 — 게시자가 실재하고 글이
	   관리되고 있다는 신호다. */
	const articleLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: data.article.title,
			description: data.article.description,
			datePublished: data.article.date,
			dateModified: data.article.date,
			articleSection: data.article.tag,
			inLanguage: 'ko',
			author: { '@type': 'Person', name: AUTHOR },
			publisher: {
				'@type': 'Organization',
				name: '딸깍',
				url: 'https://ddalkkak.app'
			},
			mainEntityOfPage: { '@type': 'WebPage', '@id': url }
		})
	);
</script>

<svelte:head>
	<title>{data.article.title} | 딸깍 퍼즐</title>
	<meta name="description" content={data.article.description} />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{data.article.title} | 딸깍 퍼즐" />
	<meta property="og:description" content={data.article.description} />
	<meta property="og:url" content={url} />
	<meta property="og:type" content="article" />
	<meta property="article:published_time" content={data.article.date} />
	<meta property="article:author" content={AUTHOR} />
	{@html `<script type="application/ld+json">${articleLd}</` + `script>`}
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/read">읽을거리</a><span aria-hidden="true">›</span><span>{data.article.tag}</span>
		</nav>
		<h1>{data.article.title}</h1>
		<p class="byline">
			<span class="who">{AUTHOR}</span>
			<span class="sep" aria-hidden="true">·</span>
			<time datetime={data.article.date}>{data.article.date.replaceAll('-', '.')}</time>
		</p>
	</header>

	<div class="body">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- 본문은 articles.ts에 빌드 시점에 박힌 우리 글이다 -->
		{@html data.article.body}
	</div>

	<section class="sec ctas">
		<a class="cta" href={data.article.cta.href}>{data.article.cta.label} <span aria-hidden="true">→</span></a>
	</section>

	<section class="sec">
		<h2 class="sh">다른 글도 있어요</h2>
		<div class="cats">
			{#each data.others as a (a.slug)}
				<a class="cat" href="/read/{a.slug}"><b>{a.tag}</b> {a.title}</a>
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
		margin: 10px 0 8px;
		font-size: 23px;
		font-weight: 800;
		line-height: 1.4;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	.byline {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		color: var(--muted-2);
	}
	.byline .who {
		font-weight: 700;
		color: var(--muted);
	}
	time {
		font-size: 12.5px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}

	/* ── 본문 산문 스타일 — {@html}이라 :global로 입힌다 ── */
	.body {
		margin-top: 20px;
	}
	.body :global(h2) {
		margin: 30px 2px 10px;
		font-size: 17.5px;
		font-weight: 800;
		word-break: keep-all;
	}
	.body :global(p) {
		margin: 0 2px 14px;
		font-size: 14.5px;
		line-height: 1.85;
		word-break: keep-all;
	}
	.body :global(b) {
		font-weight: 700;
	}
	.body :global(ul) {
		margin: 0 2px 14px;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.body :global(li) {
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.body :global(.ex) {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 14px 16px;
		margin: 0 0 14px;
	}
	.body :global(.ex pre) {
		margin: 0;
		font-size: 15px;
		line-height: 1.7;
		font-weight: 600;
		overflow-x: auto;
	}
	.body :global(figure) {
		margin: 0 0 14px;
	}
	.body :global(figcaption) {
		margin-top: 8px;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--muted);
		text-align: center;
		word-break: keep-all;
	}
	.body :global(.mfig) {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.body :global(.mrow) {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.body :global(.mtag) {
		flex: none;
		width: 44px;
		text-align: center;
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		padding: 5px 0;
	}
	.body :global(.mtag.ok) {
		color: #1f6b41;
		background: var(--accent-soft);
		border-color: var(--accent);
	}
	.body :global(.mboard) {
		flex: 1;
		min-width: 0;
		background: #0a0d0a;
		border-radius: 12px;
		padding: 12px 16px;
		display: flex;
	}
	.body :global(.mboard svg) {
		width: 100%;
		max-width: 260px;
		height: auto;
		margin: 0 auto;
	}
	.body :global(.nfig svg) {
		display: block;
		width: 100%;
		max-width: 300px;
		height: auto;
		margin: 0 auto;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 10px;
	}

	.sec {
		margin-top: 26px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 10px 2px;
		word-break: keep-all;
	}
	.cats {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.cat {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		padding: 11px 14px;
		text-decoration: none;
		line-height: 1.5;
		word-break: keep-all;
	}
	.cat:hover {
		background: var(--panel-2);
	}
	.cat b {
		color: var(--accent);
		margin-right: 4px;
	}

	.ctas {
		display: flex;
	}
	.cta {
		flex: 1;
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
</style>
