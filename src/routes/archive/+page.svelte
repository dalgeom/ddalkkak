<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>지난 문제 — 딸깍</title>
	<meta
		name="description"
		content="딸깍의 지난 오늘의 딸깍을 다시 풀어보세요. 매일 발견형 퍼즐·상식 퀴즈·성냥개비 11문제."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/archive" />
	<meta property="og:title" content="지난 문제 — 딸깍" />
	<meta property="og:description" content="딸깍의 지난 오늘의 딸깍을 다시 풀어보세요. 매일 발견형 퍼즐·상식 퀴즈·성냥개비 11문제." />
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/archive" />
</svelte:head>

<div class="head">
	<h1>지난 문제</h1>
	<p>매일 열렸던 오늘의 딸깍을 다시 풀어볼 수 있어요. 정답은 눌러야 열립니다.</p>
</div>

<ul class="days">
	{#each data.days as d (d.day)}
		<li>
			<a href="/archive/{d.day}">
				<span class="d-label">{d.label}</span>
				<span class="d-meta">
					<span>발견 3 · 상식 5 · 성냥개비 3</span>
					<Icon name="arrow" size={15} />
				</span>
			</a>
		</li>
	{/each}
</ul>

<div class="arch-ad"><AdSlot label="아카이브" /></div>

<style>
	.arch-ad {
		margin-top: 22px;
	}
	.head {
		padding: 8px 0 18px;
	}
	h1 {
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
		letter-spacing: -0.02em;
	}
	.head p {
		margin-top: 8px;
		font-size: var(--fs-sm);
		font-weight: var(--fw-caption);
		color: var(--muted);
		word-break: keep-all;
	}
	.days {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
	}
	.days a {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 18px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--text);
		transition:
			transform var(--dur-tap) var(--ease-out),
			border-color var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-move) var(--ease-out);
	}
	.days a:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 8px 20px rgba(44, 40, 34, 0.09);
	}
	.d-label {
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
		font-variant-numeric: tabular-nums;
	}
	.d-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
	}
</style>
