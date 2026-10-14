<script lang="ts">
	import { onMount } from 'svelte';
	import GameCards from '$lib/components/GameCards.svelte';
	import NewsBar from '$lib/components/NewsBar.svelte';
	import { todayMissions, type Mission } from '$lib/missions';
	import { kstDayNumber } from '$lib/game';

	/**
	 * 놀이(v2, 2026-10-14) — 딸깍의 모든 퍼즐을 한 화면에서 고른다.
	 * 놀이가 메인·헤더·푸터에 흩어져 있었고, 유형 홈 몇 곳은 메인에서 닿지 않았다(10/14 점검).
	 */
	let { data } = $props();
	let missions = $state<Mission[]>([]);
	let left = $derived(missions.filter((m) => !m.done).length);

	onMount(() => {
		missions = todayMissions(kstDayNumber(Date.now()));
	});
</script>

<svelte:head>
	<title>놀이 — 성냥개비·초성·상식·발견형·전개도 퍼즐 | 딸깍</title>
	<meta
		name="description"
		content="성냥개비 {data.counts.match}문제, 초성 퀴즈 {data.counts.chosung}문제, 상식 퀴즈 {data.counts.trivia}문제, 발견형 {data.counts.discover}문제, 전개도 {data.counts.cube}문제. 딸깍의 모든 퍼즐을 한 곳에서 골라 풀어요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/games" />
</svelte:head>

<NewsBar />

<header class="ghead">
	<h1>놀이</h1>
	<p>딸깍의 퍼즐을 골라 풀어요. 가입 없이 바로 시작해요.</p>
</header>

{#if missions.length}
	<section class="mission">
		<h2>오늘의 미션 <span>{left ? `${left}개 남았어요` : '오늘은 다 했어요'}</span></h2>
		<div class="mrow">
			{#each missions as m (m.key)}
				<a href={m.href} class:done={m.done}>
					<span class="ck" aria-hidden="true">{m.done ? '✓' : ''}</span>{m.label}
				</a>
			{/each}
		</div>
	</section>
{/if}

<GameCards counts={data.counts} full />

<style>
	.ghead {
		margin-bottom: 14px;
	}
	h1 {
		font-size: 28px;
		font-weight: 900;
	}
	.ghead p {
		margin-top: 4px;
		font-size: 14px;
		color: var(--muted);
	}
	.mission {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 14px;
		margin-bottom: 14px;
	}
	.mission h2 {
		font-size: 15px;
		font-weight: 900;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
	}
	.mission h2 span {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--accent-text);
	}
	.mrow {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.mrow a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 4px;
		border-radius: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		font-size: 12px;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
		text-align: center;
		word-break: keep-all;
	}
	.ck {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--border-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 900;
		color: #fff;
	}
	.mrow a.done {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.mrow a.done .ck {
		background: var(--accent);
		border-color: var(--accent);
	}
</style>
