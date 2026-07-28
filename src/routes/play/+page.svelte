<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import type { Problem } from '$lib/problems';
	import { isCorrectText, isCloseAnswer, hintUnlocked, displayChoices, recordSolve } from '$lib/game';
	import { parseEq, cloneBoard, isSolved, bit, type Board } from '$lib/matchstick';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import ExampleList from '$lib/components/ExampleList.svelte';

	let { data }: { data: { counts: { discover: number; trivia: number; match: number } } } = $props();

	type Filter = 'all' | 'puzzle' | 'trivia' | 'match';
	const FILTERS: { key: Filter; label: string }[] = [
		{ key: 'all', label: '전체' },
		{ key: 'puzzle', label: '발견형' },
		{ key: 'trivia', label: '상식' },
		{ key: 'match', label: '성냥개비' }
	];

	let filter = $state<Filter>('all');
	let combo = $state(0);
	let loading = $state(true);

	/** 연습에 올라가는 한 문제. 성냥개비는 Problem이 아니라 등식 한 쌍이다. */
	type Item = { problem?: Problem; eq?: { displayed: string; solution: string } };
	let current = $state<Item | null>(null);
	let shown = $derived(current?.problem ? displayChoices(current.problem) : undefined);

	// 문제은행(로드 후 보관)
	let bank = $state<{
		puzzle: Problem[];
		trivia: Problem[];
		match: { displayed: string; solution: string }[];
	} | null>(null);

	// 이미 낸 문제를 다시 안 내기 위한 셔플백
	let bag = $state<number[]>([]);

	// 한 문제 상태
	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let startedAt = $state(0);
	let elapsedMs = $state(0);
	let judged = $state(false);
	let answerValue = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let picked = $state<number | null>(null);

	// 성냥개비
	let mOrig = $state<Board | null>(null);
	let mCur = $state<Board | null>(null);
	let mPicked = $state<PickLoc | null>(null);
	let mMisses = $state(0);
	let mAnimFrom = $state<Board | null>(null); // 정답 공개 시 원래 배치 → 성냥이 날아가는 연출
	let mRevertTimer: ReturnType<typeof setTimeout>;

	let shownHints = $derived(shown?.hints ? shown.hints.slice(0, hintsUsed) : []);
	/** 다음 힌트까지 남은 초 — 잠긴 이유를 숫자로 보여준다 */
	let hintWaitSec = $derived.by(() => {
		const need = hintsUsed <= 1 ? 25000 : 60000;
		return Math.max(1, Math.ceil((need - elapsedMs) / 1000));
	});
	let poolSize = $derived(
		filter === 'puzzle'
			? data.counts.discover
			: filter === 'trivia'
				? data.counts.trivia
				: filter === 'match'
					? data.counts.match
					: data.counts.discover + data.counts.trivia + data.counts.match
	);

	async function loadBank() {
		const [p, t, m] = await Promise.all([
			import('$lib/problems'),
			import('$lib/trivia'),
			import('$lib/data/matchstick-problems.json')
		]);
		bank = {
			puzzle: p.PROBLEMS,
			trivia: t.TRIVIA,
			match: (m.default ?? m) as { displayed: string; solution: string }[]
		};
	}

	/** 현재 필터의 전체 후보 수 */
	function poolLen(): number {
		if (!bank) return 0;
		if (filter === 'puzzle') return bank.puzzle.length;
		if (filter === 'trivia') return bank.trivia.length;
		if (filter === 'match') return bank.match.length;
		return bank.puzzle.length + bank.trivia.length + bank.match.length;
	}

	/** 통합 인덱스 → 실제 문제 */
	function itemAt(i: number): Item {
		if (!bank) return {};
		if (filter === 'puzzle') return { problem: bank.puzzle[i] };
		if (filter === 'trivia') return { problem: bank.trivia[i] };
		if (filter === 'match') return { eq: bank.match[i] };
		const a = bank.puzzle.length;
		const b = a + bank.trivia.length;
		if (i < a) return { problem: bank.puzzle[i] };
		if (i < b) return { problem: bank.trivia[i - a] };
		return { eq: bank.match[i - b] };
	}

	function refillBag() {
		const n = poolLen();
		const idx = Array.from({ length: n }, (_, i) => i);
		for (let i = n - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[idx[i], idx[j]] = [idx[j], idx[i]];
		}
		bag = idx;
	}

	function nextProblem() {
		if (!bag.length) refillBag();
		const i = bag[0];
		bag = bag.slice(1);
		current = itemAt(i);
		resetProblem();
	}

	function resetProblem() {
		hintsUsed = 0;
		wrongAttempts = 0;
		startedAt = Date.now();
		elapsedMs = 0;
		judged = false;
		answerValue = '';
		feedback = null;
		picked = null;
		clearTimeout(mRevertTimer);
		mMisses = 0;
		mPicked = null;
		mAnimFrom = null;
		if (current?.eq) {
			mOrig = parseEq(current.eq.displayed);
			mCur = cloneBoard(mOrig);
		} else {
			mOrig = null;
			mCur = null;
		}
		if (browser && current?.problem && current.problem.type !== 'choice' && window.matchMedia?.('(hover: hover)').matches) {
			tick().then(() => inputEl?.focus());
		}
	}

	function pickFilter(f: Filter) {
		if (filter === f) return;
		filter = f;
		combo = 0;
		refillBag();
		nextProblem();
	}

	/* ── 판정 ── */

	function settle(ok: boolean, msg: string) {
		if (judged) return;
		judged = true;
		feedback = { msg, ok };
		combo = ok ? combo + 1 : 0;
		recordSolve(ok, hintsUsed);
	}

	function submitText() {
		if (judged || !shown || !answerValue.trim()) return;
		if (isCorrectText(shown, answerValue)) settle(true, '정답이에요');
		else {
			wrongAttempts += 1;
			feedback = isCloseAnswer(shown, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}

	function submitChoice(i: number) {
		if (judged || !shown) return;
		picked = i;
		if (i === shown.answerIndex) settle(true, '정답이에요');
		else {
			wrongAttempts += 1;
			if (wrongAttempts >= 2) settle(false, '정답을 확인했어요');
			else feedback = { msg: '아쉬워요 — 한 번 더 골라볼까요?', ok: false };
		}
	}

	function showHint() {
		if (judged || !shown?.hints || hintsUsed >= shown.hints.length) return;
		if (!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)) return;
		hintsUsed += 1;
	}

	function giveUp() {
		if (judged) return;
		if (current?.eq && mOrig) {
			clearTimeout(mRevertTimer);
			// 원래 배치에서 성냥이 날아가 정답 자리에 안착하는 연출로 보여준다
			mAnimFrom = cloneBoard(mOrig);
			mCur = parseEq(current.eq.solution);
			mPicked = null;
		}
		settle(false, '정답을 확인했어요');
	}

	function skip() {
		nextProblem();
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/* ── 성냥개비 ── */

	function handleStick(loc: PickLoc, lit: boolean) {
		if (judged || !mCur || !mOrig) return;
		if (!mPicked) {
			if (!lit) return;
			mPicked = loc;
			applyStick(loc, false);
			return;
		}
		if (!lit && sameLoc(mPicked, loc)) {
			applyStick(loc, true);
			mPicked = null;
			return;
		}
		if (lit) return;
		applyStick(loc, true);
		mPicked = null;
		if (isSolved(mOrig, mCur)) settle(true, '정답이에요');
		else {
			mMisses += 1;
			feedback = { msg: '식이 맞지 않아요 — 성냥을 원래 자리로 되돌렸어요', ok: false };
			clearTimeout(mRevertTimer);
			mRevertTimer = setTimeout(() => {
				if (mOrig) mCur = cloneBoard(mOrig);
				mPicked = null;
			}, 420);
		}
	}
	const sameLoc = (a: PickLoc, b: PickLoc) => a.kind === b.kind && a.gi === b.gi && a.seg === b.seg;
	function applyStick(loc: PickLoc, add: boolean) {
		if (!mCur) return;
		if (loc.kind === 'op') mCur.opPlus = add;
		else if (add) mCur.glyphs[loc.gi!] |= bit(loc.seg!);
		else mCur.glyphs[loc.gi!] &= ~bit(loc.seg!);
	}
	function resetBoard() {
		if (!mOrig) return;
		mCur = cloneBoard(mOrig);
		mPicked = null;
	}

	onMount(() => {
		const f = page.url.searchParams.get('filter');
		if (f === 'all' || f === 'puzzle' || f === 'trivia' || f === 'match') filter = f;
		loadBank().then(() => {
			loading = false;
			refillBag();
			nextProblem();
		});
		const iv = setInterval(() => {
			if (!judged) elapsedMs = Date.now() - startedAt;
		}, 1000);
		return () => clearInterval(iv);
	});
</script>

<svelte:head>
	<title>무한 연습 — 딸깍</title>
	<meta
		name="description"
		content="발견형 퍼즐·상식 퀴즈·성냥개비를 원하는 만큼. 유형을 골라 계속 풀어보세요."
	/>
</svelte:head>

<div class="topbar">
	<h1>무한 연습</h1>
	<span class="combo" class:on={combo > 0}>{combo} 연속 정답</span>
</div>

<div class="filters">
	{#each FILTERS as f (f.key)}
		<button class="filter" class:active={filter === f.key} onclick={() => pickFilter(f.key)}>
			{f.label}
		</button>
	{/each}
</div>

{#if loading}
	<div class="card skeleton">문제를 불러오는 중…</div>
{:else if current}
	<section class="card">
		{#if shown?.chip}
			<span class="cat-chip">{shown.chip}{shown.grade ? ` · ${shown.grade}` : ''}</span>
		{:else if current.eq}
			<span class="cat-chip">성냥개비</span>
		{/if}

		<div class="q">
			{#if current.eq && mCur}
				<MatchstickBoard
					board={mCur}
					picked={mPicked}
					onstick={handleStick}
					animateFrom={mAnimFrom}
					label={current.eq.displayed.replace('-', '−')}
				/>
				<p class="guide">{mPicked ? '빈 자리를 짚어 내려놓으세요.' : '옮길 획을 짚어보세요.'}</p>
			{:else if shown}
				{#each shown.blocks as b, i (i)}
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
			{/if}
		</div>

		{#if shown && !current.eq}
			{#if shown.type === 'choice'}
				<div class="choices">
					{#each shown.choices ?? [] as c, i (i)}
						<button
							class="choice"
							class:ok={judged && i === shown.answerIndex}
							class:bad={picked === i && i !== shown.answerIndex}
							disabled={judged}
							onclick={() => submitChoice(i)}
						>
							<span class="badge">{['A', 'B', 'C', 'D', 'E'][i]}</span>
							<span class="ctext">{c}</span>
							{#if judged && i === shown.answerIndex}<span class="mark">✓</span>
							{:else if picked === i && i !== shown.answerIndex}<span class="mark bad">✕</span>{/if}
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
		{/if}

		{#if !judged && shown?.hints}
			<div class="hint-row">
				<div class="dots" aria-hidden="true">
					{#each [0, 1, 2] as i (i)}
						<span class="dot" class:on={i < hintsUsed}></span>
					{/each}
				</div>
				<button
					class="hint-btn"
					disabled={hintsUsed >= 3 || !hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)}
					onclick={showHint}
				>
					{hintsUsed >= 3
						? '힌트 다 봤어요'
						: hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)
							? `힌트 보기 (${hintsUsed + 1}/3)`
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
			{#if shown && !current.eq && shown.type !== 'choice' && feedback && !feedback.ok}
				<div class="answer-line">정답은 <b>{shown.answers?.[0]}</b></div>
			{/if}
			<div class="explain">
				<b>해설</b>
				{#if current.eq}
					성냥 하나만 옮겨 <b>{current.eq.solution.replace('-', '−')}</b>을 만들면 참이 됩니다.
				{:else if shown}
					{@html shown.explain}
				{/if}
			</div>
			<button class="btn-primary wide" onclick={skip}>다음 문제</button>
		{:else}
			<div class="actions">
				<button class="btn-outline" onclick={skip}>건너뛰기</button>
				{#if current.eq}
					<button class="btn-outline" onclick={giveUp}>모르겠어요</button>
					<button class="btn-outline" disabled={!mPicked} onclick={resetBoard}>처음부터</button>
				{:else if shown?.type === 'choice'}
					<button class="btn-outline" onclick={giveUp}>모르겠어요</button>
				{:else}
					<button class="btn-primary" onclick={submitText}>확인</button>
				{/if}
			</div>
		{/if}
	</section>

	<p class="poolnote">{FILTERS.find((f) => f.key === filter)?.label} {poolSize.toLocaleString()}문제 중에서 무작위로 나와요</p>
{/if}

<style>
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.topbar h1 {
		font-size: 18px;
		font-weight: 800;
		margin: 0;
	}
	.combo {
		font-size: 12px;
		font-weight: 800;
		background: var(--panel-2);
		color: var(--muted-2);
		padding: 5px 10px;
		border-radius: 8px;
		font-variant-numeric: tabular-nums;
	}
	.combo.on {
		background: var(--gold-bg);
		color: var(--gold-text);
	}
	.filters {
		display: flex;
		gap: 6px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}
	.filter {
		padding: 7px 14px;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 600;
		border: 1px solid var(--border-strong);
		background: transparent;
		color: var(--text);
		cursor: pointer;
		font-family: inherit;
	}
	.filter.active {
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		border-color: var(--accent);
	}

	.card {
		border: 1px solid var(--border-strong);
		background: var(--panel);
		border-radius: 18px;
		padding: 18px;
	}
	.card.skeleton {
		text-align: center;
		color: var(--muted-2);
		font-size: 14px;
		padding: 40px 18px;
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
		color: var(--accent);
	}
	.mark.bad {
		color: var(--danger);
	}
	.choice.ok {
		background: var(--correct-bg);
		border-color: var(--accent);
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
		border-color: var(--accent);
		background: var(--correct-bg);
		color: var(--accent);
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
		color: var(--accent);
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
	.poolnote {
		margin-top: 14px;
		text-align: center;
		font-size: 12px;
		color: var(--muted-2);
	}
</style>
