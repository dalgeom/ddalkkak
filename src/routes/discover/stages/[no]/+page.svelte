<script lang="ts">
	import { onMount } from 'svelte';
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import DiscoverCard from '$lib/components/DiscoverCard.svelte';
	import { starsByScore, isOpen, loadProgress, saveProgress, STAGE_SIZE, type StageProgress } from '$lib/stages';
	import { DISCOVER_STAGE_KEY } from '$lib/discoverStages';
	import { tierName } from '$lib/tiers';

	/**
	 * 발견형 단계 도전 한 판(2026-10-20) — 5문제, 3문제 이상이면 통과(★1), 4문제 ★2, 다 맞히면 ★3.
	 * 풀이 · 힌트 · 판정은 무한 연습과 같다(DiscoverCard). 힌트를 써도 맞히면 맞힌 것으로 센다 — 훈련이 목적이다.
	 */
	let { data } = $props();

	let progress = $state<StageProgress>({});
	let locked = $state(false);
	let pos = $state(0);
	let settled = $state(false);
	let marks = $state<boolean[]>([]);
	let done = $state(false);

	let score = $derived(marks.filter(Boolean).length);
	let stars = $derived(starsByScore(score));
	let next = $derived(data.no < data.total ? data.stages[data.no] : null);
	let title = $derived(`${tierName(data.tier)} ${data.inTier}판`);
	let prev = $derived(data.no > 1 ? data.stages[data.no - 2] : null);

	onMount(() => {
		progress = loadProgress(DISCOVER_STAGE_KEY);
		locked = !isOpen(data.stages, progress, data.no);
		if (!locked) track('dstage_start', { stage: data.no, tier: data.tier });
	});

	function onsettle(r: { ok: boolean }) {
		settled = true;
		marks = [...marks, r.ok];
	}

	function go() {
		if (pos + 1 < data.problems.length) {
			pos++;
			settled = false;
			window.scrollTo({ top: 0 });
			return;
		}
		done = true;
		if (stars > (progress[data.no] ?? 0)) {
			progress = { ...progress, [data.no]: stars };
			saveProgress(DISCOVER_STAGE_KEY, progress);
		}
		track(stars ? 'dstage_clear' : 'dstage_fail', { stage: data.no, tier: data.tier, stars });
		window.scrollTo({ top: 0 });
	}

	function again() {
		pos = 0;
		settled = false;
		marks = [];
		done = false;
		track('dstage_start', { stage: data.no, tier: data.tier });
		window.scrollTo({ top: 0 });
	}
</script>

<svelte:head>
	<title>규칙 찾기 퍼즐 단계 도전 {title} | 딸깍</title>
	<meta name="description" content="발견형 퍼즐 단계 도전 {title}. 5문제 중 3문제 이상 맞히면 다음 판이 열려요." />
	<link rel="canonical" href="https://ddalkkak.app/discover/stages/{data.no}" />
	<meta name="robots" content="noindex" />
</svelte:head>

{#if locked && prev}
	<section class="card result">
		<span class="kicker">발견형 단계 도전 · {title}</span>
		<h1>아직 잠긴 판이에요</h1>
		<p class="lead">앞 판을 3문제 이상 맞히면 열려요.</p>
		<a class="cta" href="/discover/stages/{prev.no}">{tierName(prev.tier)} {prev.inTier}판 하러 가기 <span aria-hidden="true">→</span></a>
		<a class="ghost" href="/discover/stages">단계 지도 보기</a>
	</section>
{:else if !done}
	<div class="topbar">
		<a class="back" href="/discover/stages">단계 지도</a>
		<span class="sc">{title} · {pos + 1} / {STAGE_SIZE}</span>
	</div>
	<div class="bar"><i style="width:{(marks.length / data.problems.length) * 100}%"></i></div>
	<section class="card">
		<div class="chiprow"><span class="lv lv{data.tier}">{tierName(data.tier)}</span><span class="cat">{data.problems[pos].chip}</span></div>
		{#key pos}
			<DiscoverCard problem={data.problems[pos]} {onsettle} />
		{/key}
		{#if settled}
			<button class="cta" onclick={go}>{pos + 1 < data.problems.length ? '다음 문제' : '결과 보기'} <span aria-hidden="true">→</span></button>
		{/if}
	</section>
{:else}
	<section class="card result">
		<span class="kicker">발견형 단계 도전 · {title}</span>
		<div class="stars" aria-label="별 {stars}개">{'★'.repeat(stars)}<span>{'★'.repeat(3 - stars)}</span></div>
		<h1>{stars ? `${title} 통과!` : '조금만 더!'}</h1>
		<p class="lead">
			5문제 중 {score}문제 맞혔어요.
			{#if !stars}3문제 이상 맞히면 다음 판이 열려요.{:else if stars < 3}다 맞히면 별 3개예요.{/if}
		</p>
		<div class="marks">{marks.map((m) => (m ? '✅' : '❌')).join(' ')}</div>
		{#if stars && next}
			<a class="cta" href="/discover/stages/{next.no}">
				{next.tier !== data.tier ? `${tierName(next.tier)} 단계로 올라가기` : `${tierName(next.tier)} ${next.inTier}판으로`} <span aria-hidden="true">→</span>
			</a>
		{/if}
		<button class="ghost" class:first={!stars} onclick={again}>이 판 다시 하기</button>
		<a class="ghost" href="/discover/stages">단계 지도 보기</a>
	</section>
	<OtherGames current="discover" />
{/if}

<style>
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 22px 18px;
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
		font-size: 24px;
		font-weight: 900;
		line-height: 1.35;
		word-break: keep-all;
	}
	.lead {
		margin-top: 8px;
		font-size: 14.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 14px;
		font-weight: 800;
		margin-bottom: 8px;
	}
	.back {
		color: var(--muted);
		text-decoration: none;
		font-weight: 700;
	}
	.sc {
		color: var(--accent-text);
	}
	.bar {
		height: 6px;
		border-radius: 4px;
		background: var(--border);
		overflow: hidden;
		margin-bottom: 14px;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--accent);
		transition: width 0.25s ease-out;
	}
	.chiprow {
		display: flex;
		gap: 6px;
	}
	.chiprow span {
		font-size: 12px;
		font-weight: 800;
		border-radius: 7px;
		padding: 3px 8px;
		color: var(--muted);
		background: var(--panel-2);
	}
	.chiprow .lv {
		color: var(--accent-text);
		background: var(--correct-bg);
	}
	.chiprow .lv3 {
		color: var(--gold-text);
		background: var(--gold-bg);
	}
	.chiprow .lv4,
	.chiprow .lv5 {
		color: var(--danger);
		background: var(--danger-bg);
	}
	.result {
		text-align: center;
	}
	.stars {
		margin-top: 12px;
		font-size: 44px;
		letter-spacing: 6px;
		color: var(--gold-text);
		line-height: 1.1;
	}
	.stars span {
		color: var(--border-strong);
	}
	.marks {
		margin-top: 10px;
		font-size: 20px;
		letter-spacing: 3px;
	}
	.cta {
		display: block;
		width: 100%;
		margin-top: 18px;
		padding: 15px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		font-family: inherit;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
		box-sizing: border-box;
	}
	.ghost {
		display: block;
		width: 100%;
		margin-top: 10px;
		padding: 13px;
		border-radius: 14px;
		border: 1px solid var(--border-strong);
		background: transparent;
		color: var(--text);
		font-size: 14.5px;
		font-weight: 700;
		font-family: inherit;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		box-sizing: border-box;
	}
	.ghost.first {
		margin-top: 18px;
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
</style>
