<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>읽을거리 — 퍼즐 해설과 만드는 이야기 | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="성냥개비 문제 푸는 법, 전개도 접는 요령, 발견형 퍼즐을 만들고 버리는 기준 — 딸깍이 퍼즐을 만들며 정리한 글들입니다."
	/>
	<link rel="canonical" href="https://ddalkkak.app/read" />
	<meta property="og:title" content="읽을거리 — 퍼즐 해설과 만드는 이야기 | 딸깍 퍼즐" />
	<meta property="og:url" content="https://ddalkkak.app/read" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">읽을거리</span>
		<h1>퍼즐 해설과<br /><b>만드는 이야기</b></h1>
		<p class="lead">
			문제를 만들다 보면 요령이 쌓입니다. 성냥개비를 어떻게 푸는지, 전개도를 머릿속에서 어떻게
			접는지, 어떤 문제를 버리는지 — 풀다가 막힐 때 도움이 되도록 정리해 둡니다.
		</p>
	</header>

	<section class="sec">
		<ol class="list">
			{#each data.items as a (a.slug)}
				<li>
					<a class="item" href="/read/{a.slug}">
						<div class="ihead">
							<span class="chip">{a.tag}</span>
							<time datetime={a.date}>{a.date.replaceAll('-', '.')}</time>
						</div>
						<h2>{a.title}</h2>
						<p>{a.description}</p>
					</a>
				</li>
			{/each}
		</ol>
	</section>
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.kicker {
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-text);
		letter-spacing: 0.06em;
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

	.sec {
		margin-top: 18px;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.item {
		display: block;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px 18px;
		text-decoration: none;
		color: var(--text);
	}
	.item:hover {
		background: var(--panel-2);
	}
	.ihead {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.chip {
		font-size: 12px;
		font-weight: 700;
		color: var(--accent-text);
		background: var(--accent-soft);
		padding: 3px 9px;
		border-radius: 7px;
	}
	time {
		font-size: 12px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}
	.item h2 {
		margin: 0 0 6px;
		font-size: 16.5px;
		font-weight: 800;
		line-height: 1.45;
		word-break: keep-all;
	}
	.item p {
		margin: 0;
		font-size: 13px;
		line-height: 1.65;
		color: var(--muted);
		word-break: keep-all;
	}
</style>
