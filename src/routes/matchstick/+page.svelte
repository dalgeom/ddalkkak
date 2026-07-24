<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import problems from '$lib/data/matchstick-problems.json';
	import { parseEq, cloneBoard, isSolved, bit, type Board } from '$lib/matchstick';
	import { kstDayNumber, dailyIndices, advanceStreakIfComplete } from '$lib/game';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	type Mode =
		| { type: 'free' }
		| { type: 'time'; seconds: number }
		| { type: 'count'; total: number }
		| { type: 'daily'; total: number };

	let screen = $state<'menu' | 'play' | 'result'>('menu');
	let mode = $state<Mode>({ type: 'free' });

	let done = $state<number[]>([]);
	let stats = $state({ solved: 0, streak: 0, best: 0 });
	let bests = $state<Record<string, number>>({});

	let pIdx = $state(-1);
	let orig = $state<Board | null>(null);
	let cur = $state<Board | null>(null);
	let picked = $state<PickLoc | null>(null);
	let attempts = $state(0);
	let solvedThis = $state<'no' | 'won' | 'revealed'>('no');
	let feedback = $state('');
	let shaking = $state(false);
	let toastMsg = $state('');

	/** 오늘의 성냥개비 — 날짜 시드로 뽑은 3문제. 전 방문자가 같은 문제를 푼다. */
	const DAILY_SIZE = 3;
	let dayNum = $state(0);
	let dailyQueue = $state<number[]>([]);
	let dailyPos = $state(0);
	let dailyCleared = $state(false);

	// 모드 런 상태
	let runSolved = $state(0);
	let runResults = $state<('win' | 'fail')[]>([]);
	let timeLeft = $state(0);
	let timerId: ReturnType<typeof setInterval> | undefined;

	let timeStr = $derived(
		`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
	);

	function modeKey(m: Mode): string {
		if (m.type === 'time') return `time-${m.seconds}`;
		if (m.type === 'count') return `count-${m.total}`;
		if (m.type === 'daily') return 'daily';
		return 'free';
	}
	function modeLabel(m: Mode): string {
		if (m.type === 'time') return `타임어택 ${m.seconds / 60}분`;
		if (m.type === 'count') return `${m.total}문제 도전`;
		if (m.type === 'daily') return '오늘의 성냥개비';
		return '무한 연습';
	}
	function dailyKey() {
		return `ddal.daily.${dayNum}.match`;
	}
	/** 홈 허브가 읽는 것과 같은 형식으로 진행 상황을 남긴다 */
	function saveDailyProgress(phase: 'play' | 'done') {
		if (!browser) return;
		try {
			localStorage.setItem(
				dailyKey(),
				JSON.stringify({ pos: dailyPos, results: runResults, phase })
			);
		} catch {
			/* 무시 */
		}
	}

	function load() {
		try {
			done = JSON.parse(localStorage.getItem('ddal.match.done') || '[]');
			stats = JSON.parse(
				localStorage.getItem('ddal.match.stats') || '{"solved":0,"streak":0,"best":0}'
			);
			bests = JSON.parse(localStorage.getItem('ddal.match.bests') || '{}');
		} catch {
			/* 무시 */
		}
	}
	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem('ddal.match.done', JSON.stringify(done));
			localStorage.setItem('ddal.match.stats', JSON.stringify(stats));
			localStorage.setItem('ddal.match.bests', JSON.stringify(bests));
		} catch {
			/* 무시 */
		}
	}

	function startMode(m: Mode) {
		mode = m;
		runSolved = 0;
		runResults = [];
		screen = 'play';
		if (m.type === 'daily') {
			dailyQueue = dailyIndices(problems.length, dayNum, DAILY_SIZE);
			dailyPos = 0;
			try {
				const rec = JSON.parse(localStorage.getItem(dailyKey()) || 'null');
				if (rec && rec.phase === 'done') {
					// 이미 끝냈으면 결과 화면으로
					runResults = rec.results || [];
					runSolved = runResults.filter((r: string) => r === 'win').length;
					screen = 'result';
					return;
				}
				if (rec) {
					dailyPos = Math.min(rec.pos ?? 0, DAILY_SIZE);
					runResults = rec.results || [];
					runSolved = runResults.filter((r: string) => r === 'win').length;
				}
			} catch {
				/* 무시 */
			}
		}
		if (m.type === 'time') {
			timeLeft = m.seconds;
			timerId = setInterval(() => {
				timeLeft -= 1;
				if (timeLeft <= 0) endRun();
			}, 1000);
		}
		nextProblem(true);
	}

	function endRun() {
		clearInterval(timerId);
		timerId = undefined;
		if (mode.type === 'daily') {
			saveDailyProgress('done');
			// 성냥개비를 마지막에 끝냈을 때도 오늘 3트랙 완료면 연속 기록이 갱신되도록.
			advanceStreakIfComplete(dayNum);
		}
		const key = modeKey(mode);
		const score =
			mode.type === 'count' || mode.type === 'daily'
				? runResults.filter((r) => r === 'win').length
				: runSolved;
		if (score > (bests[key] ?? 0)) bests[key] = score;
		persist();
		screen = 'result';
	}

	function toMenu() {
		clearInterval(timerId);
		timerId = undefined;
		screen = 'menu';
	}

	function nextProblem(first = false) {
		const forced = Number(page.url.searchParams.get('p'));
		let idx: number;
		if (mode.type === 'daily') {
			idx = dailyQueue[Math.min(dailyPos, dailyQueue.length - 1)] ?? 0;
			pIdx = idx;
			orig = parseEq(problems[idx].displayed);
			cur = cloneBoard(orig);
			picked = null;
			attempts = 0;
			solvedThis = 'no';
			feedback = '';
			saveDailyProgress('play');
			return;
		}
		if (first && mode.type === 'free' && page.url.searchParams.has('p') && !Number.isNaN(forced)) {
			idx = Math.max(0, Math.min(problems.length - 1, forced));
		} else {
			let pool = problems.map((_, i) => i).filter((i) => !done.includes(i));
			if (pool.length === 0) {
				done = [];
				persist();
				pool = problems.map((_, i) => i);
			}
			idx = pool[Math.floor(Math.random() * pool.length)];
		}
		pIdx = idx;
		orig = parseEq(problems[idx].displayed);
		cur = cloneBoard(orig);
		picked = null;
		attempts = 0;
		solvedThis = 'no';
		feedback = '';
	}

	function revert() {
		if (!orig) return;
		cur = cloneBoard(orig);
		picked = null;
	}

	function handleStick(loc: PickLoc, lit: boolean) {
		if (screen !== 'play' || solvedThis !== 'no' || !cur || !orig) return;

		if (!picked) {
			if (!lit) return;
			picked = loc;
			applyRemove(loc);
			return;
		}
		if (!lit && sameLoc(picked, loc)) {
			applyAdd(loc);
			picked = null;
			return;
		}
		if (lit) return;

		applyAdd(loc);
		picked = null;

		if (isSolved(orig, cur)) {
			solvedThis = 'won';
			stats.solved++;
			stats.streak++;
			if (stats.streak > stats.best) stats.best = stats.streak;
			markDone();
			persist();

			if (mode.type === 'free') {
				const gained = Math.max(20, 100 - attempts * 20);
				feedback = `딸깍! +${gained}점 (시도 ${attempts + 1}회)`;
			} else {
				runSolved++;
				if (mode.type === 'count' || mode.type === 'daily') runResults = [...runResults, 'win'];
				if (mode.type === 'daily') dailyPos += 1;
				feedback = '딸깍!';
				setTimeout(() => {
					if (screen !== 'play') return;
					if (
						(mode.type === 'count' || mode.type === 'daily') &&
						runResults.length >= mode.total
					)
						endRun();
					else nextProblem();
				}, 650);
			}
		} else {
			attempts++;
			feedback = '아직 아니에요!';
			shaking = true;
			setTimeout(() => {
				shaking = false;
				revert();
			}, 420);
		}
	}

	function sameLoc(a: PickLoc, b: PickLoc): boolean {
		return a.kind === b.kind && a.gi === b.gi && a.seg === b.seg;
	}
	function applyRemove(loc: PickLoc) {
		if (!cur) return;
		if (loc.kind === 'op') cur.opPlus = false;
		else cur.glyphs[loc.gi!] &= ~bit(loc.seg!);
	}
	function applyAdd(loc: PickLoc) {
		if (!cur) return;
		if (loc.kind === 'op') cur.opPlus = true;
		else cur.glyphs[loc.gi!] |= bit(loc.seg!);
	}
	function markDone() {
		if (!done.includes(pIdx)) done = [...done, pIdx];
	}

	/** 타임어택: 건너뛰기 / 개수 모드·무한: 정답 보기 */
	function skip() {
		nextProblem();
	}
	function reveal() {
		if (solvedThis !== 'no') return;
		cur = parseEq(problems[pIdx].solution);
		picked = null;
		solvedThis = 'revealed';
		stats.streak = 0;
		markDone();
		persist();
		feedback = `정답: ${problems[pIdx].solution.replace('-', '−')}`;
		if (mode.type === 'count' || mode.type === 'daily') {
			runResults = [...runResults, 'fail'];
			if (mode.type === 'daily') dailyPos += 1;
			setTimeout(() => {
				if (screen !== 'play') return;
				if (runResults.length >= (mode as { total: number }).total) endRun();
				else nextProblem();
			}, 1400);
		}
	}

	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}

	function shareResult() {
		let text: string;
		if (mode.type === 'time') {
			text = `딸깍! 성냥개비 타임어택 ${mode.seconds / 60}분 · ${runSolved}문제`;
		} else if (mode.type === 'count') {
			const wins = runResults.filter((r) => r === 'win').length;
			text = `딸깍! 성냥개비 도전 ${mode.total}문제 중 ${wins}개 ${runResults
				.map((r) => (r === 'win' ? '✅' : '🔓'))
				.join('')}`;
		} else {
			text = `딸깍! 성냥개비 — 연속 ${stats.streak}판 · 통산 ${stats.solved}판`;
		}
		text += `\n${location.origin}/matchstick`;
		if (navigator.share) navigator.share({ text }).catch(() => {});
		else if (navigator.clipboard?.writeText)
			navigator.clipboard.writeText(text).then(
				() => toast('결과가 복사됐어요! 친구에게 도전장을 보내세요'),
				() => toast('복사에 실패했어요')
			);
	}

	onMount(() => {
		load();
		dayNum = kstDayNumber(Date.now());
		try {
			const rec = JSON.parse(localStorage.getItem(dailyKey()) || 'null');
			dailyCleared = !!rec && rec.phase === 'done';
		} catch {
			/* 무시 */
		}
		if (page.url.searchParams.get('daily') === '1') startMode({ type: 'daily', total: DAILY_SIZE });
		else if (page.url.searchParams.has('p')) startMode({ type: 'free' });
	});
	onDestroy(() => clearInterval(timerId));
</script>

<svelte:head>
	<title>성냥개비 — 딸깍</title>
	<meta
		name="description"
		content="성냥개비 하나만 옮겨 등식을 참으로! 타임어택·개수 도전 모드로 친구와 대결하세요."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/matchstick" />
	<meta property="og:title" content="성냥개비 — 딸깍" />
	<meta property="og:description" content="성냥개비 하나만 옮겨 등식을 참으로! 타임어택·개수 도전 모드로 친구와 대결하세요." />
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/matchstick" />
</svelte:head>

<div class="mroot">
{#if screen === 'menu'}
	<div class="card menu">
		<h2>성냥개비</h2>
		<p class="desc">성냥개비 <b>하나만 옮겨</b> 등식을 참으로 만드세요.</p>

		<div class="mode-sec daily-sec">
			<div class="mode-title">
				<Icon name="match" size={16} /> 오늘의 성냥개비
				<span class="hintTxt">모두가 같은 3문제 · 자정에 새로</span>
			</div>
			<button class="btn wide" onclick={() => startMode({ type: 'daily', total: DAILY_SIZE })}>
				{dailyCleared ? '다시 보기' : '오늘 치 풀기'}
			</button>
		</div>

		<div class="mode-sec">
			<div class="mode-title">무한 연습</div>
			<button class="btn wide ghost" onclick={() => startMode({ type: 'free' })}>시작</button>
		</div>

		<div class="mode-sec">
			<div class="mode-title"><Icon name="timer" size={16} /> 타임어택 <span class="hintTxt">제한시간 안에 최대한 많이!</span></div>
			<div class="opt-row">
				{#each [180, 300, 600] as s (s)}
					<button class="btn opt" onclick={() => startMode({ type: 'time', seconds: s })}>
						{s / 60}분
						{#if bests[`time-${s}`]}<span class="best">최고 {bests[`time-${s}`]}</span>{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="mode-sec">
			<div class="mode-title"><Icon name="trophy" size={16} /> 개수 도전 <span class="hintTxt">시간 무제한, 몇 개나 풀까?</span></div>
			<div class="opt-row">
				{#each [5, 10, 20] as n (n)}
					<button class="btn opt" onclick={() => startMode({ type: 'count', total: n })}>
						{n}문제
						{#if bests[`count-${n}`]}<span class="best">최고 {bests[`count-${n}`]}</span>{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="lifetime">통산 {stats.solved}판 성공 · 최고 연속 {stats.best}판 · 남은 새 문제 {problems.length - done.length}개</div>
	</div>
{:else if screen === 'play'}
	<div class="topbar">
		{#if mode.type === 'time'}
			<div class="timer" class:danger={timeLeft <= 10}><Icon name="timer" size={15} />{timeStr}</div>
			<div class="run-score"><Icon name="correct" size={15} />{runSolved}</div>
		{:else if mode.type === 'count'}
			<div class="run-score">문제 {runResults.length + 1} / {mode.total}</div>
			<div class="emoji-mini">{runResults.map((r) => (r === 'win' ? '✅' : '🔓')).join('')}</div>
		{:else}
			<div class="stats">
				<div class="stat-box"><span>성공</span><b>{stats.solved}</b></div>
				<div class="stat-box"><span>연속</span><b>{stats.streak}</b></div>
			</div>
		{/if}
	</div>

	<div class="card">
		{#if cur}
			<div class:shaking>
				<MatchstickBoard board={cur} {picked} onstick={handleStick} label={pIdx >= 0 ? problems[pIdx].displayed : undefined} />
			</div>
		{/if}

		{#if feedback}
			<div class="feedback" class:ok={solvedThis === 'won'} role="alert" aria-live="assertive">{feedback}</div>
		{/if}

		{#if solvedThis === 'no'}
			<div class="controls">
				<button class="btn ghost" onclick={revert}>처음부터</button>
				{#if mode.type === 'time'}
					<button class="btn ghost" onclick={skip}>건너뛰기</button>
					<button class="btn ghost" onclick={endRun}>끝내기</button>
				{:else}
					<button class="btn ghost" onclick={reveal}>정답 보기</button>
					{#if mode.type === 'count'}<button class="btn ghost" onclick={toMenu}>나가기</button>{/if}
				{/if}
			</div>
		{:else if mode.type === 'free'}
			<button class="btn wide" onclick={() => nextProblem()}>다음 문제 →</button>
			<button class="btn ghost wide" onclick={shareResult}>기록 공유하기</button>
			<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
		{/if}
	</div>
{:else}
	<div class="card result">
		<h2>{modeLabel(mode)} 종료!</h2>
		{#if mode.type === 'time'}
			<div class="big-score">{runSolved}<span class="unit">문제</span></div>
		{:else if mode.type === 'count'}
			<div class="emoji-row">{runResults.map((r) => (r === 'win' ? '✅' : '🔓')).join(' ')}</div>
			<div class="big-score">
				{runResults.filter((r) => r === 'win').length}<span class="unit"> / {mode.total}</span>
			</div>
		{/if}
		{#if bests[modeKey(mode)]}
			<div class="best-line">이 모드 최고 기록: {bests[modeKey(mode)]}문제</div>
		{/if}
		<button class="btn wide" onclick={shareResult}>결과 공유 — 친구에게 도전장</button>
		<button class="btn ghost wide" onclick={() => startMode(mode)}>다시 하기</button>
		<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
		<AdSlot label="모드 결과" />
	</div>
{/if}
</div>

{#if toastMsg}
	<div class="toast" role="status" aria-live="polite">{toastMsg}</div>
{/if}

<style>
	.mroot {
		max-width: 640px;
		margin: 0 auto;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 24px 20px;
		box-shadow:
			0 12px 40px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 #ffffff08;
	}
	.menu h2 {
		font-size: 26px;
		margin-bottom: 4px;
	}
	.desc {
		font-size: 15px;
		color: var(--muted);
		margin-bottom: 18px;
	}
	.desc :global(b) {
		color: var(--accent);
	}
	.mode-sec {
		border-top: 1px solid var(--border);
		padding: 16px 0;
	}
	.mode-title {
		font-size: 16px;
		font-weight: 800;
		margin-bottom: 12px;
	}
	.hintTxt {
		font-size: 12px;
		color: var(--muted);
		font-weight: 400;
		margin-left: 6px;
	}
	.opt-row {
		display: flex;
		gap: 10px;
	}
	.opt {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.best {
		font-size: 10px;
		opacity: 0.9;
		font-weight: 600;
	}
	.lifetime {
		margin-top: 16px;
		font-size: 12px;
		color: var(--muted);
		text-align: center;
	}
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		min-height: 36px;
	}
	.timer {
		font-size: 24px;
		font-weight: 900;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.timer.danger {
		color: var(--danger);
		text-shadow: 0 0 14px #ff5d7355;
	}
	.run-score {
		font-size: 17px;
		font-weight: 800;
		color: var(--accent);
	}
	.emoji-mini {
		font-size: 14px;
		letter-spacing: 1px;
	}
	.stats {
		display: flex;
		gap: 8px;
	}
	.stat-box {
		background: var(--panel-2);
		border: 1px solid var(--border);
		color: var(--text);
		border-radius: 10px;
		padding: 5px 12px;
		text-align: center;
		min-width: 54px;
	}
	.stat-box span {
		display: block;
		font-size: 10px;
		color: var(--muted);
	}
	.stat-box b {
		font-size: 16px;
		color: var(--accent);
	}
	.feedback {
		margin-top: 14px;
		font-size: 16px;
		font-weight: 800;
		color: var(--danger);
	}
	.feedback.ok {
		color: var(--accent);
	}
	.controls {
		display: flex;
		gap: 10px;
		margin-top: 14px;
	}
	.controls .btn {
		flex: 1;
		font-size: 14px;
		padding: 12px 6px;
	}
	.btn {
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 800;
		padding: 15px 20px;
		cursor: pointer;
		font-family: inherit;
		transition:
			transform 0.1s,
			filter 0.15s;
	}
	.btn:hover {
		filter: brightness(1.08);
	}
	.btn:active {
		transform: translateY(1px);
	}
	.btn.ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
	}
	.btn.ghost:hover {
		color: var(--text);
		border-color: var(--muted);
		filter: none;
	}
	.btn.wide {
		width: 100%;
		margin-top: 12px;
	}
	.result {
		text-align: center;
		padding: 34px 20px;
	}
	.result h2 {
		font-size: 24px;
		margin-bottom: 12px;
	}
	.big-score {
		font-size: 56px;
		font-weight: 900;
		color: var(--accent);
		margin: 8px 0;
	}
	.big-score .unit {
		font-size: 22px;
		color: var(--muted);
		text-shadow: none;
	}
	.emoji-row {
		font-size: 26px;
		letter-spacing: 4px;
		margin: 10px 0;
	}
	.best-line {
		font-size: 13px;
		color: var(--muted);
		margin-bottom: 12px;
	}
	.shaking {
		animation: shake 0.3s ease;
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-6px);
		}
		75% {
			transform: translateX(6px);
		}
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
	.daily-sec {
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		border-radius: 14px;
		padding: 14px 16px;
	}
	.daily-sec .mode-title {
		color: #1f6b41;
	}
</style>
