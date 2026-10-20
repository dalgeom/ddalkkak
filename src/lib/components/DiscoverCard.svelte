<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { Problem } from '$lib/problems';
	import { isCorrectText, isCloseAnswer, hintUnlocked, displayChoices } from '$lib/game';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import ExampleList from '$lib/components/ExampleList.svelte';

	/**
	 * 발견형 한 문제 풀기(2026-10-20, 단계 도전용). 판정 · 힌트 규칙은 무한 연습(/play)과 같다 —
	 * game.ts isCorrectText · isCloseAnswer · hintUnlocked(힌트는 10초 · 25초 또는 오답 뒤에 열린다).
	 * 보기형은 두 번 틀리면 정답을 보여 준다. 다 끝나면 onsettle로 결과를 넘기고 「다음」은 부모가 그린다.
	 * 문제를 바꿀 때는 {#key}로 새로 만든다(상태를 안에 둔다).
	 */
	let {
		problem: raw,
		onsettle
	}: { problem: Problem; onsettle: (r: { ok: boolean; hintsUsed: number }) => void } = $props();

	let p = $derived(displayChoices(raw));
	let answerValue = $state('');
	let picked = $state<number | null>(null);
	let judged = $state(false);
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let elapsedMs = $state(0);
	let inputEl = $state<HTMLInputElement>();
	const startedAt = Date.now();
	const timer = setInterval(() => {
		if (!judged) elapsedMs = Date.now() - startedAt;
	}, 1000);
	onDestroy(() => clearInterval(timer));
	onMount(() => {
		if (browser && p.type !== 'choice' && window.matchMedia?.('(hover: hover)').matches) tick().then(() => inputEl?.focus());
	});

	let hintWaitSec = $derived(Math.max(1, Math.ceil(((hintsUsed <= 1 ? 10000 : 25000) - elapsedMs) / 1000)));

	function settle(ok: boolean, msg: string) {
		if (judged) return;
		judged = true;
		feedback = { msg, ok };
		onsettle({ ok, hintsUsed });
	}
	function submitText() {
		if (judged || !answerValue.trim()) return;
		if (isCorrectText(p, answerValue)) settle(true, '딸깍! 맞혔어요');
		else {
			wrongAttempts += 1;
			feedback = isCloseAnswer(p, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}
	function submitChoice(i: number) {
		if (judged) return;
		picked = i;
		if (i === p.answerIndex) settle(true, '딸깍! 맞혔어요');
		else {
			wrongAttempts += 1;
			if (wrongAttempts >= 2) settle(false, '정답을 확인했어요');
			else feedback = { msg: '아쉬워요 — 한 번 더 골라볼까요?', ok: false };
		}
	}
	function showHint() {
		if (judged || !p.hints || hintsUsed >= p.hints.length) return;
		if (!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)) return;
		hintsUsed += 1;
	}
</script>

<div class="q">
	{#each p.blocks as b, i (i)}
		{#if b.kind === 'text'}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 문제 문장은 우리 데이터(problems.ts)다 -->
			<div class="qtext">{@html b.html}</div>
		{:else if b.kind === 'pre'}
			<ExampleList text={b.text} />
		{:else if b.kind === 'lcd'}
			<SevenSeg lines={b.lines} frags={b.frags} />
		{:else if b.kind === 'colors'}
			<ColorBlocks rows={b.rows} />
		{:else if b.kind === 'glyph'}
			<Glyph lines={b.lines} axis={b.axis} />
		{:else if b.kind === 'figure'}
			<Figure svg={b.svg} caption={b.caption} />
		{/if}
	{/each}
</div>

{#if p.type === 'choice'}
	<div class="choices">
		{#each p.choices ?? [] as c, i (i)}
			<button class="choice" class:ok={judged && i === p.answerIndex} class:bad={picked === i && i !== p.answerIndex} disabled={judged} onclick={() => submitChoice(i)}>
				<span class="badge">{['A', 'B', 'C', 'D', 'E'][i]}</span>
				<span class="ctext">{c}</span>
				{#if judged && i === p.answerIndex}<span class="mark">✓</span>
				{:else if picked === i && i !== p.answerIndex}<span class="mark bad">✕</span>{/if}
			</button>
		{/each}
	</div>
{:else}
	<input
		type="text"
		bind:this={inputEl}
		bind:value={answerValue}
		placeholder="답을 입력하세요"
		aria-label="정답 입력"
		autocomplete="off"
		disabled={judged}
		onkeydown={(e) => e.key === 'Enter' && submitText()}
	/>
{/if}

{#if !judged && p.hints}
	<div class="hint-row">
		<div class="dots" aria-hidden="true">
			{#each [0, 1, 2] as i (i)}<span class="dot" class:on={i < hintsUsed}></span>{/each}
		</div>
		<button class="hint-btn" disabled={hintsUsed >= 3 || !hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)} onclick={showHint}>
			{hintsUsed >= 3 ? '힌트 다 봤어요' : hintUnlocked(hintsUsed, elapsedMs, wrongAttempts) ? `힌트 보기 (${hintsUsed + 1}/3)` : `${hintWaitSec}초 뒤 힌트`}
		</button>
	</div>
{/if}

{#each (p.hints ?? []).slice(0, hintsUsed) as h, i (i)}
	<div class="hint-box">{h}</div>
{/each}

{#if feedback}
	<div class="feedback" class:ok={feedback.ok}>
		<span class="fmark">{feedback.ok ? '✓' : '✕'}</span>
		<span>{feedback.msg}</span>
	</div>
{/if}

{#if judged}
	{#if p.type !== 'choice' && feedback && !feedback.ok}
		<div class="answer-line">정답은 <b>{p.answers?.[0]}</b></div>
	{/if}
	<div class="explain">
		<b>해설</b>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- 해설은 우리 데이터다 -->
		{@html p.explain}
	</div>
{:else}
	<div class="actions">
		<button class="btn-outline" onclick={() => settle(false, '정답을 확인했어요')}>모르겠어요</button>
		{#if p.type !== 'choice'}<button class="btn-primary" onclick={submitText}>확인</button>{/if}
	</div>
{/if}

<style>
	/* 무한 연습(/play)과 같은 모양 — 그 화면 스타일에서 이 부품이 쓰는 것만 옮겼다 */
	.q {
		margin-top: 14px;
	}
	.qtext {
		font-size: 18px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.guide {
		margin-top: 10px;
		text-align: center;
		font-size: 13px;
		color: var(--muted);
	}

	input[type='text'] {
		width: 100%;
		margin-top: 16px;
		height: 50px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		padding: 0 14px;
		font-size: 16px;
		background: #fff;
		color: var(--text);
		font-family: inherit;
	}
	input[type='text']:focus {
		outline: none;
		border: 1.5px solid var(--accent);
	}

	.choices {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 16px;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		-webkit-text-fill-color: currentColor;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: #fff;
		text-align: left;
		cursor: pointer;
		font-family: inherit;
		transition:
			background var(--dur-move) ease,
			border-color var(--dur-move) ease;
	}
	.choice:disabled {
		cursor: default;
	}
	.badge {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--panel-2);
		color: var(--text);
		font-size: 13px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}
	.ctext {
		font-size: 15px;
		font-weight: 600;
		flex: 1;
		color: var(--text);
	}
	.mark {
		margin-left: auto;
		font-weight: 800;
		color: var(--accent-text);
	}
	.mark.bad {
		color: var(--danger);
	}
	.choice.ok {
		background: var(--correct-bg);
		border-color: var(--accent-text);
	}
	.choice.bad {
		background: var(--danger-bg);
		border-color: var(--danger);
	}

	.hint-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
	}
	.dots {
		display: flex;
		gap: 4px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--border);
		transition: background var(--dur-move) ease;
	}
	.dot.on {
		background: var(--gold);
	}
	.hint-btn {
		font-size: 13px;
		font-weight: 700;
		color: var(--gold-text);
		background: var(--gold-bg);
		border: 1px solid var(--gold);
		border-radius: 10px;
		padding: 5px 12px;
		cursor: pointer;
		font-family: inherit;
	}
	.hint-btn:disabled {
		color: var(--muted-2);
		background: var(--panel-2);
		border-color: var(--border);
		cursor: default;
	}
	.hint-box {
		margin-top: 10px;
		background: var(--gold-bg);
		border: 1px solid var(--gold);
		border-radius: 12px;
		padding: 12px 14px;
		font-size: 13.5px;
		color: var(--gold-text);
		line-height: 1.6;
	}

	.feedback {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
		padding: 11px 14px;
		border-radius: 12px;
		border: 1px solid var(--danger);
		background: var(--danger-bg);
		color: var(--danger);
		font-size: 14px;
		font-weight: 700;
	}
	.feedback.ok {
		border-color: var(--accent-text);
		background: var(--correct-bg);
		color: var(--accent-text);
	}
	.fmark {
		font-weight: 800;
	}
	/* 모르겠어요·오답 뒤 정답 공개 — 해설에 답이 없을 수 있어 정답을 따로 명시한다 */
	.answer-line {
		margin-top: 10px;
		background: var(--correct-bg);
		border: 1px solid var(--accent);
		border-radius: 12px;
		padding: 11px 14px;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
	}
	.answer-line b {
		color: var(--accent-text);
		font-weight: 800;
	}
	.explain {
		margin-top: 14px;
		background: var(--panel-2);
		border-radius: 12px;
		padding: 13px 14px;
		font-size: 13.5px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}
	.explain b {
		color: var(--text);
	}

	.actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
	.btn-outline {
		flex: 1;
		height: 48px;
		border-radius: 12px;
		background: transparent;
		color: var(--muted);
		font-size: 14px;
		font-weight: 700;
		border: 1px solid var(--border-strong);
		cursor: pointer;
		font-family: inherit;
	}
	.btn-outline:disabled {
		color: var(--muted-2);
		cursor: default;
	}
	.btn-primary {
		flex: 2;
		height: 48px;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		border: none;
		cursor: pointer;
		box-shadow: 0 6px 0 var(--accent-press);
		font-family: inherit;
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
	}
	.btn-primary:active {
		transform: translateY(3px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.btn-primary.wide {
		width: 100%;
		margin-top: 16px;
	}
</style>
