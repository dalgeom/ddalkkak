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

	let solved = $state<string[]>([]);
	let stats = $state({ score: 0, dayStreak: 0, maxStreak: 0, played: 0, lastDay: -1 });
	let calendar = $state<boolean[]>([]);

	let mode = $state<'daily' | 'random'>('daily');
	let dayNum = $state(0);
	let queue = $state<Problem[]>([]);
	let pos = $state(0);
	let results = $state<string[]>([]);
	let phase = $state<'play' | 'done'>('play');

	let hintsUsed = $state(0);
	let done = $state(false);
	let answerValue = $state('');
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let toastMsg = $state('');
	let countdown = $state('');

	let current = $derived(queue[pos]);
	let shownHints = $derived(current && current.hints ? current.hints.slice(0, hintsUsed) : []);
	let dateLabel = $derived(formatDate(dayNum));

	function formatDate(day: number): string {
		const ms = day * 86400000 - 9 * 3600 * 1000 + 43200000;
		const d = new Date(ms);
		return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}`;
	}

	function load() {
		try {
			solved = JSON.parse(localStorage.getItem('ddal.solved') || '[]');
			const s = JSON.parse(localStorage.getItem('ddal.stats') || '{}');
			stats = {
				score: s.score ?? 0,
				dayStreak: s.dayStreak ?? 0,
				maxStreak: s.maxStreak ?? 0,
				played: s.played ?? 0,
				lastDay: s.lastDay ?? -1
			};
		} catch {
			/* 무시 */
		}
	}

	/** 최근 14일 각 날짜의 데일리 완료 여부 (localStorage 스캔) */
	function buildCalendar() {
		const out: boolean[] = [];
		for (let d = dayNum - 13; d <= dayNum; d++) {
			let doneDay = false;
			try {
				const rec = JSON.parse(localStorage.getItem('ddal.daily.' + d) || 'null');
				doneDay = !!rec && rec.phase === 'done';
			} catch {
				/* 무시 */
			}
			out.push(doneDay);
		}
		calendar = out;
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
			localStorage.setItem('ddal.daily.' + dayNum, JSON.stringify({ pos, results, phase }));
		} catch {
			/* 무시 */
		}
	}

	function startDaily() {
		mode = 'daily';
		queue = dailyIndices(PROBLEMS.length, dayNum).map((i) => PROBLEMS[i]);
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
		if (pos >= queue.length) phase = 'done';
		buildCalendar();
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
		answerValue = '';
		feedback = null;
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function finish(win: boolean) {
		if (done) return;
		done = true;
		results = [...results, emojiFor(win, hintsUsed)];
		stats.score += scoreFor(win, hintsUsed);
		if (mode === 'random' && current) solved = [...solved, current.id];
		feedback = win
			? { msg: `딸깍! ⚡ +${scoreFor(win, hintsUsed)}`, ok: true }
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
		if (done || !current.hints || hintsUsed >= current.hints.length) return;
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
				stats.maxStreak = Math.max(stats.maxStreak, stats.dayStreak);
				stats.played += 1;
				stats.lastDay = dayNum;
				persist();
			}
			saveDaily();
			buildCalendar();
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

<div class="banner">
	<div class="b-left">
		<span class="b-title">{mode === 'daily' ? '오늘의 퍼즐' : '랜덤 연습'}</span>
		{#if mode === 'daily'}<span class="b-date">{dateLabel}</span>{/if}
	</div>
</div>

<a class="play-promo" href="/play">
	<div class="pp-left">
		<span class="pp-title">🎯 연속 모드 — 계속 풀기</span>
		<span class="pp-sub">발견형 + 상식 퀴즈 200문제, 5·10·20문제 랜덤 · 콤보 점수</span>
	</div>
	<span class="pp-go">시작 →</span>
</a>

<div class="layout" class:result={phase === 'done'}>
	<div class="main">
		{#if phase === 'play' && current}
			<div class="card">
				<div class="chip">{current.chip}</div>
				<div class="q">
					{#each current.blocks as b, i (i)}
						{#if b.kind === 'text'}
							<div class="qtext">{@html b.html}</div>
						{:else if b.kind === 'pre'}
							<pre
								class="qblock"
								style="--maxlen:{Math.max(...b.text.split('\n').map((l) => l.length), 1)}">{b.text}</pre>

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
						<button
							class="btn ghost"
							disabled={hintsUsed >= (current.hints?.length ?? 3)}
							onclick={showHint}
						>
							{hintsUsed >= (current.hints?.length ?? 3)
								? '힌트 소진'
								: `💡 힌트 (${hintsUsed + 1}/3)`}
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
					<button class="btn wide" onclick={next}>
						{pos + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
					</button>
				{/if}
			</div>
		{:else if phase === 'done'}
			<div class="card result">
				<h2>{mode === 'daily' ? '오늘의 퍼즐 완료!' : '랜덤 3문제 완료!'}</h2>
				<div class="emoji">{results.join(' ')}</div>
				<div class="rscore">{results.filter((r) => r !== '🔓').length} / {results.length}</div>
				<button class="btn wide" onclick={share}>결과 공유하기</button>
				{#if mode === 'daily'}
					<button class="btn ghost wide" onclick={startRandom}>🎲 더 풀기 (랜덤)</button>
				{:else}
					<button class="btn ghost wide" onclick={startRandom}>🎲 또 풀기</button>
					<button class="btn ghost wide" onclick={startDaily}>📅 오늘의 퍼즐로</button>
				{/if}
			</div>
		{/if}
	</div>

	<aside class="side">
		{#if phase === 'play'}
			<div class="panel">
				<div class="panel-title">오늘의 진행</div>
				<div class="dots">
					{#each queue as _, i (i)}
						<span class="dot" class:filled={i < results.length} class:cur={i === pos}></span>
					{/each}
				</div>
				<div class="panel-sub">{queue.length}문제 중 {Math.min(pos + 1, queue.length)}번째</div>
			</div>
			<div class="panel center">
				<div class="streak-num">🔥 {stats.dayStreak}<small>일 연속</small></div>
				{#if mode === 'daily'}<div class="cd-sub">다음 퍼즐까지 {countdown}</div>{/if}
			</div>
			<div class="panel"><AdSlot label="사이드" /></div>
		{:else}
			<div class="panel">
				<div class="panel-title">기록</div>
				<div class="stat-strip">
					<div class="stat"><b>{stats.played}</b><span>플레이</span></div>
					<div class="stat"><b>{stats.dayStreak}</b><span>연속</span></div>
					<div class="stat"><b>{stats.maxStreak}</b><span>최고</span></div>
				</div>
			</div>
			<div class="panel">
				<div class="panel-title">최근 14일</div>
				<div class="cal">
					{#each calendar as d, i (i)}
						<span class="cell" class:done={d} class:today={i === calendar.length - 1}
							>{d ? '🔥' : ''}</span
						>
					{/each}
				</div>
			</div>
			{#if mode === 'daily'}
				<div class="panel center">
					<div class="cd-title">다음 퍼즐까지</div>
					<div class="cd-big">{countdown}</div>
				</div>
			{/if}
			<div class="panel"><AdSlot label="사이드" /></div>
		{/if}
	</aside>
</div>

{#if toastMsg}
	<div class="toast">{toastMsg}</div>
{/if}

<style>
	.banner {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 16px;
		padding: 0 2px;
	}
	.b-title {
		font-size: 19px;
		font-weight: 900;
	}
	.b-date {
		font-size: 13px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.play-promo {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		background: linear-gradient(100deg, #2f8f5b, #38a06a);
		color: #fff;
		border-radius: 16px;
		padding: 16px 20px;
		margin-bottom: 16px;
		text-decoration: none;
		box-shadow: 0 4px 18px rgba(47, 143, 91, 0.28);
		transition:
			transform 0.12s,
			filter 0.15s;
	}
	.play-promo:hover {
		filter: brightness(1.05);
		transform: translateY(-1px);
	}
	.pp-left {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.pp-title {
		font-size: 17px;
		font-weight: 900;
	}
	.pp-sub {
		font-size: 12.5px;
		opacity: 0.92;
	}
	.pp-go {
		font-size: 15px;
		font-weight: 900;
		white-space: nowrap;
	}
	@media (max-width: 520px) {
		.pp-sub {
			display: none;
		}
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
		gap: 22px;
		align-items: start;
	}
	.main {
		min-width: 0;
	}
	.layout.result {
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
	}
	@media (max-width: 780px) {
		.layout,
		.layout.result {
			grid-template-columns: 1fr;
			justify-content: stretch;
		}
	}

	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 34px 32px;
		box-shadow: 0 4px 22px rgba(60, 50, 30, 0.07);
	}
	@media (max-width: 640px) {
		.card {
			padding: 24px 20px;
		}
	}
	.chip {
		display: inline-block;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.4px;
		border-radius: 999px;
		padding: 6px 15px;
		margin-bottom: 22px;
	}
	.q {
		container-type: inline-size;
		min-height: 90px;
	}
	.qtext {
		font-size: 21px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.qtext :global(b) {
		color: var(--accent);
	}
	.qblock {
		font-family: Georgia, 'Nanum Myeongjo', 'Batang', serif;
		font-size: 30px;
		font-weight: 700;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: clamp(16px, 4cqi, 26px) clamp(14px, 3.5cqi, 24px);
		margin: 16px 0 22px;
		line-height: 1.9;
		letter-spacing: 0.5px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: var(--text);
	}
	@supports (container-type: inline-size) {
		.qblock {
			font-size: clamp(15px, calc(100cqi / var(--maxlen, 10) * 1.7), 30px);
		}
	}
	.answer-area {
		margin-top: 22px;
	}
	.input-row {
		display: flex;
		gap: 11px;
	}
	input {
		flex: 1;
		min-width: 0;
		font-size: 19px;
		padding: 16px 18px;
		border: 2px solid var(--border-strong);
		border-radius: 13px;
		background: #fff;
		color: var(--text);
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s;
	}
	input::placeholder {
		color: #bcae9b;
	}
	input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(47, 143, 91, 0.14);
	}
	.btn {
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 13px;
		font-size: 16px;
		font-weight: 800;
		padding: 16px 24px;
		cursor: pointer;
		font-family: inherit;
		white-space: nowrap;
		transition:
			transform 0.1s,
			filter 0.15s;
	}
	.btn:hover:not(:disabled) {
		filter: brightness(1.06);
	}
	.btn:active:not(:disabled) {
		transform: translateY(1px);
	}
	.btn.ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border-strong);
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
		opacity: 0.5;
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
		background: #fff;
	}
	.choice:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.controls {
		display: flex;
		gap: 11px;
		margin-top: 16px;
	}
	.controls .btn {
		flex: 1;
		font-size: 14px;
		padding: 13px 10px;
	}
	.hint {
		background: #fbf3dd;
		border-left: 3px solid var(--gold);
		border-radius: 8px;
		padding: 13px 16px;
		font-size: 15px;
		margin-top: 12px;
		line-height: 1.6;
		color: #6a5f48;
		animation: slidein 0.25s ease;
	}
	.hint b {
		color: #a9791a;
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
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		border-radius: 12px;
		padding: 18px;
		margin-top: 16px;
		font-size: 15px;
		line-height: 1.7;
		word-break: keep-all;
		color: #2c4d3b;
	}
	.explain :global(b) {
		color: var(--accent);
	}

	.result {
		text-align: center;
		padding: 40px 26px;
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
		font-size: 48px;
		font-weight: 900;
		color: var(--accent);
		margin: 8px 0;
	}
	.stat-strip {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.stat {
		text-align: center;
	}
	.stat b {
		display: block;
		font-size: 26px;
		font-weight: 900;
		color: var(--accent);
	}
	.stat span {
		font-size: 11px;
		color: var(--muted);
	}
	.cal {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
	}
	.cell {
		aspect-ratio: 1;
		border-radius: 7px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
	}
	.cell.done {
		background: var(--accent-soft);
		border-color: #cfe6d8;
	}
	.cell.today {
		border-color: var(--accent);
		border-width: 2px;
	}
	.cd-title {
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 4px;
	}
	.cd-big {
		font-size: 26px;
		font-weight: 900;
		color: var(--accent-2);
		font-variant-numeric: tabular-nums;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
		position: sticky;
		top: 16px;
	}
	@media (max-width: 780px) {
		.side {
			position: static;
		}
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 20px 18px;
		box-shadow: 0 3px 14px rgba(60, 50, 30, 0.05);
	}
	.panel.center {
		text-align: center;
	}
	.panel-title {
		font-size: 14px;
		font-weight: 800;
		margin-bottom: 13px;
	}
	.dots {
		display: flex;
		gap: 9px;
	}
	.dot {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: var(--border-strong);
	}
	.dot.filled {
		background: var(--accent);
	}
	.dot.cur {
		background: var(--accent-2);
		transform: scale(1.15);
	}
	.panel-sub {
		font-size: 12px;
		color: var(--muted);
		margin-top: 10px;
	}
	.streak-num {
		font-size: 32px;
		font-weight: 900;
		color: var(--accent-2);
	}
	.streak-num small {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.cd-sub {
		font-size: 12px;
		color: var(--muted);
		margin-top: 6px;
		font-variant-numeric: tabular-nums;
	}

	.toast {
		position: fixed;
		bottom: 32px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--text);
		color: #fdfbf6;
		border-radius: 999px;
		padding: 12px 24px;
		font-size: 14px;
		z-index: 30;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
	}
</style>
