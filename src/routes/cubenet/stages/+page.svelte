<script lang="ts">
	import { onMount } from 'svelte';
	import StageMap from '$lib/components/StageMap.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { loadProgress, type StageProgress } from '$lib/stages';
	import { CUBE_STAGE_KEY, CUBE_LEGACY } from '$lib/cubeStages';

	/** 전개도 단계 도전 지도(2026-10-20) — 쉬움(십자 모양) 12 · 보통 12판 */
	let { data } = $props();
	let progress = $state<StageProgress>({});
	onMount(() => (progress = loadProgress(CUBE_STAGE_KEY, CUBE_LEGACY)));
	let cleared = $derived(Object.values(progress).filter((v) => v >= 1).length);
</script>

<svelte:head>
	<title>전개도 퍼즐 단계 도전 — 쉬움부터 보통까지 24판 | 딸깍</title>
	<meta
		name="description"
		content="정육면체 전개도를 접으면 어떤 주사위가 될지 고르는 퍼즐을 쉬운 십자 모양부터 24판으로 나눴어요. 한 판에 5문제, 3문제 이상 맞히면 다음 판이 열려요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/cubenet/stages" />
</svelte:head>

<header class="head">
	<span class="kicker">전개도 퍼즐</span>
	<h1>단계 도전</h1>
	<p class="lead">
		펼친 그림을 접으면 어떤 주사위가 될까요? 쉬운 십자 모양부터 시작해요. 한 판에 5문제, 3문제 이상 맞히면 다음 판이 열려요.
		{#if cleared}<b>지금까지 {cleared}판 통과했어요.</b>{/if}
	</p>
</header>

<StageMap stages={data.stages} {progress} hrefOf={(no) => `/cubenet/stages/${no}`} />

<OtherGames current="cube" />

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
