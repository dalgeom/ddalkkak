<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { PROBLEMS, type Problem } from '$lib/problems';
	import { buildRound, isCorrectText, scoreFor, emojiFor } from '$lib/game';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let solved = $state<string[]>([]);
	let totals = $state({ score: 0, streak: 0, best: 0 });

	let round = $state<Problem[]>([]);
	let idx = $state(0);
	let phase = $state<'quiz' | 'result'>('quiz');

	let hintsUsed = $state(0);
	let done = $state(false);
	let won = $state(false);
	let answerValue = $state('');
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let roundEmoji = $state<string[]>([]);
	let roundScore = $state(0);
	let toastMsg = $state('');

	let current = $derived(round[idx]);
	let shownHints = $derived(current ? current.hints.slice(0, hintsUsed) : []);

	function loadState() {
		try {
			solved = JSON.parse(localStorage.getItem('ddal.solved') || '[]');
			totals = JSON.parse(
				localStorage.getItem('ddal.totals') || '{"score":0,"streak":0,"best":0}'
			);
		} catch {
			/* 무시 */
		}
	}
	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem('ddal.solved', JSON.stringify(solved));
			localStorage.setItem('ddal.totals', JSON.stringify(totals));
		} catch {
			/* 무시 */
		}
	}

	function startRound() {
		const r = buildRound(PROBLEMS, solved);
		if (r.poolReset) {
			solved = [];
			persist();
		}
		round = r.round;
		idx = 0;
		roundScore = 0;
		roundEmoji = [];
		phase = 'quiz';
		resetProblem();
	}

	function resetProblem() {
		hintsUsed = 0;
		done = false;
		won = false;
		answerValue = '';
		feedback = null;
		if (browser) window.scrollTo(0, 0);
	}

	function finish(win: boolean) {
		if (done) return;
		done = true;
		won = win;
		const gained = scoreFor(win, hintsUsed);
		roundScore += gained;
		roundEmoji = [...roundEmoji, emojiFor(win, hintsUsed)];
		if (win) {
			totals.streak += 1;
			feedback = { msg: `딸깍! ⚡ +${gained}점`, ok: true };
		} else {
			totals.streak = 0;
			feedback = { msg: '정답 공개 (+0점)', ok: false };
		}
		totals.score += gained;
		solved = [...solved, current.id];
		persist();
	}

	function submitText() {
		if (done || !answerValue.trim()) return;
		if (isCorrectText(current, answerValue)) finish(true);
		else feedback = { msg: '땡! 다시 생각해 보세요.', ok: false };
	}

	function submitChoice(i: number) {
		if (done) return;
		if (i === current.answerIndex) finish(true);
		else feedback = { msg: '땡! 다시 생각해 보세요.', ok: false };
	}

	function showHint() {
		if (done || hintsUsed >= current.hints.length) return;
		hintsUsed += 1;
	}

	function next() {
		if (idx + 1 < round.length) {
			idx += 1;
			resetProblem();
		} else {
			if (roundScore > totals.best) {
				totals.best = roundScore;
				persist();
			}
			phase = 'result';
		}
	}

	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}

	function share() {
		const text = `딸깍! 두뇌퍼즐 ${roundEmoji.join('')} ${roundScore}점\n${location.href.split('?')[0]}`;
		if (navigator.share) {
			navigator.share({ text }).catch(() => {});
		} else if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).then(
				() => toast('결과가 복사됐어요!'),
				() => legacyCopy(text)
			);
		} else {
			legacyCopy(text);
		}
	}
	function legacyCopy(text: string) {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		try {
			document.execCommand('copy');
			toast('결과가 복사됐어요!');
		} catch {
			toast('복사에 실패했어요');
		}
		document.body.removeChild(ta);
	}

	onMount(() => {
		loadState();
		startRound();
	});
</script>

<svelte:head>
	<title>딸깍 — 하루 3문제 두뇌 퍼즐</title>
	<meta
		name="description"
		content="규칙을 발견하는 순간 머릿속에서 '딸깍' 소리가 나는 두뇌 퍼즐. 하루 3문제, 힌트 사다리와 함께 설치 없이 즐기세요."
	/>
</svelte:head>

<div class="topbar">
	<div class="stats">
		<div class="stat-box"><span>점수</span><b>{totals.score}</b></div>
		<div class="stat-box"><span>연속</span><b>{totals.streak}</b></div>
	</div>
	{#if phase === 'quiz' && round.length}
		<div class="progress">문제 {idx + 1} / {round.length}</div>
	{/if}
</div>

{#if phase === 'quiz' && current}
	<div class="card">
		<div class="chip">{current.chip}</div>

		{#each current.blocks as b, i (i)}
			{#if b.kind === 'text'}
				<div class="qtext">{@html b.html}</div>
			{:else if b.kind === 'pre'}
				<pre class="qblock">{b.text}</pre>
			{:else if b.kind === 'lcd'}
				<SevenSeg lines={b.lines} frags={b.frags} />
			{:else if b.kind === 'colors'}
				<ColorBlocks rows={b.rows} />
			{/if}
		{/each}

		<div class="answer-area">
			{#if current.type === 'choice'}
				<div class="choices">
					{#each current.choices! as c, i (i)}
						<button class="choice" disabled={done} onclick={() => submitChoice(i)}>{c}</button>
					{/each}
				</div>
			{:else}
				<div class="input-row">
					<input
						placeholder="정답 입력"
						autocomplete="off"
						bind:value={answerValue}
						disabled={done}
						onkeydown={(e) => e.key === 'Enter' && submitText()}
					/>
					<button class="btn" disabled={done} onclick={submitText}>제출</button>
				</div>
			{/if}
		</div>

		{#each shownHints as h, i (i)}
			<div class="hint">힌트 {i + 1}. {h}</div>
		{/each}

		{#if !done}
			<div class="controls">
				<button class="btn ghost" disabled={hintsUsed >= current.hints.length} onclick={showHint}>
					{hintsUsed >= current.hints.length ? '힌트 소진' : `💡 힌트 ${hintsUsed + 1} 보기`}
				</button>
				<button class="btn ghost" onclick={() => finish(false)}>정답 보기 (0점)</button>
			</div>
		{/if}

		{#if feedback}
			<div class="feedback" class:ok={feedback.ok} class:no={!feedback.ok && !done}>
				{feedback.msg}
			</div>
		{/if}

		{#if done}
			<div class="explain">{@html current.explain}</div>
			<button class="btn wide" onclick={next}>
				{idx + 1 < round.length ? '다음 문제 →' : '결과 보기'}
			</button>
		{/if}
	</div>
{:else if phase === 'result'}
	<div class="card result">
		<h2>라운드 종료!</h2>
		<div class="emoji">{roundEmoji.join(' ')}</div>
		<div class="rscore">{roundScore}점</div>
		<button class="btn" onclick={share}>결과 공유하기</button>
		<button class="btn ghost wide" onclick={startRound}>다시 하기 — 새 문제 3개</button>
		<AdSlot label="라운드 결과" />
	</div>
{/if}

{#if toastMsg}
	<div class="toast">{toastMsg}</div>
{/if}

<style>
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.stats {
		display: flex;
		gap: 6px;
	}
	.stat-box {
		background: #26221c;
		color: #f7f5f0;
		border-radius: 8px;
		padding: 4px 10px;
		text-align: center;
		min-width: 56px;
	}
	.stat-box span {
		display: block;
		font-size: 10px;
		color: #b8b0a4;
	}
	.stat-box b {
		font-size: 15px;
	}
	.progress {
		font-size: 13px;
		color: #8d8478;
		font-weight: 700;
	}
	.card {
		background: #fff;
		border: 1px solid #e5dfd4;
		border-radius: 16px;
		padding: 20px 18px;
		box-shadow: 0 3px 12px rgba(38, 34, 28, 0.06);
	}
	.chip {
		display: inline-block;
		background: #f0ebe0;
		color: #7a6f5d;
		font-size: 12px;
		font-weight: 700;
		border-radius: 20px;
		padding: 3px 12px;
		margin-bottom: 12px;
	}
	.qtext {
		font-size: 16px;
		line-height: 1.65;
		margin-bottom: 8px;
		word-break: keep-all;
	}
	.qblock {
		font-family: Consolas, 'Courier New', monospace;
		font-size: 20px;
		font-weight: 700;
		background: #faf8f3;
		border: 1px solid #eee7da;
		border-radius: 10px;
		padding: 14px 16px;
		margin: 10px 0;
		line-height: 1.9;
		letter-spacing: 1px;
		overflow-x: auto;
		white-space: pre-wrap;
	}
	.answer-area {
		margin-top: 14px;
	}
	.input-row {
		display: flex;
		gap: 8px;
	}
	input {
		flex: 1;
		min-width: 0;
		font-size: 17px;
		padding: 12px 14px;
		border: 2px solid #d9d0c0;
		border-radius: 10px;
		background: #fff;
		font-family: inherit;
		outline: none;
	}
	input:focus {
		border-color: #e8590c;
	}
	.btn {
		background: #e8590c;
		color: #fff;
		border: none;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 800;
		padding: 12px 18px;
		cursor: pointer;
		font-family: inherit;
		white-space: nowrap;
	}
	.btn:active {
		transform: translateY(1px);
	}
	.btn.ghost {
		background: #f0ebe0;
		color: #6b6152;
	}
	.btn.wide {
		width: 100%;
		margin-top: 10px;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.choice {
		background: #faf8f3;
		border: 2px solid #e5dcc9;
		border-radius: 10px;
		padding: 12px 14px;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: #26221c;
	}
	.choice:active {
		border-color: #e8590c;
	}
	.controls {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}
	.controls .btn {
		flex: 1;
		font-size: 13px;
		padding: 10px 8px;
	}
	.hint {
		background: #fff8e6;
		border-left: 4px solid #f0b429;
		border-radius: 6px;
		padding: 10px 12px;
		font-size: 14px;
		margin-top: 8px;
		line-height: 1.5;
	}
	.feedback {
		margin-top: 10px;
		font-size: 15px;
		font-weight: 800;
		min-height: 22px;
	}
	.feedback.ok {
		color: #2b8a3e;
	}
	.feedback.no {
		color: #d33;
	}
	.explain {
		background: #ebf7ee;
		border: 1px solid #c6e8cf;
		border-radius: 10px;
		padding: 14px;
		margin-top: 12px;
		font-size: 14px;
		line-height: 1.65;
		word-break: keep-all;
	}
	.explain :global(b) {
		color: #2b8a3e;
	}
	.result {
		text-align: center;
		padding: 26px 18px;
	}
	.result h2 {
		font-size: 24px;
		margin-bottom: 6px;
	}
	.emoji {
		font-size: 30px;
		letter-spacing: 4px;
		margin: 10px 0;
	}
	.rscore {
		font-size: 40px;
		font-weight: 900;
		color: #e8590c;
		margin: 6px 0 14px;
	}
	.toast {
		position: fixed;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		background: #26221c;
		color: #f7f5f0;
		border-radius: 20px;
		padding: 10px 20px;
		font-size: 14px;
		z-index: 30;
	}
</style>
