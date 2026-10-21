<script lang="ts">
	import { onMount } from 'svelte';
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { starsByScore, isOpen, isTierEnd, loadProgress, saveProgress, STAGE_SIZE, type StageProgress } from '$lib/stages';
	import { TRIVIA_STAGE_KEY, TRIVIA_LEGACY } from '$lib/triviaStages';
	import { tierName } from '$lib/tiers';

	/**
	 * 상식 단계 도전 한 판(2026-10-20) — 5문제, 3문제 이상이면 통과(★1), 4문제 ★2, 다 맞히면 ★3.
	 * 보기 카드 · 해설은 상식 대결(trivia/duel)과 같은 모양이다. 진행은 기기에 남는다(stages.ts).
	 */
	let { data } = $props();

	let progress = $state<StageProgress>({});
	let locked = $state(false);
	let pos = $state(0);
	let picked = $state<number | null>(null);
	let marks = $state<boolean[]>([]);
	let done = $state(false);

	let q = $derived(data.questions[pos]);
	let score = $derived(marks.filter(Boolean).length);
	let stars = $derived(starsByScore(score));
	let next = $derived(data.stages[data.stages.findIndex((s) => s.key === data.key) + 1] ?? null);
	let prev = $derived(data.stages.find((s) => s.tier === data.tier && s.inTier === data.inTier - 1) ?? null);
	let title = $derived(`${tierName(data.tier)} ${data.inTier}판`);

	onMount(() => {
		progress = loadProgress(TRIVIA_STAGE_KEY, TRIVIA_LEGACY);
		locked = !isOpen(data.stages, progress, data.key);
		if (!locked) track('tstage_start', { stage: data.key, tier: data.tier });
	});

	function choose(i: number) {
		if (picked !== null) return;
		picked = i;
		marks = [...marks, i === q.answerIndex];
	}

	function go() {
		if (pos + 1 < data.questions.length) {
			pos++;
			picked = null;
			window.scrollTo({ top: 0 });
			return;
		}
		done = true;
		if (stars > (progress[data.key] ?? 0)) {
			progress = { ...progress, [data.key]: stars };
			saveProgress(TRIVIA_STAGE_KEY, progress);
		}
		track(stars ? 'tstage_clear' : 'tstage_fail', { stage: data.key, tier: data.tier, stars });
		// 단계 마지막 판을 깼다 — 이 사람에게 그 단계 문제가 바닥났다(10/21, 채울 단계를 고르는 신호)
		if (stars && isTierEnd(data.stages, data.key)) track('tstage_tier_end', { tier: data.tier });
		window.scrollTo({ top: 0 });
	}

	function again() {
		pos = 0;
		picked = null;
		marks = [];
		done = false;
		track('tstage_start', { stage: data.key, tier: data.tier });
		window.scrollTo({ top: 0 });
	}
</script>

<svelte:head>
	<title>상식 퀴즈 단계 도전 {title} | 딸깍</title>
	<meta name="description" content="상식 퀴즈 단계 도전 {title}. 5문제 중 3문제 이상 맞히면 다음 판이 열려요." />
	<link rel="canonical" href="https://ddalkkak.app/trivia/stages/{data.key}" />
	<meta name="robots" content="noindex" />
</svelte:head>

{#if locked && prev}
	<section class="card result">
		<span class="kicker">상식 단계 도전 · {title}</span>
		<h1>아직 잠긴 판이에요</h1>
		<p class="lead">앞 판을 3문제 이상 맞히면 열려요.</p>
		<a class="cta" href="/trivia/stages/{prev?.key}">{tierName(data.tier)} {data.inTier - 1}판 하러 가기 <span aria-hidden="true">→</span></a>
		<a class="ghost" href="/trivia/stages">단계 지도 보기</a>
	</section>
{:else if !done && q}
	<div class="topbar">
		<a class="back" href="/trivia/stages">단계 지도</a>
		<span class="sc">{title} · {pos + 1} / {STAGE_SIZE}</span>
	</div>
	<div class="bar"><i style="width:{(marks.length / data.questions.length) * 100}%"></i></div>
	<section class="card qcard">
		<div class="chips"><span class="lv lv{data.tier}">{tierName(data.tier)}</span><span>{q.category}</span></div>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- 문제 문장은 우리 데이터(trivia.ts)다 -->
		<h2 class="q">{@html q.html}</h2>
		<div class="choices">
			{#each q.choices as c, i (i)}
				<button
					class="choice"
					class:ok={picked !== null && i === q.answerIndex}
					class:no={picked === i && i !== q.answerIndex}
					disabled={picked !== null}
					onclick={() => choose(i)}
				>
					<span class="badge">{'ABCDE'[i]}</span>{c}
				</button>
			{/each}
		</div>
		{#if picked !== null}
			<p class="verdict" class:right={picked === q.answerIndex}>{picked === q.answerIndex ? '딸깍! 맞혔어요' : '아쉬워요'}</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 해설은 우리 데이터다 -->
			<p class="exp">{@html q.explain}</p>
			<button class="cta" onclick={go}>{pos + 1 < data.questions.length ? '다음 문제' : '결과 보기'} <span aria-hidden="true">→</span></button>
		{/if}
	</section>
{:else if done}
	<section class="card result">
		<span class="kicker">상식 단계 도전 · {title}</span>
		<div class="stars" aria-label="별 {stars}개">{'★'.repeat(stars)}<span>{'★'.repeat(3 - stars)}</span></div>
		<h1>{stars ? `${title} 통과!` : '조금만 더!'}</h1>
		<p class="lead">
			5문제 중 {score}문제 맞혔어요.
			{#if !stars}3문제 이상 맞히면 다음 판이 열려요.{:else if stars < 3}다 맞히면 별 3개예요.{/if}
		</p>
		<div class="marks">{marks.map((m) => (m ? '✅' : '❌')).join(' ')}</div>
		{#if stars && next}
			<a class="cta" href="/trivia/stages/{next.key}">
				{next.tier !== data.tier ? `${tierName(next.tier)} 단계로 올라가기` : `${tierName(next.tier)} ${next.inTier}판으로`} <span aria-hidden="true">→</span>
			</a>
		{/if}
		<button class="ghost" class:first={!stars} onclick={again}>이 판 다시 하기</button>
		<a class="ghost" href="/trivia/stages">단계 지도 보기</a>
	</section>
	<OtherGames current="trivia" />
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
	.chips {
		display: flex;
		gap: 6px;
	}
	.chips span {
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
		background: var(--panel-2);
		border-radius: 7px;
		padding: 3px 8px;
	}
	.chips .lv {
		color: var(--accent-text);
		background: var(--correct-bg);
	}
	.chips .lv3 {
		color: var(--gold-text);
		background: var(--gold-bg);
	}
	.chips .lv4,
	.chips .lv5 {
		color: var(--danger);
		background: var(--danger-bg);
	}
	.q {
		margin: 12px 0 14px;
		font-size: 18px;
		font-weight: 800;
		line-height: 1.55;
		word-break: keep-all;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 13px 14px;
		border-radius: 14px;
		border: 1.5px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-size: 15.5px;
		font-weight: 600;
		text-align: left;
		font-family: inherit;
		cursor: pointer;
	}
	.choice:disabled {
		cursor: default;
	}
	.choice.ok {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.choice.no {
		border-color: var(--danger);
		background: var(--danger-bg);
	}
	.badge {
		flex: none;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.verdict {
		margin-top: 14px;
		font-size: 16px;
		font-weight: 900;
		color: var(--danger);
	}
	.verdict.right {
		color: var(--accent-text);
	}
	.exp {
		margin-top: 6px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
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
