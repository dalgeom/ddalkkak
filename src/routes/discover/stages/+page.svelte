<script lang="ts">
	import { onMount } from 'svelte';
	import StageMap from '$lib/components/StageMap.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { loadProgress, type StageProgress } from '$lib/stages';
	import { DISCOVER_STAGE_KEY, DISCOVER_LEGACY } from '$lib/discoverStages';

	/**
	 * 발견형 단계 도전 지도(2026-10-20) — 새싹 8 · 쉬움 20 · 보통 21 · 어려움 20 · 고수 5판.
	 * 처음이면 새싹부터 「아!」를 쌓고, 퍼즐을 좋아하면 어려움 · 고수부터 바로 시작한다.
	 */
	let { data } = $props();
	let progress = $state<StageProgress>({});
	onMount(() => (progress = loadProgress(DISCOVER_STAGE_KEY, DISCOVER_LEGACY)));
	let cleared = $derived(Object.values(progress).filter((v) => v >= 1).length);
</script>

<svelte:head>
	<title>규칙 찾기 퍼즐 단계 도전 — 새싹부터 고수까지 74판 | 딸깍</title>
	<meta
		name="description"
		content="예시 몇 줄을 보고 숨은 규칙을 찾는 발견형 퍼즐을 새싹부터 고수까지 74판으로 나눴어요. 한 판에 5문제, 3문제 이상 맞히면 다음 판이 열려요. 힌트와 해설이 있어요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/discover/stages" />
</svelte:head>

<header class="head">
	<span class="kicker">발견형 퍼즐</span>
	<h1>단계 도전</h1>
	<p class="lead">
		예시를 보고 숨은 규칙을 찾아요. 새싹은 누구나 바로 풀리고, 고수는 머리를 제대로 굴려야 해요. 한 판에 5문제, 3문제 이상 맞히면 다음 판이 열려요.
		{#if cleared}<b>지금까지 {cleared}판 통과했어요.</b>{/if}
	</p>
</header>

<StageMap stages={data.stages} {progress} hrefOf={(no) => `/discover/stages/${no}`} />

<OtherGames current="discover" />

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
