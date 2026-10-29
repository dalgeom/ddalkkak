<script lang="ts">
	import { FIX_LOG } from '$lib/fixLog';

	/** 다듬은 기록(fixLog.ts). 새 소식과 달리 본 것으로 치지 않는다 — 시트와 상관없다. */
	const fmt = (d: string) => {
		const [y, m, dd] = d.split('-');
		return `${y}.${m}.${dd}`;
	};
</script>

<svelte:head>
	<title>다듬은 기록 | 딸깍</title>
	<meta
		name="description"
		content="딸깍은 매일 다음 날 문제를 먼저 풀어 보고, 걸리는 것을 공개 전에 고쳐요. 무엇을 왜 고쳤는지 한 줄씩 남겨 둔 기록이에요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/news/fixes" />
</svelte:head>

<header class="cover">
	<nav class="crumb" aria-label="위치">
		<a href="/news">새 소식</a><span aria-hidden="true">›</span><span>다듬은 기록</span>
	</nav>
	<h1>다듬은 기록</h1>
	<p class="lead">
		딸깍은 매일 <b>다음 날 10문제를 먼저 직접 풀어 봐요.</b> 그림이 답을 알려 주거나, 답이 둘로 읽히거나, 해설이
		헷갈리는 것을 찾으면 공개 전에 고쳐요. 무엇을 왜 고쳤는지 여기에 남겨요. 이미 공개된 문제의 정답은 적지 않아요.
	</p>
</header>

<ol class="nlist">
	{#each FIX_LOG as f (f.date + f.title)}
		<li>
			<p class="meta"><time datetime={f.date}>{fmt(f.date)}</time><span class="kind">{f.kind}</span></p>
			<h2>{f.title}</h2>
			<p>{f.body}</p>
		</li>
	{/each}
</ol>

<style>
	.cover {
		margin-bottom: 14px;
	}
	.lead b {
		color: var(--text);
	}
	.nlist {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	li {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 16px;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	time {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}
	.kind {
		font-size: 11px;
		font-weight: 700;
		color: var(--muted-2);
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		padding: 1px 7px;
	}
	h2 {
		margin-top: 2px;
		font-size: 17px;
		font-weight: 900;
		word-break: keep-all;
	}
	li p:not(.meta) {
		margin-top: 4px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--muted);
		word-break: keep-all;
	}
</style>
