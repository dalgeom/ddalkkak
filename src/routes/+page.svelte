<script lang="ts">
	import { onMount } from 'svelte';
	import { browser, dev } from '$app/environment';
	import { PROBLEMS, type Problem } from '$lib/problems';
	import { TRIVIA } from '$lib/trivia';
	import {
		TRACKS,
		type TrackKey,
		buildRound,
		isCorrectText,
		scoreFor,
		emojiFor,
		kstDayNumber,
		dailyIndices,
		hintUnlocked,
		isCloseAnswer,
		wanderBonus
	} from '$lib/game';
	import { shareResult, outcomeMessage } from '$lib/shareCard';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let solved = $state<string[]>([]);
	let stats = $state({ score: 0, dayStreak: 0, maxStreak: 0, played: 0, lastDay: -1 });
	let calendar = $state<boolean[]>([]);

	let mode = $state<'daily' | 'random'>('daily');
	let dayNum = $state(0);
	let queue = $state<Problem[]>([]);
	let pos = $state(0);
	let results = $state<string[]>([]);
	let phase = $state<'landing' | 'hub' | 'play' | 'done'>('hub');
	let track = $state<TrackKey>('discover');
	/** 트랙별 완료 여부 (오늘 기준) */
	let trackDone = $state<Record<string, boolean>>({});
	/** 트랙별 진행 위치 */
	let trackPos = $state<Record<string, number>>({});

	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let startedAt = $state(0);
	let elapsedMs = $state(0);
	let done = $state(false);
	let answerValue = $state('');
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let toastMsg = $state('');
	let countdown = $state('');

	/** 입력창·선택지가 판정에 직접 반응하도록 하는 일시 상태 (색 + 팝/셰이크) */
	let inputState = $state<'idle' | 'wrong' | 'correct'>('idle');
	let flashIndex = $state<number | null>(null);
	let flashKind = $state<'wrong' | 'correct' | null>(null);
	let flashTimer: ReturnType<typeof setTimeout> | undefined;

	function flash(kind: 'wrong' | 'correct', idx?: number) {
		clearTimeout(flashTimer);
		if (idx !== undefined) {
			flashIndex = idx;
			flashKind = kind;
		} else {
			inputState = kind;
		}
		flashTimer = setTimeout(
			() => {
				flashIndex = null;
				flashKind = null;
				inputState = 'idle';
			},
			kind === 'wrong' ? 420 : 600
		);
	}

	/** 판정 3-state: 정답 / 오답(재시도 가능) / 포기(정답 공개) */
	let judge = $derived<'correct' | 'wrong' | 'giveup' | null>(
		!feedback ? null : feedback.ok ? 'correct' : done ? 'giveup' : 'wrong'
	);

	const TRACK_META = TRACKS;
	let trackInfo = $derived(TRACKS.find((t) => t.key === track)!);
	/** 인라인으로 푸는 트랙만 데일리 완료 판정에 넣는다(성냥개비는 별도 라우트) */
	const INLINE_TRACKS: TrackKey[] = ['discover', 'trivia'];
	let allInlineDone = $derived(INLINE_TRACKS.every((k) => trackDone[k]));

	/** 카드에 실제 문제를 미리 보여준다 — 이름만 보고는 뭘 하는 모드인지 알 수 없다는 지적 대응 */
	const PEEK: Record<TrackKey, string> = {
		discover: '11 · 31 · 55 · 66 · ?\n숫자가 아닙니다',
		trivia: '세계에서 국토 면적이\n가장 넓은 나라는?',
		match: '0 + 0 = 8\n한 개만 옮기세요'
	};
	const todayTotal = TRACKS.reduce((n, t) => n + t.size, 0);
	let nextTrack = $derived(
		TRACKS.find((t) => t.key !== 'match' && t.key !== track && !trackDone[t.key]) ?? null
	);

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
				const a = JSON.parse(localStorage.getItem(`ddal.daily.${d}.discover`) || 'null');
				const b = JSON.parse(localStorage.getItem(`ddal.daily.${d}.trivia`) || 'null');
				doneDay = !!a && a.phase === 'done' && !!b && b.phase === 'done';
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
	function dailyKey(k: TrackKey = track) {
		return `ddal.daily.${dayNum}.${k}`;
	}
	function saveDaily() {
		if (!browser || mode !== 'daily') return;
		try {
			localStorage.setItem(dailyKey(), JSON.stringify({ pos, results, phase }));
		} catch {
			/* 무시 */
		}
		refreshTrackState();
	}
	/** 오늘 각 트랙이 어디까지 갔는지 다시 읽는다 */
	function refreshTrackState() {
		if (!browser) return;
		const d: Record<string, boolean> = {};
		const p: Record<string, number> = {};
		for (const t of TRACKS) {
			try {
				const rec = JSON.parse(localStorage.getItem(dailyKey(t.key)) || 'null');
				d[t.key] = !!rec && rec.phase === 'done';
				p[t.key] = rec?.pos ?? 0;
			} catch {
				d[t.key] = false;
				p[t.key] = 0;
			}
		}
		trackDone = d;
		trackPos = p;
	}

	function startTrack(k: TrackKey) {
		mode = 'daily';
		track = k;
		// 한 번이라도 시작했으면 다음부터 랜딩을 건너뛴다
		try {
			localStorage.setItem('ddal.visited', '1');
		} catch {
			/* 무시 */
		}
		const meta = TRACKS.find((t) => t.key === k)!;
		queue =
			k === 'trivia'
				? dailyIndices(TRIVIA.length, dayNum, meta.size).map((i) => TRIVIA[i])
				: dailyIndices(PROBLEMS.length, dayNum, meta.size).map((i) => PROBLEMS[i]);
		let saved: { pos: number; results: string[]; phase: 'play' | 'done' } | null = null;
		try {
			saved = JSON.parse(localStorage.getItem(dailyKey(k)) || 'null');
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

	function goHub() {
		phase = 'hub';
		refreshTrackState();
		buildCalendar();
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
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
		wrongAttempts = 0;
		startedAt = Date.now();
		elapsedMs = 0;
		done = false;
		answerValue = '';
		feedback = null;
		clearTimeout(flashTimer);
		inputState = 'idle';
		flashIndex = null;
		flashKind = null;
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function finish(win: boolean) {
		if (done) return;
		done = true;
		results = [...results, emojiFor(win, hintsUsed)];
		const bonus = win ? wanderBonus(hintsUsed, wrongAttempts) : 0;
		const gained = scoreFor(win, hintsUsed) + bonus;
		stats.score += gained;
		if (mode === 'random' && current) solved = [...solved, current.id];
		feedback = win
			? {
					msg: bonus ? `정답 · +${gained} — 힌트 없이 끝까지 물고 늘어졌네요` : `정답 · +${gained}`,
					ok: true
				}
			: { msg: '정답을 확인했어요', ok: false };
		persist();
		saveDaily();
	}

	function submitText() {
		if (done || !answerValue.trim()) return;
		if (isCorrectText(current, answerValue)) {
			flash('correct');
			finish(true);
		} else {
			wrongAttempts += 1;
			flash('wrong');
			feedback = isCloseAnswer(current, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}
	function submitChoice(i: number) {
		if (done) return;
		if (i === current.answerIndex) {
			flash('correct', i);
			finish(true);
		} else {
			wrongAttempts += 1;
			flash('wrong', i);
			feedback = { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}
	function showHint() {
		if (done || !current.hints || hintsUsed >= current.hints.length) return;
		if (!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)) return;
		hintsUsed += 1;
	}

	function next() {
		pos += 1;
		if (pos < queue.length) {
			resetProblem();
			saveDaily();
		} else {
			phase = 'done';
			if (mode === 'daily') {
				trackDone = { ...trackDone, [track]: true };
			}
			if (mode === 'daily' && allInlineDone && stats.lastDay !== dayNum) {
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

	async function share() {
		const label = mode === 'daily' ? `오늘의 퍼즐 (${dateLabel})` : '랜덤 3문제';
		const solvedN = results.filter((r) => r !== '🔓').length;
		let text = `딸깍! ${label} ${solvedN}/${results.length} ${results.join('')}`;
		if (mode === 'daily' && stats.dayStreak > 1) text += `\n${stats.dayStreak}일 연속`;
		text += `\n${location.origin}`;
		const outcome = await shareResult(
			{
				title: label,
				scoreLabel: `${solvedN} / ${results.length}`,
				emojiRow: results.join(' '),
				subLine:
					mode === 'daily' && stats.dayStreak > 1 ? `${stats.dayStreak}일 연속` : undefined,
				cta: '너도 오늘의 퍼즐 풀어볼래?'
			},
			text
		);
		toast(outcomeMessage(outcome));
	}

	function tickElapsed() {
		if (!done && startedAt) elapsedMs = Date.now() - startedAt;
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
		refreshTrackState();
		let visited = false;
		try {
			visited = !!localStorage.getItem('ddal.visited');
		} catch {
			/* 무시 */
		}
		phase = visited ? 'hub' : 'landing';
		buildCalendar();
		tickCountdown();
		const iv = setInterval(() => {
			tickCountdown();
			tickElapsed();
		}, 1000);
		return () => clearInterval(iv);
	});
</script>

<svelte:head>
	<title>딸깍 — 매일 새로 열리는 두뇌 퍼즐</title>
	<meta
		name="description"
		content="규칙을 발견하는 순간의 그 소리. 발견형 퍼즐·상식 퀴즈·성냥개비를 매일 새로, 모두가 같은 문제로."
	/>
</svelte:head>

{#if phase === 'landing'}
	<!-- 첫 방문자만 보는 화면. 재방문자는 곧바로 허브로 간다. -->
	<section class="landing">
		<h1 class="l-h1">규칙을 발견하는 순간, 딸깍.</h1>
		<p class="l-sub">오늘 치 {todayTotal}문제 · 매일 자정에 새로 열립니다</p>
	</section>
{:else}
	{#if mode === 'daily' && stats.dayStreak > 0 && stats.lastDay !== dayNum}
		<div class="streak-warn">
			<Icon name="streak" size={16} />
			<span><b>{stats.dayStreak}일 연속</b> 기록이 오늘 끊겨요! 남은 시간 <b>{countdown}</b></span>
		</div>
	{/if}

	<div class="banner">
		<div class="b-left">
			<span class="b-title"
				>{phase === 'hub' ? '오늘의 딸깍' : mode === 'daily' ? trackInfo.name : '랜덤 연습'}</span
			>
			<span class="b-date">{dateLabel}</span>
		</div>
		{#if phase !== 'hub'}
			<button class="b-back" onclick={goHub}>← 오늘의 딸깍</button>
		{/if}
	</div>
{/if}

{#if phase === 'landing' || phase === 'hub'}
	<section class="tracks">
		{#each TRACK_META as t (t.key)}
			{#if t.key === 'match'}
				<a class="track" href="/matchstick">
					<span class="t-top"><Icon name={t.icon} size={17} />{t.name}</span>
					<span class="t-desc">{t.desc}</span>
					<span class="t-peek">{PEEK[t.key]}</span>
					<span class="t-foot"><span>{t.size}문제</span><span class="t-go">하러 가기 →</span></span>
				</a>
			{:else}
				<button
					class="track"
					class:cleared={trackDone[t.key]}
					onclick={() => startTrack(t.key)}
				>
					<span class="t-top">
						<Icon name={trackDone[t.key] ? 'correct' : t.icon} size={17} />{t.name}
					</span>
					<span class="t-desc">{t.desc}</span>
					<span class="t-peek">{PEEK[t.key]}</span>
					<span class="t-foot">
						<span class="t-dots">
							{#each Array(t.size) as _, i (i)}
								<span class="t-dot" class:on={trackDone[t.key] || i < (trackPos[t.key] ?? 0)}
								></span>
							{/each}
						</span>
						<span class="t-go">{trackDone[t.key] ? '다시 보기 →' : '풀어보기 →'}</span>
					</span>
				</button>
			{/if}
		{/each}
	</section>
{/if}

{#if phase === 'hub'}
	<a class="play-promo" href="/play">
		<div class="pp-left">
			<span class="pp-title"><Icon name="arrow" size={16} /> 계속 풀기 — 오늘 치를 다 풀었다면</span>
			<span class="pp-sub"
				>발견형 + 상식 {PROBLEMS.length + TRIVIA.length}문제에서 5·10·20문제 랜덤 · 콤보 점수</span
			>
		</div>
		<span class="pp-go">시작 →</span>
	</a>
{/if}

{#if phase === 'play' || phase === 'done'}
<div class="layout" class:result={phase === 'done'}>
	<div class="main">
		{#if phase === 'play' && current}
			{#key current.id}
			<div class="card slide">
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
								<button
									class="choice"
									class:flash-wrong={flashIndex === i && flashKind === 'wrong'}
									class:flash-correct={flashIndex === i && flashKind === 'correct'}
									disabled={done}
									onclick={() => submitChoice(i)}>{c}</button
								>
							{/each}
						</div>
					{:else}
						<div class="input-row">
							<input
								class:flash-wrong={inputState === 'wrong'}
								class:flash-correct={inputState === 'correct'}
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
						<!-- 상식 퀴즈는 힌트가 없다. 없는 문제에 힌트 버튼을 띄우면 눌러도 아무 일이 없다. -->
						{#if current.hints?.length}
							<button
								class="btn ghost"
								disabled={hintsUsed >= current.hints.length ||
									!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)}
								onclick={showHint}
							>
								{hintsUsed >= current.hints.length
									? '힌트 소진'
									: hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)
										? `힌트 (${hintsUsed + 1}/${current.hints.length})`
										: '조금만 더 만져보세요'}
							</button>
						{/if}
						<button class="btn ghost" onclick={() => finish(false)}>정답 보기</button>
					</div>
				{/if}

				{#if feedback && judge}
					{#key feedback.msg + judge}
						<div class="feedback {judge}">
							<Icon name={judge} size={20} />
							<span>{feedback.msg}</span>
						</div>
					{/key}
				{/if}

				{#if done}
					<div class="explain" class:win={feedback?.ok} class:giveup={!feedback?.ok}>
						<div class="explain-head">
							<Icon name={feedback?.ok ? 'correct' : 'giveup'} size={15} />
							<span>{feedback?.ok ? '정답 풀이' : '정답 공개'}</span>
						</div>
						{@html current.explain}
					</div>
					<button class="btn wide" onclick={next}>
						{pos + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
					</button>
				{/if}
			</div>
			{/key}
		{:else if phase === 'done'}
			<div class="card result">
				<h2>{mode === 'daily' ? `${trackInfo.name} 완료!` : '랜덤 3문제 완료!'}</h2>
				<div class="emoji">{results.join(' ')}</div>
				<div class="rscore">{results.filter((r) => r !== '🔓').length} / {results.length}</div>
				<button class="btn wide" onclick={share}>결과 공유하기</button>
				{#if mode === 'daily'}
					{#if nextTrack}
						<button class="btn ghost wide" onclick={() => startTrack(nextTrack.key)}>
							{nextTrack.name} 이어서 풀기 →
						</button>
					{/if}
					<button class="btn ghost wide" onclick={goHub}>오늘의 딸깍으로</button>
				{:else}
					<button class="btn ghost wide" onclick={startRandom}>또 풀기</button>
					<button class="btn ghost wide" onclick={goHub}>오늘의 딸깍으로</button>
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
				{#if stats.dayStreak > 0}
					<div class="streak-num">
						<Icon name="streak" size={18} />{stats.dayStreak}<small>일 연속</small>
					</div>
				{:else}
					<div class="streak-none">오늘 풀면 연속 기록이 시작돼요</div>
				{/if}
				{#if mode === 'daily'}<div class="cd-sub">다음 퍼즐까지 {countdown}</div>{/if}
			</div>
			{#if dev}<div class="panel"><AdSlot label="사이드" /></div>{/if}
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
			{#if dev}<div class="panel"><AdSlot label="사이드" /></div>{/if}
		{/if}
	</aside>
</div>
{/if}

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

	.streak-warn {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fdf1e3;
		border: 1px solid #f0d9b8;
		color: #9a5a20;
		border-radius: 12px;
		padding: 11px 16px;
		font-size: 13.5px;
		font-weight: 700;
		margin-bottom: 12px;
	}
	.streak-warn b {
		color: var(--accent-2);
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
		display: flex;
		align-items: center;
		gap: 7px;
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
	.card.slide {
		animation: card-in var(--dur-move) var(--ease-out);
	}
	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateX(26px);
		}
		to {
			opacity: 1;
			transform: none;
		}
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
	input.flash-wrong {
		border-color: var(--danger);
		animation: shake 0.4s ease;
	}
	input.flash-correct {
		border-color: var(--accent);
		animation: judge-pop var(--dur-judge) var(--ease-pop);
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
			transform var(--dur-tap) var(--ease-out),
			box-shadow 0.18s var(--ease-out),
			filter 0.18s var(--ease-out);
		box-shadow: 0 1px 2px rgba(44, 40, 34, 0.16);
	}
	.btn:hover:not(:disabled) {
		filter: brightness(1.06);
		transform: translateY(-1.5px);
		box-shadow: 0 5px 14px rgba(47, 143, 91, 0.26);
	}
	.btn:active:not(:disabled) {
		transform: translateY(1px) scale(0.985);
		box-shadow: 0 1px 1px rgba(44, 40, 34, 0.2);
	}
	.btn.ghost {
		box-shadow: none;
	}
	.btn.ghost:hover:not(:disabled) {
		box-shadow: 0 4px 10px rgba(44, 40, 34, 0.08);
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
			border-color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.choice.flash-wrong {
		border-color: var(--danger);
		background: var(--danger-soft);
		animation: shake 0.4s ease;
	}
	.choice.flash-correct {
		border-color: var(--accent);
		background: var(--accent-soft);
		animation: judge-pop var(--dur-judge) var(--ease-pop);
	}
	.choice:hover:not(:disabled) {
		border-color: var(--accent);
		background: #fff;
		transform: translateY(-1px);
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
	/* 판정은 색만으로 알리지 않는다 — 아이콘 모양과 움직임을 함께 쓴다(색각 이상 대응) */
	.feedback {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 16px;
		padding: 13px 16px;
		border-radius: 13px;
		font-size: 16px;
		font-weight: 800;
		border: 1.5px solid transparent;
		word-break: keep-all;
	}
	.feedback.correct {
		background: var(--accent-soft);
		border-color: #cfe6d8;
		color: #1f6b41;
		animation: judge-pop var(--dur-judge) var(--ease-pop);
	}
	.feedback.wrong {
		background: var(--danger-soft);
		border-color: var(--danger-border);
		color: #9c2f22;
		animation: shake 0.4s ease;
	}
	.feedback.giveup {
		background: var(--giveup-soft);
		border-color: var(--giveup-border);
		color: #8a5f1f;
		animation: judge-fade var(--dur-move) var(--ease-out);
	}
	@keyframes judge-pop {
		0% {
			transform: scale(0.93);
			opacity: 0;
		}
		55% {
			transform: scale(1.035);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
	@keyframes judge-fade {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		18% {
			transform: translateX(-7px);
		}
		38% {
			transform: translateX(6px);
		}
		62% {
			transform: translateX(-4px);
		}
		82% {
			transform: translateX(2px);
		}
	}
	.explain {
		border-radius: 12px;
		padding: 18px;
		margin-top: 16px;
		font-size: 15px;
		line-height: 1.7;
		word-break: keep-all;
		animation: judge-fade var(--dur-move) var(--ease-out);
	}
	.explain-head {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 12.5px;
		font-weight: 800;
		letter-spacing: 0.3px;
		margin-bottom: 10px;
	}
	.explain.win {
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		color: #2c4d3b;
	}
	.explain.win .explain-head {
		color: #1f6b41;
	}
	.explain.win :global(b) {
		color: var(--accent);
	}
	.explain.giveup {
		background: var(--giveup-soft);
		border: 1px solid var(--giveup-border);
		color: #6b4d1c;
	}
	.explain.giveup .explain-head {
		color: var(--giveup);
	}
	.explain.giveup :global(b) {
		color: #8a5f1f;
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		font-size: 32px;
		font-weight: 900;
		color: var(--accent-2);
		font-variant-numeric: tabular-nums;
	}
	.streak-none {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		word-break: keep-all;
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
	/* ---- 랜딩 / 트랙 허브 ---- */
	.landing {
		text-align: center;
		padding: 26px 0 6px;
	}
	.l-h1 {
		font-size: clamp(26px, 5vw, 38px);
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.25;
		word-break: keep-all;
	}
	.l-sub {
		margin-top: 10px;
		font-size: 14.5px;
		color: var(--muted);
		font-weight: 600;
	}
	.tracks {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
		gap: 14px;
		margin: 18px 0 0;
	}
	.track {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 9px;
		text-align: left;
		text-decoration: none;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 18px;
		cursor: pointer;
		font-family: inherit;
		transition:
			transform 0.16s var(--ease-out),
			box-shadow 0.2s var(--ease-out),
			border-color var(--dur-tap) var(--ease-out);
	}
	.track:hover {
		transform: translateY(-3px);
		border-color: var(--accent);
		box-shadow: 0 10px 24px rgba(44, 40, 34, 0.11);
	}
	.track:active {
		transform: translateY(0) scale(0.995);
	}
	.track.cleared {
		border-color: #cfe6d8;
		background: linear-gradient(180deg, var(--accent-soft), var(--panel) 46%);
	}
	.t-top {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 16px;
		font-weight: 800;
	}
	.t-desc {
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.55;
		word-break: keep-all;
	}
	.t-peek {
		background: var(--panel-2);
		border: 1px dashed var(--border-strong);
		border-radius: 10px;
		padding: 11px;
		font-size: 12.5px;
		line-height: 1.7;
		white-space: pre-wrap;
		color: #6f6555;
		font-variant-numeric: tabular-nums;
	}
	.t-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		font-weight: 800;
		color: var(--accent);
	}
	.t-dots {
		display: flex;
		gap: 4px;
	}
	.t-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--border-strong);
	}
	.t-dot.on {
		background: var(--accent);
	}
	.t-go {
		opacity: 0.85;
	}
	.b-back {
		background: none;
		border: none;
		font-family: inherit;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
		padding: 6px 10px;
		border-radius: 999px;
		transition:
			color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out);
	}
	.b-back:hover {
		color: var(--text);
		background: var(--panel-2);
	}
</style>
