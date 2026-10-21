<script lang="ts">
	import { onMount } from 'svelte';
	import StageMap from '$lib/components/StageMap.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { loadProgress, type StageProgress } from '$lib/stages';
	import { CHOSUNG_STAGE_KEY, CHOSUNG_LEGACY } from '$lib/chosungStages';

	/** 초성 단계 도전 지도(2026-10-20) — 새싹 7 · 쉬움 24 · 보통 24 · 어려움 9판 */
	let { data } = $props();
	let progress = $state<StageProgress>({});
	onMount(() => (progress = loadProgress(CHOSUNG_STAGE_KEY, CHOSUNG_LEGACY)));
	let cleared = $derived(Object.values(progress).filter((v) => v >= 1).length);
</script>

<svelte:head>
	<title>초성 퀴즈 단계 도전 — 새싹부터 어려움까지 {data.stages.length}판 | 딸깍</title>
	<meta
		name="description"
		content="동물 · 음식 · 과일 · 나라 · 사자성어 초성 퀴즈를 쉬운 낱말부터 어려운 낱말까지 {data.stages.length}판으로 나눴어요. 한 판에 5낱말, 3개 이상 맞히면 다음 판이 열려요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/chosung/stages" />
</svelte:head>

<header class="head">
	<span class="kicker">초성 퀴즈</span>
	<h1>단계 도전</h1>
	<p class="lead">
		초성만 보고 낱말을 맞혀요. 막히면 힌트를 열어도 돼요. 한 판에 5낱말, 3개 이상 맞히면 다음 판이 열려요.
		{#if cleared}<b>지금까지 {cleared}판 통과했어요.</b>{/if}
	</p>
</header>

<StageMap stages={data.stages} {progress} hrefOf={(no) => `/chosung/stages/${no}`} />

<OtherGames current="cho" />

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
