<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Problem } from '$lib/problems';
	import { isCorrectText, isCloseAnswer, hintUnlocked, displayChoices, type Mark } from '$lib/game';
	import { track } from '$lib/analytics';
	import { friendLine, compareLine, previewTitle, markParam } from '$lib/sendProblem';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import ExampleList from '$lib/components/ExampleList.svelte';
	import SendProblem from '$lib/components/SendProblem.svelte';

	/**
	 * 친구가 보낸 문제 한 개(+page.server.ts 주석). 받은 사람의 첫 화면이다.
	 *
	 * 데일리 진행·기록(localStorage)은 건드리지 않는다 — 여기서 푼 것은 오늘의 10문제와 따로다.
	 * 다 풀면 할 일은 둘: 되돌려 보내기, 오늘의 10문제로 넘어가기.
	 */
	let { data }: { data: { problem: Problem; friend: Mark | null; preview: string } } = $props();

	let p = $derived(displayChoices(data.problem));

	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let startedAt = 0;
	let elapsedMs = $state(0);
	let judged = $state(false);
	let mine = $state<Mark | null>(null);
	let answerValue = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let picked = $state<number | null>(null);

	let shownHints = $derived(p.hints ? p.hints.slice(0, hintsUsed) : []);
	let hintWaitSec = $derived(Math.max(1, Math.ceil(((hintsUsed <= 1 ? 10000 : 25000) - elapsedMs) / 1000)));
	let versus = $derived(mine ? compareLine(data.friend, mine) : null);

	let title = $derived(previewTitle(data.friend));

	function settle(mark: Mark, msg: string) {
		if (judged) return;
		judged = true;
		mine = mark;
		feedback = { msg, ok: mark !== 'miss' };
		track('q_result', { id: p.id, r: markParam(mark), friend: data.friend ? markParam(data.friend) : '' });
	}

	const cleanOrHinted = (): Mark => (hintsUsed === 0 && wrongAttempts === 0 ? 'clean' : 'hinted');

	function submitText() {
		if (judged || !answerValue.trim()) return;
		if (isCorrectText(p, answerValue)) {
			const m = cleanOrHinted();
			settle(m, m === 'clean' ? '딸깍! 맞혔어요' : '맞혔어요');
		} else {
			wrongAttempts += 1;
			feedback = isCloseAnswer(p, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요. 다시 들여다볼까요?', ok: false };
		}
	}

	function submitChoice(i: number) {
		if (judged) return;
		picked = i;
		if (i === p.answerIndex) {
			const m = cleanOrHinted();
			settle(m, m === 'clean' ? '딸깍! 맞혔어요' : '맞혔어요');
			return;
		}
		wrongAttempts += 1;
		// 홈과 같은 기준 — 보기 2개(O/X)에 재시도를 주면 소거법으로 반드시 맞는다
		const maxWrong = Math.max(1, Math.min(2, (p.choices?.length ?? 4) - 1));
		if (wrongAttempts >= maxWrong) settle('miss', '정답을 확인했어요');
		else feedback = { msg: '아쉬워요. 한 번 더 골라 볼까요?', ok: false };
	}

	function showHint() {
		if (judged || !p.hints || hintsUsed >= p.hints.length) return;
		if (!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)) return;
		hintsUsed += 1;
	}

	onMount(() => {
		startedAt = Date.now();
		track('q_view', { id: p.id, friend: data.friend ? markParam(data.friend) : '' });
		if (p.type !== 'choice' && window.matchMedia?.('(hover: hover)').matches) tick().then(() => inputEl?.focus());
		const iv = setInterval(() => {
			if (!judged) elapsedMs = Date.now() - startedAt;
		}, 1000);
		return () => clearInterval(iv);
	});
</script>

<svelte:head>
	<title>{title} | 딸깍 퍼즐</title>
	<meta name="description" content={data.preview} />
	<meta property="og:title" content="{title} | 딸깍 퍼즐" />
	<meta property="og:description" content={data.preview} />
	<meta property="og:url" content="https://ddalkkak.app/q/{p.id}" />
</svelte:head>

<p class="from">{friendLine(data.friend)}</p>

<section class="card">
	<span class="cat-chip">{p.chip}</span>

	<div class="q">
		{#each p.blocks as b, i (i)}
			{#if b.kind === 'text'}
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
				<button
					class="choice"
					class:ok={judged && i === p.answerIndex}
					class:bad={picked === i && i !== p.answerIndex}
					disabled={judged}
					onclick={() => submitChoice(i)}
				>
					<span class="badge">{['A', 'B', 'C', 'D', 'E'][i]}</span>
					<span class="ctext">{c}</span>
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

	{#if !judged && p.hints?.length}
		<div class="hint-row">
			<button
				class="hint-btn"
				disabled={hintsUsed >= p.hints.length || !hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)}
				onclick={showHint}
			>
				{hintsUsed >= p.hints.length
					? '힌트 다 봤어요'
					: hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)
						? `힌트 보기 (${hintsUsed + 1}/${p.hints.length})`
						: `${hintWaitSec}초 뒤 힌트`}
			</button>
		</div>
	{/if}

	{#each shownHints as h, i (i)}
		<div class="hint-box">{h}</div>
	{/each}

	{#if feedback}
		<div class="feedback" class:ok={feedback.ok}>
			<span class="fmark">{feedback.ok ? '✓' : '✕'}</span>
			<span>{feedback.msg}</span>
		</div>
	{/if}

	{#if judged}
		{#if p.type !== 'choice' && mine === 'miss'}
			<div class="answer-line">정답은 <b>{p.answers?.[0]}</b></div>
		{/if}
		<div class="explain"><b>해설</b> {@html p.explain}</div>
		{#if versus}<p class="versus">{versus}</p>{/if}
		<SendProblem id={p.id} mark={mine} from="q" />
	{:else if p.type === 'choice'}
		<button class="btn-outline wide" onclick={() => settle('miss', '정답을 확인했어요')}>모르겠어요</button>
	{:else}
		<div class="actions">
			<button class="btn-outline" onclick={() => settle('miss', '정답을 확인했어요')}>모르겠어요</button>
			<button class="btn-primary" onclick={submitText}>확인</button>
		</div>
	{/if}
</section>

<!-- 받은 사람 대부분은 딸깍을 처음 본다. 푼 뒤에만 크게, 풀기 전엔 한 줄로 -->
<section class="next" class:big={judged}>
	<p class="next-copy">딸깍은 이런 문제를 하루 10개 내요. 규칙을 찾는 문제와 상식, 성냥개비, 전개도가 섞여 나와요.</p>
	<a class="btn-primary link" href="/" onclick={() => track('q_to_daily', { id: p.id, judged: judged ? 1 : 0 })}
		>오늘의 10문제 풀기</a
	>
	{#if judged}
		<a class="more" href="/play" onclick={() => track('q_to_play', { id: p.id })}>이런 문제 더 풀기 (무한 연습)</a>
	{/if}
</section>

<style>
	.from {
		margin: 0 2px 12px;
		font-size: 15px;
		font-weight: 800;
		color: var(--text);
		word-break: keep-all;
	}
	.card {
		border: 1px solid var(--border-strong);
		background: var(--panel);
		border-radius: 18px;
		padding: 18px;
	}
	.cat-chip {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--muted);
		padding: 3px 9px;
		border-radius: 7px;
	}
	.q {
		margin-top: 14px;
	}
	.qtext {
		font-size: 18px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	input[type='text'] {
		width: 100%;
		margin-top: 16px;
		min-height: 50px;
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
	}
	.choice:disabled {
		cursor: default;
	}
	.choice.ok {
		background: var(--correct-bg);
		border-color: var(--accent-text);
	}
	.choice.bad {
		background: var(--danger-bg);
		border-color: var(--danger);
	}
	.badge {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--panel-2);
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
	}
	.hint-row {
		margin-top: 14px;
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
	.answer-line {
		margin-top: 10px;
		background: var(--correct-bg);
		border: 1px solid var(--accent);
		border-radius: 12px;
		padding: 11px 14px;
		font-size: 14px;
		font-weight: 700;
	}
	.answer-line b {
		color: var(--accent-text);
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
	.versus {
		margin: 12px 2px 0;
		font-size: 14px;
		font-weight: 800;
		color: var(--text);
		text-align: center;
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
	.btn-outline {
		flex: 1;
		min-height: 48px;
		border-radius: 12px;
		background: transparent;
		color: var(--muted);
		font-size: 14px;
		font-weight: 700;
		border: 1px solid var(--border-strong);
		cursor: pointer;
		font-family: inherit;
	}
	.btn-outline.wide {
		width: 100%;
		margin-top: 16px;
	}
	.btn-primary {
		flex: 2;
		min-height: 48px;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		border: none;
		cursor: pointer;
		box-shadow: 0 6px 0 var(--accent-press);
		font-family: inherit;
	}
	.next {
		margin-top: 18px;
		padding: 14px 16px;
		border-radius: 16px;
		background: var(--panel-2);
	}
	.next-copy {
		margin: 0 0 12px;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		word-break: keep-all;
	}
	.next.big .next-copy {
		font-size: 14px;
		color: var(--text);
	}
	.link {
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
	}
	.more {
		display: block;
		margin-top: 14px;
		text-align: center;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
</style>
