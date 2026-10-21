<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { starsByScore, isOpen, isTierEnd, loadProgress, saveProgress, type StageMeta, type StageProgress } from '$lib/stages';
	import { tierName, type Tier } from '$lib/tiers';

	/**
	 * 단계 도전 한 판의 진행(2026-10-20) — 잠금 · 진행 막대 · 별 · 다음 판. 문제 카드만 유형마다 card로 끼운다.
	 * 전개도 · 초성이 쓴다(상식 · 발견형 판 화면과 같은 규칙과 모양: 5문제, 3개 이상 통과 ★1, 4개 ★2, 다 맞히면 ★3).
	 * card(i, onsettle)는 i번 문제를 그리고, 다 풀면 onsettle(맞았나)를 한 번 부른다. 문제마다 {#key}로 새로 만든다.
	 */
	let {
		label,
		base,
		storageKey,
		event,
		current,
		count,
		otherKey,
		legacy,
		card
	}: {
		label: string;
		base: string;
		storageKey: string;
		/** 계측 앞머리 — `${event}_start` · `_clear` · `_fail` */
		event: string;
		current: { key: string; tier: Tier; inTier: number; stages: StageMeta[] };
		/** 10/20 줄번호 기록을 열쇠로 옮길 표(stages.ts legacyKeys) */
		legacy?: string[];
		count: number;
		otherKey: 'match' | 'cho' | 'trivia' | 'discover' | 'cube';
		card: Snippet<[number, (ok: boolean) => void]>;
	} = $props();

	let progress = $state<StageProgress>({});
	let locked = $state(false);
	let pos = $state(0);
	let settled = $state(false);
	let marks = $state<boolean[]>([]);
	let done = $state(false);

	let score = $derived(marks.filter(Boolean).length);
	let stars = $derived(starsByScore(score, count));
	let idx = $derived(current.stages.findIndex((s) => s.key === current.key));
	let next = $derived(current.stages[idx + 1] ?? null);
	let prev = $derived(current.stages.find((s) => s.tier === current.tier && s.inTier === current.inTier - 1) ?? null);
	let title = $derived(`${tierName(current.tier)} ${current.inTier}판`);

	onMount(() => {
		progress = loadProgress(storageKey, legacy);
		locked = !isOpen(current.stages, progress, current.key);
		if (!locked) track(`${event}_start`, { stage: current.key, tier: current.tier });
	});

	function onsettle(ok: boolean) {
		if (settled) return;
		settled = true;
		marks = [...marks, ok];
	}

	function go() {
		if (pos + 1 < count) {
			pos++;
			settled = false;
			window.scrollTo({ top: 0 });
			return;
		}
		done = true;
		if (stars > (progress[current.key] ?? 0)) {
			progress = { ...progress, [current.key]: stars };
			saveProgress(storageKey, progress);
		}
		track(stars ? `${event}_clear` : `${event}_fail`, { stage: current.key, tier: current.tier, stars });
		// 단계 마지막 판을 깼다 — 이 사람에게 그 단계 문제가 바닥났다(10/21, 채울 단계를 고르는 신호)
		if (stars && isTierEnd(current.stages, current.key)) track(`${event}_tier_end`, { tier: current.tier });
		window.scrollTo({ top: 0 });
	}

	function again() {
		pos = 0;
		settled = false;
		marks = [];
		done = false;
		track(`${event}_start`, { stage: current.key, tier: current.tier });
		window.scrollTo({ top: 0 });
	}
</script>

{#if locked && prev}
	<section class="card result">
		<span class="kicker">{label} 단계 도전 · {title}</span>
		<h1>아직 잠긴 판이에요</h1>
		<p class="lead">앞 판을 3문제 이상 맞히면 열려요.</p>
		<a class="cta" href="{base}/{prev.key}">{tierName(prev.tier)} {prev.inTier}판 하러 가기 <span aria-hidden="true">→</span></a>
		<a class="ghost" href={base}>단계 지도 보기</a>
	</section>
{:else if !done}
	<div class="topbar">
		<a class="back" href={base}>단계 지도</a>
		<span class="sc">{title} · {pos + 1} / {count}</span>
	</div>
	<div class="bar"><i style="width:{(marks.length / count) * 100}%"></i></div>
	<section class="card">
		<div class="chiprow"><span class="lv lv{current.tier}">{tierName(current.tier)}</span><span>{label}</span></div>
		{#key pos}
			{@render card(pos, onsettle)}
		{/key}
		{#if settled}
			<button class="cta" onclick={go}>{pos + 1 < count ? '다음 문제' : '결과 보기'} <span aria-hidden="true">→</span></button>
		{/if}
	</section>
{:else}
	<section class="card result">
		<span class="kicker">{label} 단계 도전 · {title}</span>
		<div class="stars" aria-label="별 {stars}개">{'★'.repeat(stars)}<span>{'★'.repeat(3 - stars)}</span></div>
		<h1>{stars ? `${title} 통과!` : '조금만 더!'}</h1>
		<p class="lead">
			{count}문제 중 {score}문제 맞혔어요.
			{#if !stars}3문제 이상 맞히면 다음 판이 열려요.{:else if stars < 3}다 맞히면 별 3개예요.{/if}
		</p>
		<div class="marks">{marks.map((m) => (m ? '✅' : '❌')).join(' ')}</div>
		{#if stars && next}
			<a class="cta" href="{base}/{next.key}">
				{next.tier !== current.tier ? `${tierName(next.tier)} 단계로 올라가기` : `${tierName(next.tier)} ${next.inTier}판으로`} <span aria-hidden="true">→</span>
			</a>
		{/if}
		<button class="ghost" class:first={!stars} onclick={again}>이 판 다시 하기</button>
		<a class="ghost" href={base}>단계 지도 보기</a>
	</section>
	<OtherGames current={otherKey} />
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
