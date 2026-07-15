<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { PROBLEMS, type Problem } from '$lib/problems';
	import {
		buildRound,
		isCorrectText,
		scoreFor,
		emojiFor,
		kstDayNumber,
		dailyIndices
	} from '$lib/game';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	// 영구 상태
	let solved = $state<string[]>([]); // 랜덤 모드용 셔플백
	let stats = $state({ score: 0, dayStreak: 0, lastDay: -1 });

	// 세션 상태
	let mode = $state<'daily' | 'random'>('daily');
	let dayNum = $state(0);
	let queue = $state<Problem[]>([]); // 오늘/이번 세션의 문제들
	let pos = $state(0);
	let results = $state<string[]>([]); // 이모지
	let phase = $state<'play' | 'done'>('play');

	// 문제별 상태
	let hintsUsed = $state(0);
	let done = $state(false);
	let won = $state(false);
	let answerValue = $state('');
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let toastMsg = $state('');
	let countdown = $state('');

	let current = $derived(queue[pos]);
	let shownHints = $derived(current ? current.hints.slice(0, hintsUsed) : []);
	let dateLabel = $derived(formatDate(dayNum));

	function formatDate(day: number): string {
		const ms = day * 86400000 - 9 * 3600 * 1000 + 43200000; // 그 KST 날짜 정오 근처
		const d = new Date(ms);
		return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}`;
	}

	function load() {
		try {
			solved = JSON.parse(localStorage.getItem('ddal.solved') || '[]');
			stats = JSON.parse(
				localStorage.getItem('ddal.stats') || '{"score":0,"dayStreak":0,"lastDay":-1}'
			);
		} catch {
			/* 무시 */
		}
	}
	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem('ddal.solved', JSON.stringify(solved));
			localStorage.setItem('ddal.stats', JSON.stringify(stats));
		} catch {
			/* 무시 */
		}
	}
	function saveDaily() {
		if (!browser) return;
		try {
			localStorage.setItem(
				'ddal.daily.' + dayNum,
				JSON.stringify({ pos, results, phase })
			);
		} catch {
			/* 무시 */
		}
	}

	function startDaily() {
		mode = 'daily';
		const idxs = dailyIndices(PROBLEMS.length, dayNum);
		queue = idxs.map((i) => PROBLEMS[i]);
		// 오늘 진행분 복원
		let saved: { pos: number; results: string[]; phase: 'play' | 'done' } | null = null;
		try {
			saved = JSON.parse(localStorage.getItem('ddal.daily.' + dayNum) || 'null');
		} catch {
			/* 무시 */
		}
		if (saved) {
			pos = Math.min(saved.pos, queue.length);
			results = saved.results || [];
			phase = saved.phase || 'play';
		} else {
			pos = 0;
			results = [];
			phase = 'play';
		}
		resetProblem();
		if (phase === 'done' || pos >= queue.length) phase = 'done';
	}

	function startRandom() {
		mode = 'random';
		const r = buildRound(PROBLEMS, solved, 3);
		if (r.poolReset) {
			solved = [];
			persist();
		}
		queue = r.round;
		pos = 0;
		results = [];
		phase = 'play';
		resetProblem();
	}

	function resetProblem() {
		hintsUsed = 0;
		done = false;
		won = false;
		answerValue = '';
		feedback = null;
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function finish(win: boolean) {
		if (done) return;
		done = true;
		won = win;
		results = [...results, emojiFor(win, hintsUsed)];
		const gained = scoreFor(win, hintsUsed);
		stats.score += gained;
		if (mode === 'random' && current) solved = [...solved, current.id];
		feedback = win
			? { msg: `딸깍! ⚡ +${gained}`, ok: true }
			: { msg: '정답 공개', ok: false };
		persist();
		saveDaily();
	}

	function submitText() {
		if (done || !answerValue.trim()) return;
		if (isCorrectText(current, answerValue)) finish(true);
		else feedback = { msg: '땡! 다시 생각해 보세요', ok: false };
	}
	function submitChoice(i: number) {
		if (done) return;
		if (i === current.answerIndex) finish(true);
		else feedback = { msg: '땡! 다시 생각해 보세요', ok: false };
	}
	function showHint() {
		if (done || hintsUsed >= current.hints.length) return;
		hintsUsed += 1;
	}

	function next() {
		pos += 1;
		if (pos < queue.length) {
			resetProblem();
			saveDaily();
		} else {
			phase = 'done';
			if (mode === 'daily' && stats.lastDay !== dayNum) {
				stats.dayStreak = stats.lastDay === dayNum - 1 ? stats.dayStreak + 1 : 1;
				stats.lastDay = dayNum;
				persist();
			}
			saveDaily();
		}
	}

	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2400);
	}

	function share() {
		const label = mode === 'daily' ? `오늘의 퍼즐 (${dateLabel})` : '랜덤 3문제';
		const solvedN = results.filter((r) => r !== '🔓').length;
		let text = `딸깍! ${label} ${solvedN}/${results.length} ${results.join('')}`;
		if (mode === 'daily' && stats.dayStreak > 1) text += `\n🔥 ${stats.dayStreak}일 연속`;
		text += `\n${location.origin}`;
		if (navigator.share) navigator.share({ text }).catch(() => {});
		else if (navigator.clipboard?.writeText)
			navigator.clipboard.writeText(text).then(
				() => toast('결과 복사됨 — 친구에게 공유하세요!'),
				() => toast('복사 실패')
			);
		else toast('복사를 지원하지 않는 브라우저');
	}

	function tickCountdown() {
		const nextMidnight = (dayNum + 1) * 86400000 - 9 * 3600 * 1000;
		let ms = nextMidnight - Date.now();
		if (ms < 0) ms = 0;
		const h = Math.floor(ms / 3600000);
		const m = Math.floor((ms % 3600000) / 60000);
		const s = Math.floor((ms % 60000) / 1000);
		countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	onMount(() => {
		load();
		dayNum = kstDayNumber(Date.now());
		startDaily();
		tickCountdown();
		const iv = setInterval(tickCountdown, 1000);
		return () => clearInterval(iv);
	});
</script>

<svelte:head>
	<title>딸깍 — 하루 3문제 두뇌 퍼즐</title>
	<meta
		name="description"
		content="매일 3문제, 규칙을 발견하는 순간의 그 소리. 모두가 같은 문제를 풀고 결과를 공유하는 데일리 두뇌 퍼즐."
	/>
</svelte:head>

{#if mode === 'daily'}
	<div class="mode-banner">
		<div class="mb-left">
			<span class="mb-title">📅 오늘의 퍼즐</span>
			<span class="mb-date">{dateLabel}</span>
		</div>
		<div class="dots">
			{#each queue as _, i (i)}
				<span
					class="dot"
					class:filled={i < results.length}
					class:cur={i === pos && phase === 'play'}
				></span>
			{/each}
		</div>
	</div>
{:else}
	<div class="mode-banner">
		<div class="mb-left"><span class="mb-title">🎲 랜덤 연습</span></div>
		<div class="dots">
			{#each queue as _, i (i)}
				<span class="dot" class:filled={i < results.length} class:cur={i === pos}></span>
			{/each}
		</div>
	</div>
{/if}

{#if phase === 'play' && current}
	<div class="card">
		<div class="chip">{current.chip}</div>

		<div class="q">
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
		</div>

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
						placeholder="정답을 입력하세요"
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
			<div class="hint"><b>힌트 {i + 1}</b>{h}</div>
		{/each}

		{#if !done}
			<div class="controls">
				<button class="btn ghost" disabled={hintsUsed >= current.hints.length} onclick={showHint}>
					{hintsUsed >= current.hints.length ? '힌트 소진' : `💡 힌트 (${hintsUsed + 1}/3)`}
				</button>
				<button class="btn ghost" onclick={() => finish(false)}>정답 보기</button>
			</div>
		{/if}

		{#if feedback}
			<div class="feedback" class:ok={feedback.ok} class:no={!feedback.ok && !done}>
				{feedback.msg}
			</div>
		{/if}

		{#if done}
			<div class="explain">{@html current.explain}</div>
			<button class="btn wide glow" onclick={next}>
				{pos + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
			</button>
		{/if}
	</div>
{:else if phase === 'done'}
	<div class="card result">
		{#if mode === 'daily'}
			<h2>오늘의 퍼즐 완료!</h2>
			<div class="emoji">{results.join(' ')}</div>
			<div class="rscore">{results.filter((r) => r !== '🔓').length} / {results.length}</div>
			{#if stats.dayStreak > 0}<div class="streak">🔥 {stats.dayStreak}일 연속</div>{/if}
			<button class="btn wide glow" onclick={share}>결과 공유하기</button>
			<div class="countdown">다음 퍼즐까지 <b>{countdown}</b></div>
			<button class="btn ghost wide" onclick={startRandom}>🎲 더 풀기 (랜덤)</button>
		{:else}
			<h2>랜덤 3문제 완료!</h2>
			<div class="emoji">{results.join(' ')}</div>
			<div class="rscore">{results.filter((r) => r !== '🔓').length} / {results.length}</div>
			<button class="btn wide glow" onclick={share}>결과 공유하기</button>
			<button class="btn ghost wide" onclick={startRandom}>🎲 또 풀기</button>
			<button class="btn ghost wide" onclick={startDaily}>📅 오늘의 퍼즐로</button>
		{/if}
		<AdSlot label="결과 화면" />
	</div>
{/if}

{#if toastMsg}
	<div class="toast">{toastMsg}</div>
{/if}

<style>
	.mode-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 14px;
		padding: 0 4px;
	}
	.mb-left {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.mb-title {
		font-size: 17px;
		font-weight: 900;
	}
	.mb-date {
		font-size: 13px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.dots {
		display: flex;
		gap: 7px;
	}
	.dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--border);
		transition: all 0.2s;
	}
	.dot.filled {
		background: var(--accent);
		box-shadow: 0 0 10px var(--accent-glow);
	}
	.dot.cur {
		background: var(--accent-2);
		box-shadow: 0 0 10px #38bdf877;
		transform: scale(1.15);
	}

	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 30px 26px;
		box-shadow:
			0 12px 40px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 #ffffff08;
	}
	.chip {
		display: inline-block;
		background: var(--accent-glow);
		color: var(--accent);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.5px;
		border-radius: 999px;
		padding: 5px 15px;
		margin-bottom: 20px;
		border: 1px solid #35ffa344;
	}
	.q {
		min-height: 120px;
	}
	.qtext {
		font-size: 20px;
		line-height: 1.7;
		word-break: keep-all;
		color: var(--text);
	}
	.qtext :global(b) {
		color: var(--accent);
	}
	.qblock {
		font-family: 'Consolas', 'Courier New', monospace;
		font-size: 27px;
		font-weight: 700;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 22px 20px;
		margin: 16px 0;
		line-height: 2;
		letter-spacing: 1px;
		overflow-x: auto;
		white-space: pre-wrap;
		color: var(--text);
	}
	.answer-area {
		margin-top: 22px;
	}
	.input-row {
		display: flex;
		gap: 10px;
	}
	input {
		flex: 1;
		min-width: 0;
		font-size: 19px;
		padding: 16px 18px;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--panel-2);
		color: var(--text);
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s;
	}
	input::placeholder {
		color: #4d5b73;
	}
	input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}
	.btn {
		background: var(--accent);
		color: #062015;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 800;
		padding: 16px 22px;
		cursor: pointer;
		font-family: inherit;
		white-space: nowrap;
		transition:
			transform 0.1s,
			filter 0.15s;
	}
	.btn:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.btn:active:not(:disabled) {
		transform: translateY(1px);
	}
	.btn.glow {
		box-shadow: 0 0 22px var(--accent-glow);
	}
	.btn.ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
	}
	.btn.ghost:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--muted);
		filter: none;
	}
	.btn.wide {
		width: 100%;
		margin-top: 14px;
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.choice {
		background: var(--panel-2);
		border: 2px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		font-size: 17px;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: var(--text);
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.choice:hover:not(:disabled) {
		border-color: var(--accent);
		background: #16233a;
	}
	.choice:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.controls {
		display: flex;
		gap: 10px;
		margin-top: 16px;
	}
	.controls .btn {
		flex: 1;
		font-size: 14px;
		padding: 13px 10px;
	}
	.hint {
		background: #1a2338;
		border-left: 3px solid var(--warn);
		border-radius: 8px;
		padding: 13px 16px;
		font-size: 15px;
		margin-top: 12px;
		line-height: 1.6;
		color: #d9e2f0;
		animation: slidein 0.25s ease;
	}
	.hint b {
		color: var(--warn);
		margin-right: 8px;
	}
	@keyframes slidein {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
		}
	}
	.feedback {
		margin-top: 16px;
		font-size: 17px;
		font-weight: 800;
		min-height: 24px;
	}
	.feedback.ok {
		color: var(--accent);
		text-shadow: 0 0 16px var(--accent-glow);
	}
	.feedback.no {
		color: var(--danger);
		animation: shake 0.3s ease;
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-7px);
		}
		75% {
			transform: translateX(7px);
		}
	}
	.explain {
		background: #10241c;
		border: 1px solid #1f5c43;
		border-radius: 12px;
		padding: 18px;
		margin-top: 16px;
		font-size: 15px;
		line-height: 1.7;
		word-break: keep-all;
		color: #cdeadd;
	}
	.explain :global(b) {
		color: var(--accent);
	}
	.result {
		text-align: center;
		padding: 40px 24px;
	}
	.result h2 {
		font-size: 26px;
		margin-bottom: 14px;
	}
	.emoji {
		font-size: 34px;
		letter-spacing: 6px;
		margin: 12px 0;
	}
	.rscore {
		font-size: 46px;
		font-weight: 900;
		color: var(--accent);
		text-shadow: 0 0 26px var(--accent-glow);
		margin: 8px 0;
	}
	.streak {
		font-size: 16px;
		color: var(--warn);
		font-weight: 800;
		margin-bottom: 8px;
	}
	.countdown {
		font-size: 14px;
		color: var(--muted);
		margin-top: 14px;
	}
	.countdown b {
		color: var(--accent-2);
		font-variant-numeric: tabular-nums;
		font-size: 16px;
	}
	.toast {
		position: fixed;
		bottom: 32px;
		left: 50%;
		transform: translateX(-50%);
		background: #1b2740;
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 12px 24px;
		font-size: 14px;
		z-index: 30;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
	}
</style>
