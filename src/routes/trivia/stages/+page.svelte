<script lang="ts">
	import { onMount } from 'svelte';
	import StageMap from '$lib/components/StageMap.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { loadProgress, type StageProgress } from '$lib/stages';
	import { TRIVIA_STAGE_KEY, TRIVIA_LEGACY } from '$lib/triviaStages';

	/**
	 * 상식 단계 도전 지도(2026-10-20) — 새싹(초등) · 쉬움(중등) · 보통(고등) · 어려움(어른) 75판.
	 * 진행은 기기에 남는다. 가족 누구나 새싹부터, 잘하는 사람은 어려움 1판부터 바로 시작한다.
	 */
	let { data } = $props();
	let progress = $state<StageProgress>({});
	onMount(() => (progress = loadProgress(TRIVIA_STAGE_KEY, TRIVIA_LEGACY)));
	let cleared = $derived(Object.values(progress).filter((v) => v >= 1).length);
</script>

<svelte:head>
	<title>상식 퀴즈 단계 도전 — 새싹부터 고수까지 {data.stages.length}판 | 딸깍</title>
	<meta
		name="description"
		content="초등 수준 새싹부터 어른도 대부분 틀리는 고수까지, 상식 퀴즈 {data.stages.length}판을 한 판에 5문제씩 풀어요. 3문제 이상 맞히면 다음 판이 열리고 별을 모아요. 가입 없이 바로."
	/>
	<link rel="canonical" href="https://ddalkkak.app/trivia/stages" />
</svelte:head>

<header class="head">
	<span class="kicker">상식 퀴즈</span>
	<h1>단계 도전</h1>
	<p class="lead">
		한 판에 5문제, 3문제 이상 맞히면 다음 판이 열려요. 새싹부터 차근차근 올라가도 되고, 자신 있으면 어려움부터 시작해도 돼요.
		{#if cleared}<b>지금까지 {cleared}판 통과했어요.</b>{/if}
	</p>
</header>

<StageMap stages={data.stages} {progress} hrefOf={(no) => `/trivia/stages/${no}`} />

<OtherGames current="trivia" />

<style>
	.head {
		margin-bottom: 18px;
	}
	.kicker {
		display: inline-block;
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-text);
		background: var(--correct-bg);
		border-radius: 7px;
		padding: 3px 9px;
	}
	h1 {
		margin-top: 10px;
		font-size: 26px;
		font-weight: 900;
	}
	.lead {
		margin-top: 8px;
		font-size: 14.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.lead b {
		color: var(--accent-text);
	}
</style>
