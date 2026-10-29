<script lang="ts">
	import { onMount } from 'svelte';
	import { NOTICES, markSeen } from '$lib/notices';

	/** 새 소식 전체 목록(notices.ts). 여기까지 온 사람은 다 본 것으로 친다. */
	onMount(() => markSeen(NOTICES.map((n) => n.id)));

	const fmt = (d: string) => {
		const [y, m, dd] = d.split('-');
		return `${y}.${m}.${dd}`;
	};
</script>

<svelte:head>
	<title>새 소식 | 딸깍</title>
	<meta name="description" content="딸깍에 새로 나온 퍼즐과 기능을 모아 둔 곳이에요." />
	<link rel="canonical" href="https://ddalkkak.app/news" />
</svelte:head>

<header class="cover">
	<h1>새 소식</h1>
	<p class="lead">딸깍에 새로 나온 퍼즐과 기능이에요. 공개 전에 고친 문제는 <a href="/news/fixes">다듬은 기록</a>에 따로 적어요.</p>
</header>

<ol class="nlist">
	{#each NOTICES as n (n.id)}
		<li>
			<time datetime={n.date}>{fmt(n.date)}</time>
			<h2>{n.title}</h2>
			<p>{n.body}</p>
			<a href={n.href}>{n.cta} <span aria-hidden="true">→</span></a>
		</li>
	{/each}
</ol>

<style>
	.cover {
		margin-bottom: 14px;
	}
	.lead a {
		color: var(--accent-text);
		font-weight: 700;
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
	time {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}
	h2 {
		margin-top: 2px;
		font-size: 17px;
		font-weight: 900;
	}
	li p {
		margin-top: 4px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--muted);
		word-break: keep-all;
	}
	li a {
		display: inline-block;
		margin-top: 8px;
		font-size: 14px;
		font-weight: 800;
		color: var(--accent-text);
		text-decoration: none;
	}
</style>
