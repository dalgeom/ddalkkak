<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import { readDailyProgress, DAILY_SIZE } from '$lib/game';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * 그날 10문제를 끝냈는지 표시한다.
	 * 예전엔 트랙별 키(ddal.daily.{day}.{track})를 읽었는데, 저장 구조가 하루 한 세션
	 * (ddal.day.{day})으로 바뀐 뒤로 배지가 영영 안 켜졌다.
	 */
	let doneDays = $state<Set<number>>(new Set());
	let solvedOf = $state<Record<number, number>>({});

	onMount(() => {
		if (!browser) return;
		const done = new Set<number>();
		const solved: Record<number, number> = {};
		for (const { day } of data.days) {
			const p = readDailyProgress(day);
			if (p.done) done.add(day);
			if (p.marks.length) solved[day] = p.marks.filter((m) => m !== 'miss').length;
		}
		doneDays = done;
		solvedOf = solved;
	});

	let doneCount = $derived(doneDays.size);
</script>

<svelte:head>
	<title>지난 문제 — 딸깍</title>
	<meta
		name="description"
		content="놓친 날의 오늘의 딸깍을 날짜별로 다시 볼 수 있어요. 발견형 퍼즐·상식 퀴즈·성냥개비 10문제의 문제와 정답·해설."
	/>
	<link rel="canonical" href="https://ddalkkak.app/archive" />
	<meta property="og:title" content="지난 문제 — 딸깍" />
	<meta property="og:url" content="https://ddalkkak.app/archive" />
	<meta
		property="og:description"
		content="놓친 날의 오늘의 딸깍을 날짜별로 다시 확인하세요. 문제와 정답·해설."
	/>
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">지난 문제</span>
		<h1>놓친 날이 있다면<br /><b>지금 확인해 봐요</b></h1>
		<p class="lead">
			지난 {data.days.length}일치 오늘의 딸깍이 그대로 남아 있습니다. 날짜를 골라 그날의 10문제와
			정답·해설을 확인해 보세요.
		</p>
		{#if doneCount > 0}
			<div class="prog">
				<span class="pb"><span class="pf" style="width:{(doneCount / data.days.length) * 100}%"></span></span>
				<span class="pt">{data.days.length}일 중 <b>{doneCount}일</b> 완료</span>
			</div>
		{/if}
	</header>

	<section class="sec">
		<ul class="days">
			{#each data.days as d (d.day)}
				<li>
					<a href="/archive/{d.day}" class:done={doneDays.has(d.day)}>
						<span class="top">
							<span class="label">{d.label}</span>
							{#if doneDays.has(d.day)}
								<span class="badge done">완료</span>
							{:else if solvedOf[d.day] !== undefined}
								<span class="badge mid">풀던 중</span>
							{/if}
						</span>
						<span class="meta">
							{#if solvedOf[d.day] !== undefined}
								<b>{solvedOf[d.day]} / {DAILY_SIZE}</b> 정답
							{:else}
								발견 3 · 상식 3 · 성냥 3 · 보너스 1
							{/if}
							<span class="go" aria-hidden="true">→</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<div class="ad"><AdSlot label="아카이브" /></div>
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
		font-size: 24px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		font-size: 14px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.prog {
		margin-top: 16px;
	}
	.pb {
		display: block;
		height: 7px;
		border-radius: 999px;
		background: var(--border);
		overflow: hidden;
	}
	.pf {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--accent);
		transition: width var(--dur-move) var(--ease-out);
	}
	.pt {
		display: block;
		margin-top: 7px;
		font-size: 12.5px;
		color: var(--muted);
	}
	.pt b {
		color: var(--accent);
	}

	.sec {
		margin-top: 20px;
	}
	.days {
		list-style: none;
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
		padding: 0;
		margin: 0;
	}
	.days a {
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 15px 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text);
		transition:
			transform var(--dur-tap) var(--ease-out),
			border-color var(--dur-move) ease;
	}
	.days a:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
	}
	.days a.done {
		background: var(--correct-bg);
		border-color: #cfe3d6;
	}
	.top {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.label {
		font-size: 15px;
		font-weight: 800;
	}
	.badge {
		font-size: 11px;
		font-weight: 800;
		border-radius: 7px;
		padding: 3px 9px;
	}
	.badge.done {
		background: var(--accent);
		color: #fff;
	}
	.badge.mid {
		background: var(--gold-bg);
		color: var(--gold-text);
	}
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 12.5px;
		color: var(--muted);
	}
	.meta b {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.go {
		color: var(--muted-2);
		font-weight: 800;
	}
	.ad {
		margin: 0;
	}

	@media (min-width: 768px) {
		.cover {
			padding: 34px 30px 28px;
		}
		h1 {
			font-size: 28px;
		}
		.days {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
