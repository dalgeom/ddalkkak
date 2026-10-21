<script lang="ts">
	import StageRun from '$lib/components/StageRun.svelte';
	import CubeCard from '$lib/components/CubeCard.svelte';
	import { CUBE_STAGE_KEY, CUBE_LEGACY } from '$lib/cubeStages';
	import { tierName } from '$lib/tiers';

	/** 전개도 단계 도전 한 판(2026-10-20) — 진행 · 별은 StageRun, 문제는 CubeCard */
	let { data } = $props();
</script>

<svelte:head>
	<title>전개도 퍼즐 단계 도전 {tierName(data.tier)} {data.inTier}판 | 딸깍</title>
	<meta name="robots" content="noindex" />
	<link rel="canonical" href="https://ddalkkak.app/cubenet/stages/{data.key}" />
</svelte:head>

<StageRun label="전개도" base="/cubenet/stages" storageKey={CUBE_STAGE_KEY} legacy={CUBE_LEGACY} event="cbstage" current={data} count={data.problems.length} otherKey="cube">
	{#snippet card(i, onsettle)}
		<CubeCard problem={data.problems[i]} {onsettle} />
	{/snippet}
</StageRun>
