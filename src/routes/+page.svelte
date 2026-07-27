<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser, dev } from '$app/environment';
	import type { Problem } from '$lib/problems';
	import {
		kstDayNumber,
		puzzleNumber,
		buildDailySet,
		DAILY_SIZE,
		MATCH_TOTAL,
		isCorrectText,
		isCloseAnswer,
		hintUnlocked,
		displayChoices,
		recordSolve,
		readDailyProgress,
		writeDailyProgress,
		completeDailySession,
		MARK_EMOJI,
		type Mark,
		type DailyKind
	} from '$lib/game';
	import { shareResult, outcomeMessage } from '$lib/shareCard';
	import { parseEq, cloneBoard, isSolved, bit, type Board } from '$lib/matchstick';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		data
	}: {
		data: { dayNum: number; totalProblems: number; counts: { discover: number; trivia: number; match: number } };
	} = $props();

	// SSR 시점 날짜(FOUC·크롤러 stale 방지). 클라이언트에서 자정을 넘겼는지 다시 확인한다.
	// svelte-ignore state_referenced_locally
	let dayNum = $state(data.dayNum ?? 0);

	type Phase = 'home' | 'play' | 'done';
	let phase = $state<Phase>('home');
	let loading = $state(false);

	/** 세션에 실제로 올라가는 한 문제. 성냥개비는 Problem이 아니라 등식 한 쌍이다. */
	type Item = {
		kind: DailyKind;
		bonus: boolean;
		problem?: Problem;
		eq?: { displayed: string; solution: string };
	};
	let queue = $state<Item[]>([]);
	let pos = $state(0);
	let marks = $state<Mark[]>([]);
	let streakDays = $state(0);
	let playedCount = $state(0);

	// 한 문제를 푸는 동안의 상태
	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let startedAt = $state(0);
	let elapsedMs = $state(0);
	let judged = $state(false);
	let answerValue = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let judge = $state<'correct' | 'wrong' | 'giveup' | null>(null);
	let inputState = $state<'idle' | 'wrong' | 'correct'>('idle');
	let flashIndex = $state<number | null>(null);
	let flashKind = $state<'wrong' | 'correct' | null>(null);
	let flashTimer: ReturnType<typeof setTimeout>;

	// 성냥개비 전용
	let mOrig = $state<Board | null>(null);
	let mCur = $state<Board | null>(null);
	let mPicked = $state<PickLoc | null>(null);
	let mMisses = $state(0);
	let mShaking = $state(false);
	let mRevertTimer: ReturnType<typeof setTimeout>;

	let countdown = $state('');
	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	let current = $derived(queue[pos] ? { ...queue[pos], problem: queue[pos].problem ? displayChoices(queue[pos].problem!) : undefined } : undefined);
	let shownHints = $derived(current?.problem?.hints ? current.problem.hints.slice(0, hintsUsed) : []);
	let correctCount = $derived(marks.filter((m) => m !== 'miss').length);
	let cleanCount = $derived(marks.filter((m) => m === 'clean').length);
	let puzzleNo = $derived(puzzleNumber(dayNum));

	const KIND_LABEL: Record<DailyKind, string> = {
		discover: '발견형',
		trivia: '상식',
		match: '성냥개비'
	};

	/* ───────── 진행 저장·복원 ───────── */

	function persist(done = false) {
		writeDailyProgress(dayNum, { pos, marks, done });
	}

	/** 문제은행은 첫 화면에 필요 없다. 시작을 누른 순간에만 내려받아 홈을 가볍게 유지한다. */
	async function loadBank() {
		const [p, t, m] = await Promise.all([
			import('$lib/problems'),
			import('$lib/trivia'),
			import('$lib/data/matchstick-problems.json')
		]);
		const eqs = (m.default ?? m) as { displayed: string; solution: string }[];
		const picks = buildDailySet(
			p.PROBLEMS,
			t.TRIVIA,
			MATCH_TOTAL,
			dayNum,
			(x) => p.fieldOfChip(x.chip),
			(x) => x.category ?? '기타'
		);
		queue = picks.map((pick) => ({
			kind: pick.kind,
			bonus: !!pick.bonus,
			problem:
				pick.kind === 'discover'
					? p.PROBLEMS[pick.index]
					: pick.kind === 'trivia'
						? t.TRIVIA[pick.index]
						: undefined,
			eq: pick.kind === 'match' ? eqs[pick.index] : undefined
		}));
	}

	async function startOrResume() {
		if (loading) return;
		loading = true;
		try {
			if (!queue.length) await loadBank();
			const saved = readDailyProgress(dayNum);
			pos = Math.min(saved.pos, queue.length - 1);
			marks = saved.marks.slice(0, queue.length);
			phase = saved.done ? 'done' : 'play';
			if (phase === 'play') resetProblem();
		} finally {
			loading = false;
		}
	}

	function resetProblem() {
		hintsUsed = 0;
		wrongAttempts = 0;
		startedAt = Date.now();
		elapsedMs = 0;
		judged = false;
		answerValue = '';
		feedback = null;
		judge = null;
		inputState = 'idle';
		flashIndex = null;
		flashKind = null;
		clearTimeout(mRevertTimer);
		mShaking = false;
		mMisses = 0;
		mPicked = null;
		const it = queue[pos];
		if (it?.eq) {
			mOrig = parseEq(it.eq.displayed);
			mCur = cloneBoard(mOrig);
		} else {
			mOrig = null;
			mCur = null;
		}
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
		if (browser && it && !it.eq && it.problem?.type !== 'choice' && window.matchMedia?.('(hover: hover)').matches) {
			tick().then(() => inputEl?.focus());
		}
	}

	function flash(kind: 'wrong' | 'correct', idx?: number) {
		clearTimeout(flashTimer);
		if (idx !== undefined) {
			flashIndex = idx;
			flashKind = kind;
		} else inputState = kind;
		flashTimer = setTimeout(
			() => {
				flashIndex = null;
				flashKind = null;
				inputState = 'idle';
			},
			kind === 'wrong' ? 420 : 600
		);
	}

	/* ───────── 판정 ───────── */

	function settle(mark: Mark, msg: string, ok: boolean) {
		if (judged) return;
		judged = true;
		judge = ok ? 'correct' : mark === 'miss' ? 'giveup' : 'wrong';
		marks = [...marks.slice(0, pos), mark, ...marks.slice(pos + 1)];
		feedback = { msg, ok };
		recordSolve(ok, hintsUsed);
		persist();
	}

	function submitText() {
		if (judged || !current?.problem || !answerValue.trim()) return;
		if (isCorrectText(current.problem, answerValue)) {
			flash('correct');
			settle(hintsUsed === 0 && wrongAttempts === 0 ? 'clean' : 'hinted', '정답이에요', true);
		} else {
			wrongAttempts += 1;
			flash('wrong');
			judge = 'wrong';
			feedback = isCloseAnswer(current.problem, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}

	function submitChoice(i: number) {
		if (judged || !current?.problem) return;
		const ok = i === current.problem.answerIndex;
		flash(ok ? 'correct' : 'wrong', i);
		if (ok) settle(wrongAttempts === 0 ? 'clean' : 'hinted', '정답이에요', true);
		else {
			wrongAttempts += 1;
			// 상식은 한 번 더 고를 기회를 주고, 두 번째도 틀리면 정답을 공개한다
			if (wrongAttempts >= 2) settle('miss', '정답을 확인했어요', false);
			else {
				judge = 'wrong';
				feedback = { msg: '아쉬워요 — 한 번 더 골라볼까요?', ok: false };
			}
		}
	}

	function showHint() {
		if (judged || !current?.problem?.hints || hintsUsed >= current.problem.hints.length) return;
		if (!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)) return;
		hintsUsed += 1;
	}

	function giveUp() {
		if (judged) return;
		if (current?.eq && mOrig) {
			clearTimeout(mRevertTimer);
			mShaking = false;
			mCur = parseEq(current.eq.solution);
			mPicked = null;
		}
		settle('miss', '정답을 확인했어요', false);
	}

	/* ───────── 성냥개비 조작 ───────── */

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
		if (isSolved(mOrig, mCur)) {
			settle(mMisses === 0 ? 'clean' : 'hinted', '정답이에요', true);
		} else {
			mMisses += 1;
			mShaking = true;
			judge = 'wrong';
			feedback = { msg: '아직 아니에요 — 되돌릴게요', ok: false };
			clearTimeout(mRevertTimer);
			mRevertTimer = setTimeout(() => {
				mShaking = false;
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

	/* ───────── 진행 ───────── */

	function next() {
		if (pos + 1 < queue.length) {
			pos += 1;
			persist();
			resetProblem();
		} else {
			phase = 'done';
			persist(true);
			const st = completeDailySession(dayNum);
			if (st) {
				streakDays = st.dayStreak;
				playedCount = st.played;
			}
			if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function quit() {
		persist();
		phase = 'home';
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/* ───────── 결과·공유 ───────── */

	// 보너스를 한 번에 맞혔을 때만 ⭐ — 공유 카드에서 자랑거리로 읽히게 한다.
	// (무조건 ⭐로 덮으면 마지막 문제를 맞혔는지 틀렸는지가 사라진다)
	let emojiRow = $derived(
		marks.map((m, i) => (queue[i]?.bonus && m === 'clean' ? '⭐' : MARK_EMOJI[m])).join('')
	);

	async function share() {
		const title = `딸깍 #${puzzleNo}`;
		const text = `딸깍 #${puzzleNo} — 오늘의 10문제 ${correctCount}/${DAILY_SIZE}\n${emojiRow}\n${location.origin}/?ref=daily #딸깍`;
		const outcome = await shareResult(
			{
				title,
				scoreLabel: `${correctCount} / ${DAILY_SIZE}`,
				emojiRow,
				subLine: streakDays >= 2 ? `${streakDays}일째 딸깍 중` : '매일 밤 12시에 새 10문제',
				cta: '너도 오늘 문제 풀어볼래?'
			},
			text
		);
		toast(outcomeMessage(outcome));
	}
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2400);
	}

	/* ───────── 초기화 ───────── */

	let savedProgress = $state({ pos: 0, marks: [] as Mark[], done: false });

	onMount(() => {
		dayNum = kstDayNumber(Date.now());
		savedProgress = readDailyProgress(dayNum);
		marks = savedProgress.marks;
		pos = savedProgress.pos;
		if (savedProgress.done) phase = 'done';
		try {
			const st = JSON.parse(localStorage.getItem('ddal.stats') || 'null');
			if (st) {
				streakDays = st.lastDay === dayNum || st.lastDay === dayNum - 1 ? st.dayStreak || 0 : 0;
				playedCount = st.played || 0;
			}
		} catch {
			/* 무시 */
		}

		const tick1 = setInterval(() => {
			if (phase === 'play' && !judged) elapsedMs = Date.now() - startedAt;
			// 탭을 열어둔 채 자정을 넘기면 홈에서만 새 날짜로 넘어간다.
			// 세션 중에는 날짜를 고정해 풀던 10문제가 중간에 바뀌지 않게 한다.
			if (phase !== 'play') {
				const today = kstDayNumber(Date.now());
				if (today !== dayNum) {
					dayNum = today;
					savedProgress = readDailyProgress(today);
					marks = savedProgress.marks;
					pos = savedProgress.pos;
					queue = [];
					phase = savedProgress.done ? 'done' : 'home';
				}
			}
			const now = new Date();
			const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
			const end = new Date(kst);
			end.setHours(24, 0, 0, 0);
			const left = Math.max(0, end.getTime() - kst.getTime());
			const h = String(Math.floor(left / 3600000)).padStart(2, '0');
			const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
			const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
			countdown = `${h}:${m}:${s}`;
		}, 1000);
		return () => clearInterval(tick1);
	});

	let resumable = $derived(savedProgress.pos > 0 && !savedProgress.done);
</script>

<svelte:head>
	<title>딸깍 — 매일 새로 열리는 두뇌 퍼즐 10문제</title>
	<meta
		name="description"
		content="하루 10문제. 발견형 퍼즐 3 · 상식 퀴즈 3 · 성냥개비 3 · 보너스 1. 가입 없이 바로, 오늘은 모두 같은 문제를 풉니다."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/" />
	<meta property="og:title" content="딸깍 — 매일 새로 열리는 두뇌 퍼즐 10문제" />
	<meta
		property="og:description"
		content="하루 10문제. 발견형 퍼즐 3 · 상식 퀴즈 3 · 성냥개비 3 · 보너스 1. 가입 없이 바로."
	/>
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/" />
</svelte:head>

<div class="root">
	{#if phase === 'home'}
		<!-- 첫 화면: 누를 수 있는 것은 시작 버튼 하나뿐 -->
		<section class="hero">
			<h1>오늘의 10문제</h1>
			<p class="sub">매일 밤 12시에 새로 열려요 · 막히면 힌트가 열려요</p>

			<div class="dots" aria-hidden="true">
				{#each Array(DAILY_SIZE) as _, i (i)}
					<span
						class="dot"
						class:filled={i < savedProgress.marks.length}
						class:gap={i === 3 || i === 6 || i === 9}
					></span>
				{/each}
			</div>
			<p class="compo">발견형 3 · 상식 3 · 성냥개비 3 · 보너스 1</p>

			<button class="cta" onclick={startOrResume} disabled={loading}>
				{#if loading}
					불러오는 중…
				{:else if resumable}
					이어서 풀기 · {savedProgress.pos}/{DAILY_SIZE}
				{:else}
					시작하기
				{/if}
			</button>
			<p class="note">가입 없이 바로 · 오늘은 모두 같은 문제를 풀어요</p>
			{#if streakDays >= 2}
				<div class="streak">{streakDays}일째 딸깍 중</div>
			{/if}
		</section>

		{#if playedCount < 3}
			<!-- 어떤 문제가 나오는지 보여만 준다(누를 수 없음) -->
			<section class="kinds">
				<div class="kind">
					<b>발견형</b>
					<span>예시에 숨은 규칙을 직접 찾아요. 답이 아니라 규칙을 찾는 게임이에요.</span>
				</div>
				<div class="kind">
					<b>상식 퀴즈</b>
					<span>18개 분야에서 나와요. 고르거나, 짧게 답을 적어요.</span>
				</div>
				<div class="kind">
					<b>성냥개비</b>
					<span>성냥 하나만 옮겨 식을 맞게 만들어요.</span>
				</div>
			</section>
		{/if}

		<a class="practice-line" href="/play">
			<span>더 풀고 싶다면 · 무한 연습</span>
			<em>발견형 · 상식 · 성냥개비 중 골라 계속</em>
		</a>

		<p class="trust">
			모두 합쳐 <b>{data.totalProblems.toLocaleString()}</b>문제 · 매일 자정 새로 열림 · 가입 없음
		</p>
	{:else if phase === 'play' && current}
		<!-- 세션: 상단은 진행 점과 나가기뿐 -->
		<div class="bar">
			<div class="dots small" aria-label="{pos + 1}번째 문제 / 총 {DAILY_SIZE}문제">
				{#each Array(queue.length) as _, i (i)}
					<span
						class="dot {marks[i] ?? ''}"
						class:now={i === pos}
						class:gap={i === 3 || i === 6 || i === 9}
					></span>
				{/each}
			</div>
			<span class="count">{pos + 1} / {queue.length}</span>
			<button class="x" onclick={quit} aria-label="나가기">✕</button>
		</div>

		{#key pos}
			<section class="card">
				<div class="chiprow">
					<span class="chip" class:bonus={current.bonus}>
						{current.bonus ? '보너스' : KIND_LABEL[current.kind]}
					</span>
					{#if current.problem?.chip && !current.bonus}
						<span class="subchip">{current.problem.chip}</span>
					{/if}
				</div>

				<div class="q">
					{#if current.eq && mCur}
						<p class="mq">성냥 <b>하나만</b> 옮겨 식을 참으로 만드세요.</p>
						<div class="mboard-wrap" class:shake={mShaking}>
							<MatchstickBoard
								board={mCur}
								picked={mPicked}
								onstick={handleStick}
								label={current.eq.displayed.replace('-', '−')}
							/>
						</div>
						<p class="mtip">획을 눌러 집고, 빈 자리를 눌러 놓으세요.</p>
					{:else if current.problem}
						{#each current.problem.blocks as b, i (i)}
							{#if b.kind === 'text'}
								<div class="qtext">{@html b.html}</div>
							{:else if b.kind === 'pre'}
								<pre class="qblock">{b.text}</pre>
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

				{#if current.problem && !current.eq}
					<div class="answer">
						{#if current.problem.type === 'choice'}
							<div class="choices">
								{#each current.problem.choices ?? [] as c, i (i)}
									<button
										class="choice"
										class:correct={judged && i === current.problem.answerIndex}
										class:flash-wrong={flashIndex === i && flashKind === 'wrong'}
										class:flash-correct={flashIndex === i && flashKind === 'correct'}
										disabled={judged}
										onclick={() => submitChoice(i)}>{c}</button
									>
								{/each}
							</div>
						{:else}
							<div class="input-row">
								<input
									bind:this={inputEl}
									class:flash-wrong={inputState === 'wrong'}
									class:flash-correct={inputState === 'correct'}
									placeholder="정답을 입력하세요"
									aria-label="정답 입력"
									autocomplete="off"
									bind:value={answerValue}
									disabled={judged}
									onkeydown={(e) => e.key === 'Enter' && submitText()}
								/>
								<button class="btn" disabled={judged} onclick={submitText}>제출</button>
							</div>
						{/if}
					</div>
				{/if}

				{#each shownHints as h, i (i)}
					<div class="hint"><b>힌트 {i + 1}</b>{h}</div>
				{/each}

				{#if !judged}
					<div class="controls">
						{#if current.eq}
							<button class="btn ghost" disabled={!mPicked} onclick={resetBoard}>처음부터</button>
						{:else if current.problem?.hints}
							<button
								class="btn ghost"
								disabled={hintsUsed >= 3 || !hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)}
								onclick={showHint}
							>
								{hintsUsed >= 3
									? '힌트 소진'
									: hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)
										? `힌트 (${hintsUsed + 1}/3)`
										: '조금만 더'}
							</button>
						{/if}
						<button class="btn ghost" onclick={giveUp}>모르겠어요</button>
					</div>
				{/if}

				{#if feedback && judge}
					{#key feedback.msg + judge}
						<div class="feedback {judge}" role="alert" aria-live="assertive">
							<Icon name={judge} size={20} />
							<span>{feedback.msg}</span>
						</div>
					{/key}
				{/if}

				{#if judged}
					<div class="explain" class:win={feedback?.ok}>
						<div class="explain-head">
							<Icon name={feedback?.ok ? 'correct' : 'giveup'} size={15} />
							<span>{feedback?.ok ? '정답 풀이' : '정답 공개'}</span>
						</div>
						{#if current.eq}
							성냥 하나만 옮겨 <b>{current.eq.solution.replace('-', '−')}</b>을 만들면 참이 됩니다.
						{:else if current.problem}
							{@html current.problem.explain}
						{/if}
					</div>
					<button class="btn wide" onclick={next}>
						{pos + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
					</button>
				{/if}
			</section>
		{/key}
	{:else if phase === 'done'}
		<section class="card result">
			<h2>오늘의 딸깍 #{puzzleNo} 완료</h2>
			<div class="big">{correctCount} <span>/ {DAILY_SIZE}</span></div>
			<p class="verdict">
				{correctCount === DAILY_SIZE
					? '전부 맞혔어요'
					: correctCount >= 7
						? '오늘도 딸깍'
						: '내일 다시 만나요'}
			</p>

			<div class="emoji">{emojiRow}</div>
			<p class="legend">
				{MARK_EMOJI.clean} 바로 맞힘 · {MARK_EMOJI.hinted} 힌트·재시도 · {MARK_EMOJI.miss} 못 맞힘 · ⭐ 보너스를 한 번에
			</p>
			{#if cleanCount > 0}
				<p class="legend">한 번에 맞힌 문제 {cleanCount}개</p>
			{/if}
			{#if streakDays >= 2}
				<div class="streak">{streakDays}일째 딸깍 중</div>
			{/if}

			<button class="cta" onclick={share}>결과 공유하기</button>
			<p class="note">내일 10문제까지 {countdown}</p>
		</section>

		<section class="more">
			<h3>아직 더 풀고 싶다면</h3>
			<div class="more-grid">
				<a class="more-btn" href="/play?filter=puzzle">발견형 {data.counts.discover}</a>
				<a class="more-btn" href="/play?filter=trivia">상식 {data.counts.trivia}</a>
				<a class="more-btn" href="/play?filter=match">성냥개비 {data.counts.match}</a>
				<a class="more-btn" href="/play?filter=all">전부 섞기 {data.totalProblems.toLocaleString()}</a>
			</div>
		</section>

		{#if dev}<AdSlot label="결과" />{/if}
	{/if}

	{#if toastMsg}
		<div class="toast" role="status">{toastMsg}</div>
	{/if}
</div>

<style>
	.root {
		max-width: 620px;
		margin: 0 auto;
		padding: 0 4px;
	}

	/* ── 첫 화면 ── */
	.hero {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius, 20px);
		padding: 40px 24px 32px;
		text-align: center;
		margin-top: 8px;
	}
	h1 {
		font-size: 34px;
		font-weight: 900;
		margin: 0 0 8px;
		letter-spacing: -0.5px;
	}
	.sub {
		color: var(--muted);
		font-size: 15px;
		margin: 0 0 26px;
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 7px;
		margin-bottom: 10px;
	}
	.dot {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: var(--border-strong);
		flex: none;
	}
	.dot.gap {
		margin-left: 12px;
	}
	.dot.filled {
		background: var(--accent);
	}
	.compo {
		font-size: 13px;
		color: var(--muted);
		margin: 0 0 24px;
	}
	.cta {
		width: 100%;
		padding: 18px;
		font-size: 19px;
		font-weight: 800;
		color: #fff;
		background: var(--accent);
		border: none;
		border-radius: 14px;
		cursor: pointer;
		transition: transform var(--dur-tap) var(--ease-out);
	}
	.cta:hover {
		transform: translateY(-1px);
	}
	.cta:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.note {
		font-size: 13px;
		color: var(--muted);
		margin: 12px 0 0;
	}
	.streak {
		display: inline-block;
		margin-top: 14px;
		padding: 6px 14px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 13px;
		font-weight: 800;
	}

	/* ── 어떤 문제가 나오나(누를 수 없음) ── */
	.kinds {
		margin-top: 14px;
		display: grid;
		gap: 8px;
	}
	.kind {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 13px 16px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.kind b {
		font-size: 15px;
	}
	.kind span {
		font-size: 13px;
		color: var(--muted);
		word-break: keep-all;
	}

	.practice-line {
		margin-top: 14px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 14px 16px;
		border: 1px solid var(--border);
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		background: var(--panel);
	}
	.practice-line span {
		font-size: 15px;
		font-weight: 700;
	}
	.practice-line em {
		font-style: normal;
		font-size: 13px;
		color: var(--muted);
	}
	.trust {
		text-align: center;
		font-size: 13px;
		color: var(--muted);
		margin: 20px 0 8px;
	}
	.trust b {
		font-size: 15px;
		color: var(--text);
	}

	/* ── 세션 ── */
	.bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 4px;
	}
	.dots.small {
		gap: 5px;
		justify-content: flex-start;
		flex: 1;
	}
	.dots.small .dot {
		width: 9px;
		height: 9px;
	}
	.dots.small .dot.gap {
		margin-left: 9px;
	}
	.dot.clean {
		background: var(--accent);
	}
	.dot.hinted {
		background: var(--gold);
	}
	.dot.miss {
		background: transparent;
		border: 2px solid var(--border-strong);
	}
	.dot.now {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.count {
		font-size: 13px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.x {
		background: none;
		border: none;
		font-size: 17px;
		color: var(--muted);
		cursor: pointer;
		padding: 4px 8px;
	}

	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius, 20px);
		padding: 22px 20px;
		animation: in var(--dur-move) var(--ease-out);
	}
	@keyframes in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}
	.chiprow {
		display: flex;
		gap: 6px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.chip {
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 800;
		padding: 5px 12px;
		border-radius: 999px;
	}
	.chip.bonus {
		background: var(--gold);
		color: #4a3c10;
	}
	.subchip {
		background: var(--panel-2);
		color: var(--muted);
		font-size: 12px;
		padding: 5px 10px;
		border-radius: 999px;
	}
	.q {
		min-height: 52px;
	}
	.qtext {
		font-size: 20px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.qblock {
		font-size: 17px;
		line-height: 1.6;
		white-space: pre-wrap;
		margin: 0;
	}
	.mq {
		font-size: 18px;
		margin: 0 0 12px;
		word-break: keep-all;
	}
	.mboard-wrap.shake {
		animation: shake 0.4s ease;
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
	.mtip {
		font-size: 13px;
		color: var(--muted);
		text-align: center;
		margin: 10px 0 0;
	}
	.answer {
		margin-top: 18px;
	}
	.choices {
		display: grid;
		gap: 8px;
	}
	.choice {
		padding: 15px;
		font-size: 16px;
		text-align: left;
		background: var(--panel-2);
		border: 1.5px solid var(--border);
		border-radius: 12px;
		cursor: pointer;
	}
	.choice:disabled {
		cursor: default;
	}
	.choice.correct {
		border-color: var(--accent);
		background: var(--accent-soft);
		font-weight: 800;
	}
	.choice.flash-wrong {
		border-color: var(--danger);
		background: var(--danger-soft);
		animation: shake 0.4s ease;
	}
	.choice.flash-correct {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.input-row {
		display: flex;
		gap: 8px;
	}
	.input-row input {
		flex: 1;
		min-width: 0;
		padding: 14px;
		font-size: 16px;
		border: 1.5px solid var(--border-strong);
		border-radius: 12px;
		background: #fff;
	}
	.input-row input.flash-wrong {
		border-color: var(--danger);
		animation: shake 0.4s ease;
	}
	.input-row input.flash-correct {
		border-color: var(--accent);
	}
	.btn {
		padding: 14px 20px;
		font-size: 15px;
		font-weight: 700;
		border-radius: 12px;
		border: none;
		background: var(--accent);
		color: #fff;
		cursor: pointer;
	}
	.btn.ghost {
		background: transparent;
		color: var(--muted);
		border: 1.5px solid var(--border);
	}
	.btn.ghost:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.btn.wide {
		width: 100%;
		margin-top: 14px;
		padding: 16px;
		font-size: 16px;
	}
	.controls {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
	.hint {
		background: #fbf3dd;
		border-left: 3px solid var(--gold);
		border-radius: 8px;
		padding: 12px 15px;
		font-size: 15px;
		margin-top: 12px;
		line-height: 1.6;
		color: #6a5f48;
	}
	.hint b {
		display: block;
		font-size: 12px;
		margin-bottom: 3px;
	}
	.feedback {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
		padding: 12px 15px;
		border-radius: 12px;
		font-weight: 700;
		font-size: 15px;
	}
	.feedback.correct {
		background: var(--accent-soft);
		color: var(--accent);
	}
	.feedback.wrong {
		background: var(--danger-soft);
		color: #9c2f22;
		animation: shake 0.4s ease;
	}
	.feedback.giveup {
		background: var(--giveup-soft);
		color: var(--giveup);
	}
	.explain {
		margin-top: 14px;
		padding: 15px 17px;
		border-radius: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		font-size: 15px;
		line-height: 1.75;
		word-break: keep-all;
	}
	.explain.win {
		background: var(--accent-soft);
		border-color: #cfe3d6;
	}
	.explain-head {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
		margin-bottom: 7px;
	}

	/* ── 결과 ── */
	.result {
		text-align: center;
		margin-top: 8px;
	}
	.result h2 {
		font-size: 19px;
		margin: 0 0 14px;
		color: var(--muted);
		font-weight: 700;
	}
	.big {
		font-size: 54px;
		font-weight: 900;
		line-height: 1;
	}
	.big span {
		font-size: 24px;
		color: var(--muted);
	}
	.verdict {
		font-size: 17px;
		font-weight: 800;
		margin: 10px 0 20px;
	}
	.emoji {
		font-size: 25px;
		letter-spacing: 3px;
		word-break: break-all;
	}
	.legend {
		font-size: 12px;
		color: var(--muted);
		margin: 8px 0 0;
		word-break: keep-all;
	}
	.result .cta {
		margin-top: 22px;
	}

	.more {
		margin-top: 16px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius, 20px);
		padding: 20px;
	}
	.more h3 {
		font-size: 16px;
		margin: 0 0 12px;
		text-align: center;
	}
	.more-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.more-btn {
		padding: 15px 10px;
		text-align: center;
		background: var(--panel-2);
		border: 1.5px solid var(--border);
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		font-weight: 700;
		font-size: 14px;
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: 26px;
		transform: translateX(-50%);
		background: #2c2822;
		color: #fff;
		padding: 12px 18px;
		border-radius: 999px;
		font-size: 14px;
		z-index: 60;
	}

	@media (max-width: 420px) {
		h1 {
			font-size: 29px;
		}
		.hero {
			padding: 32px 18px 26px;
		}
		.card {
			padding: 18px 15px;
		}
	}
</style>
