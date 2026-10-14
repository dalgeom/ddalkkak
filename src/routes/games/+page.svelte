<script lang="ts">
	import GameCards from '$lib/components/GameCards.svelte';
	import NewsBar from '$lib/components/NewsBar.svelte';
	import Missions from '$lib/components/Missions.svelte';

	/**
	 * 놀이(v2, 2026-10-14) — 딸깍의 모든 퍼즐을 한 화면에서 고른다.
	 * 놀이가 메인·헤더·푸터에 흩어져 있었고, 유형 홈 몇 곳은 메인에서 닿지 않았다(10/14 점검).
	 */
	let { data } = $props();
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

<div class="msp"><Missions /></div>

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
	.msp {
		margin-bottom: 14px;
	}
</style>
