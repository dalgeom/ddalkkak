<script lang="ts">
	import StageRun from '$lib/components/StageRun.svelte';
	import ChosungCard from '$lib/components/ChosungCard.svelte';
	import { CHOSUNG_STAGE_KEY, CHOSUNG_LEGACY } from '$lib/chosungStages';
	import { tierName } from '$lib/tiers';

	/** 초성 단계 도전 한 판(2026-10-20) — 진행 · 별은 StageRun, 낱말 풀기는 ChosungCard */
	let { data } = $props();
</script>

<svelte:head>
	<title>초성 퀴즈 단계 도전 {tierName(data.tier)} {data.inTier}판 | 딸깍</title>
	<meta name="robots" content="noindex" />
	<link rel="canonical" href="https://ddalkkak.app/chosung/stages/{data.key}" />
</svelte:head>

<StageRun label="초성" base="/chosung/stages" storageKey={CHOSUNG_STAGE_KEY} legacy={CHOSUNG_LEGACY} event="chstage" current={data} count={data.words.length} otherKey="cho">
	{#snippet card(i, onsettle)}
		<ChosungCard word={data.words[i]} {onsettle} />
	{/snippet}
</StageRun>
