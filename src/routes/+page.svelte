<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
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

	let {
		data
	}: {
		data: {
			dayNum: number;
			totalProblems: number;
			counts: { discover: number; trivia: number; match: number };
		};
	} = $props();

	// SSR 시점 날짜(FOUC·크롤러 stale 방지). 클라이언트에서 자정을 넘겼는지 다시 확인한다.
	// svelte-ignore state_referenced_locally
	let dayNum = $state(data.dayNum ?? 0);

	type Phase = 'home' | 'play' | 'done';
	let phase = $state<Phase>('home');
	let loading = $state(false);

	/** 세션에 올라가는 한 문제. 성냥개비는 Problem이 아니라 등식 한 쌍이다. */
	type Item = {
		kind: DailyKind;
		bonus: boolean;
		problem?: Problem;
		eq?: { displayed: string; solution: string };
	};
	let queue = $state<Item[]>([]);
	let pos = $state(0);
	let marks = $state<Mark[]>([]);

	// 한 문제를 푸는 동안의 상태
	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let startedAt = $state(0);
	let elapsedMs = $state(0);
	let judged = $state(false);
	let answerValue = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let picked = $state<number | null>(null);

	// 성냥개비 전용
	let mOrig = $state<Board | null>(null);
	let mCur = $state<Board | null>(null);
	let mPicked = $state<PickLoc | null>(null);
	let mMisses = $state(0);
	let mRevertTimer: ReturnType<typeof setTimeout>;

	let countdown = $state('');
	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	let current = $derived(
		queue[pos]
			? { ...queue[pos], problem: queue[pos].problem ? displayChoices(queue[pos].problem!) : undefined }
			: undefined
	);
	let shownHints = $derived(current?.problem?.hints ? current.problem.hints.slice(0, hintsUsed) : []);
	let correctCount = $derived(marks.filter((m) => m !== 'miss').length);
	let puzzleNo = $derived(puzzleNumber(dayNum));

	const KIND_LABEL: Record<DailyKind, string> = { discover: '발견', trivia: '상식', match: '성냥' };

	/** 상단 유형 칩: "발견 · 2/3" — 같은 유형 안에서 몇 번째인지 */
	let typeChip = $derived.by(() => {
		const c = queue[pos];
		if (!c) return '';
		if (c.bonus) return '보너스 · 마지막 문제';
		const same = queue.filter((q) => q.kind === c.kind && !q.bonus);
		const nth = queue.slice(0, pos + 1).filter((q) => q.kind === c.kind && !q.bonus).length;
		return `${KIND_LABEL[c.kind]} · ${nth}/${same.length}`;
	});

	/** 결과 화면 행: 유형 3개 + 보너스. 보너스를 유형에 합치면 "발견형 4"처럼 보여 10문제 구성이 어긋난다. */
	let resultRows = $derived.by(() => {
		const base: Record<string, { label: string; ok: number; total: number }> = {
			discover: { label: '발견형', ok: 0, total: 0 },
			trivia: { label: '상식', ok: 0, total: 0 },
			match: { label: '성냥개비', ok: 0, total: 0 },
			bonus: { label: '보너스', ok: 0, total: 0 }
		};
		queue.forEach((q, i) => {
			const row = base[q.bonus ? 'bonus' : q.kind];
			row.total += 1;
			if (marks[i] && marks[i] !== 'miss') row.ok += 1;
		});
		return Object.values(base).filter((r) => r.total > 0);
	});

	/** epoch day → "7월 27일 월요일" (KST 정오 기준으로 안전하게 변환) */
	let todayLabel = $derived.by(() => {
		const d = new Date(dayNum * 86400000 - 9 * 3600 * 1000 + 43200000);
		const w = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
		return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${w}요일`;
	});

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
		picked = null;
		clearTimeout(mRevertTimer);
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
		if (
			browser &&
			it &&
			!it.eq &&
			it.problem?.type !== 'choice' &&
			window.matchMedia?.('(hover: hover)').matches
		) {
			tick().then(() => inputEl?.focus());
		}
	}

	/* ───────── 판정 ───────── */

	function settle(mark: Mark, msg: string, ok: boolean) {
		if (judged) return;
		judged = true;
		marks = [...marks.slice(0, pos), mark, ...marks.slice(pos + 1)];
		feedback = { msg, ok };
		recordSolve(ok, hintsUsed);
		persist();
	}

	function submitText() {
		if (judged || !current?.problem || !answerValue.trim()) return;
		if (isCorrectText(current.problem, answerValue)) {
			settle(hintsUsed === 0 && wrongAttempts === 0 ? 'clean' : 'hinted', '정답이에요', true);
		} else {
			wrongAttempts += 1;
			feedback = isCloseAnswer(current.problem, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}

	function submitChoice(i: number) {
		if (judged || !current?.problem) return;
		picked = i;
		const ok = i === current.problem.answerIndex;
		if (ok) settle(wrongAttempts === 0 ? 'clean' : 'hinted', '정답이에요', true);
		else {
			wrongAttempts += 1;
			// 한 번 더 고를 기회를 주고, 두 번째도 틀리면 정답을 공개한다
			if (wrongAttempts >= 2) settle('miss', '정답을 확인했어요', false);
			else feedback = { msg: '아쉬워요 — 한 번 더 골라볼까요?', ok: false };
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
			mCur = parseEq(current.eq.solution);
			mPicked = null;
		}
		settle('miss', '정답을 확인했어요', false);
	}

	/* ───────── 성냥개비 ───────── */

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
		if (isSolved(mOrig, mCur)) settle(mMisses === 0 ? 'clean' : 'hinted', '정답이에요', true);
		else {
			mMisses += 1;
			feedback = { msg: '아직 아니에요 — 되돌릴게요', ok: false };
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

	/* ───────── 진행 ───────── */

	function next() {
		if (pos + 1 < queue.length) {
			pos += 1;
			persist();
			resetProblem();
		} else {
			phase = 'done';
			persist(true);
			completeDailySession(dayNum);
			if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function quit() {
		persist();
		phase = 'home';
		savedProgress = readDailyProgress(dayNum);
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/* ───────── 공유 ───────── */

	let shareText = $derived(
		`딸깍 — 오늘 ${correctCount}/${DAILY_SIZE} 맞혔어요\n오늘의 10문제, 당신은 몇 개 맞힐까요?\n${browser ? location.origin : ''}/?ref=daily`
	);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareText);
			toast('결과가 복사됐어요 (링크 포함)');
		} catch {
			toast('복사에 실패했어요');
		}
	}

	async function shareNative() {
		const outcome = await shareResult(
			{
				title: `딸깍 #${puzzleNo}`,
				scoreLabel: `${correctCount} / ${DAILY_SIZE}`,
				emojiRow: '',
				subLine: `${todayLabel}의 10문제`,
				cta: '너도 오늘 문제 풀어볼래?'
			},
			shareText
		);
		toast(outcomeMessage(outcome));
	}

	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 1800);
	}

	/* ───────── 초기화 ───────── */

	let savedProgress = $state({ pos: 0, marks: [] as Mark[], done: false });
	let resumable = $derived(savedProgress.pos > 0 && !savedProgress.done);

	onMount(() => {
		dayNum = kstDayNumber(Date.now());
		savedProgress = readDailyProgress(dayNum);
		marks = savedProgress.marks;
		pos = savedProgress.pos;
		if (savedProgress.done) phase = 'done';

		const iv = setInterval(() => {
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
			// KST 자정까지 남은 시간
			const now = new Date();
			const kst = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
			const nextMid = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1);
			const diff = Math.max(0, nextMid - kst.getTime());
			const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
			const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
			const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
			countdown = `${h}:${m}:${s}`;
		}, 1000);
		return () => clearInterval(iv);
	});
</script>

<svelte:head>
	<title>딸깍 — 매일 새로 열리는 두뇌 퍼즐 10문제</title>
	<meta
		name="description"
		content="하루 10문제. 발견형 퍼즐 3 · 상식 퀴즈 3 · 성냥개비 3 · 보너스 1. 매일 자정에 새로 열리고, 그날은 모두 같은 문제를 풉니다."
	/>
	<meta property="og:title" content="딸깍 — 매일 새로 열리는 두뇌 퍼즐 10문제" />
	<meta
		property="og:description"
		content="하루 10문제. 발견형 퍼즐 3 · 상식 퀴즈 3 · 성냥개비 3 · 보너스 1."
	/>
</svelte:head>

{#if phase === 'home'}
	<div class="home-panel">
	<div class="hero">
		<div class="date">{todayLabel}</div>
		<div class="countdown">다음 문제까지 {countdown || '--:--:--'}</div>
	</div>

	{#if resumable}
		<div class="ticks" aria-label="{savedProgress.pos}문제까지 풀었어요">
			{#each Array(DAILY_SIZE) as _, i (i)}
				<span
					class="tick"
					class:done={i < savedProgress.marks.length}
					class:current={i === savedProgress.pos}
				></span>
			{/each}
		</div>
	{/if}

	<button class="cta" onclick={startOrResume} disabled={loading}>
		{#if loading}
			불러오는 중…
		{:else if resumable}
			<span class="cta-main">이어서 풀기</span>
			<span class="cta-sub">{savedProgress.pos} / {DAILY_SIZE}문제 진행 중</span>
		{:else}
			오늘의 10문제 시작하기
		{/if}
	</button>

	<p class="composition">발견 3 · 상식 3 · 성냥 3 · 보너스 1</p>
	<p class="total">누적 {data.totalProblems.toLocaleString()}문제 중 오늘의 10문제</p>
	</div>
{:else if phase === 'play' && current}
	<div class="topbar">
		<button class="exit" onclick={quit}>나가기</button>
		<span class="type-chip" class:bonus={current.bonus}>{typeChip}</span>
	</div>

	<div class="ticks" aria-label="{pos + 1}번째 문제 / 총 {queue.length}문제">
		{#each Array(queue.length) as _, i (i)}
			<span class="tick" class:done={!!marks[i]} class:current={i === pos}></span>
		{/each}
	</div>

	{#key pos}
		<section class="card" class:bonus={current.bonus}>
			{#if current.problem?.chip && !current.bonus}
				<span class="cat-chip">{current.problem.chip}</span>
			{:else if current.bonus}
				<span class="cat-chip gold">마지막 한 문제예요</span>
			{/if}

			<div class="q">
				{#if current.eq && mCur}
					<div class="board-wrap">
						<MatchstickBoard
							board={mCur}
							picked={mPicked}
							onstick={handleStick}
							label={current.eq.displayed.replace('-', '−')}
						/>
					</div>
					<p class="guide">
						{mPicked ? '빈 자리를 짚어 내려놓으세요.' : '옮길 획을 짚어보세요.'}
					</p>
				{:else if current.problem}
					{#each current.problem.blocks as b, i (i)}
						{#if b.kind === 'text'}
							<div class="qtext">{@html b.html}</div>
						{:else if b.kind === 'pre'}
							<pre class="qpre">{b.text}</pre>
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
				{#if current.problem.type === 'choice'}
					<div class="choices">
						{#each current.problem.choices ?? [] as c, i (i)}
							<button
								class="choice"
								class:ok={judged && i === current.problem.answerIndex}
								class:bad={picked === i && i !== current.problem.answerIndex}
								disabled={judged}
								onclick={() => submitChoice(i)}
							>
								<span class="badge">{['A', 'B', 'C', 'D', 'E'][i]}</span>
								<span class="ctext">{c}</span>
								{#if judged && i === current.problem.answerIndex}<span class="mark">✓</span>
								{:else if picked === i && i !== current.problem.answerIndex}<span class="mark bad"
										>✕</span
									>{/if}
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

			{#if !judged && current.problem?.hints}
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
								: '조금만 더'}
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
				<div class="explain">
					<b>해설</b>
					{#if current.eq}
						성냥 하나만 옮겨 <b>{current.eq.solution.replace('-', '−')}</b>을 만들면 참이 됩니다.
					{:else if current.problem}
						{@html current.problem.explain}
					{/if}
				</div>
				<button class="submit" onclick={next}>
					{pos + 1 < queue.length ? '다음' : '결과 보기'}
				</button>
			{:else if current.eq}
				<div class="dual">
					<button class="ghost" disabled={!mPicked} onclick={resetBoard}>처음부터</button>
					<button class="ghost" onclick={giveUp}>모르겠어요</button>
				</div>
			{:else if current.problem?.type === 'choice'}
				<button class="ghost wide" onclick={giveUp}>모르겠어요</button>
			{:else}
				<div class="dual">
					<button class="ghost" onclick={giveUp}>모르겠어요</button>
					<button class="submit inline" onclick={submitText}>확인</button>
				</div>
			{/if}
		</section>
	{/key}
{:else if phase === 'done'}
	<div class="title">오늘의 결과</div>
	<div class="score">
		<span class="num">{correctCount}</span><span class="rest"> / {DAILY_SIZE} 정답</span>
	</div>

	<div class="rows">
		{#each resultRows as r (r.label)}
			<div class="row">
				<span class="label">{r.label}</span>
				<span class="frac" class:ok={r.ok === r.total} class:bad={r.ok < r.total}>
					{r.ok} / {r.total}
				</span>
			</div>
		{/each}
	</div>

	<p class="share-label">결과 공유</p>
	<div class="share-btns">
		<button class="btn-primary" onclick={copyLink}>링크 복사</button>
		<button class="btn-outline" onclick={shareNative}>공유하기</button>
	</div>

	<a class="cta link" href="/play">무한 연습하러 가기</a>
	<p class="next-day">내일 10문제까지 {countdown || '--:--:--'}</p>
{/if}

{#if toastMsg}
	<div class="toast" role="status">{toastMsg}</div>
{/if}

<style>
	/* ── 홈 ── */
	/* 모바일에서는 배경 위에 그대로 얹고(카드 없음), 데스크톱에서만 판을 깐다.
	   넓은 화면에서 글자만 떠 있으면 화면이 버려진 것처럼 보인다. */
	.home-panel {
		display: contents;
	}
	@media (min-width: 768px) {
		.home-panel {
			display: block;
			background: var(--panel);
			border: 1px solid var(--border-strong);
			border-radius: 22px;
			padding: 46px 40px 38px;
		}
		.date {
			font-size: 36px;
		}
		.cta {
			min-height: 68px;
			font-size: 19px;
		}
	}
	.hero {
		text-align: center;
		margin-bottom: 22px;
	}
	.date {
		font-size: 30px;
		font-weight: 800;
		letter-spacing: -0.3px;
	}
	.countdown {
		display: inline-block;
		margin-top: 10px;
		padding: 6px 14px;
		border-radius: 999px;
		background: var(--panel-2);
		color: var(--accent-2);
		font-size: 13px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.cta {
		display: block;
		width: 100%;
		min-height: 64px;
		border-radius: 16px;
		background: var(--accent);
		color: #fff;
		font-size: 18px;
		font-weight: 800;
		border: none;
		box-shadow: 0 6px 0 var(--accent-press);
		cursor: pointer;
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
		text-align: center;
		text-decoration: none;
		padding: 12px;
	}
	.cta:active {
		transform: translateY(3px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.cta:hover {
		filter: brightness(1.03);
	}
	.cta:disabled {
		background: var(--border-strong);
		color: var(--muted-2);
		box-shadow: none;
		cursor: default;
	}
	.cta-main {
		display: block;
		font-size: 18px;
	}
	.cta-sub {
		display: block;
		font-size: 12.5px;
		font-weight: 600;
		opacity: 0.85;
		margin-top: 2px;
	}
	.composition {
		text-align: center;
		margin-top: 16px;
		font-size: 13px;
		color: var(--muted);
		font-weight: 600;
	}
	.total {
		text-align: center;
		margin-top: 6px;
		font-size: 12px;
		color: var(--muted-2);
	}

	/* ── 진행 틱 ── */
	.ticks {
		display: flex;
		gap: 5px;
		margin-bottom: 18px;
	}
	.tick {
		flex: 1;
		height: 7px;
		border-radius: 3px;
		border: 1px solid var(--border);
		background: transparent;
	}
	.tick.done {
		background: var(--accent);
		border: none;
	}
	.tick.current {
		border: 2px solid var(--accent-2);
	}

	/* ── 세션 ── */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	.exit {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 0;
	}
	.type-chip {
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--text);
		padding: 4px 10px;
		border-radius: 999px;
	}
	.type-chip.bonus {
		background: var(--gold-bg);
		color: var(--gold-text);
	}
	.card {
		border: 1px solid var(--border-strong);
		background: var(--panel);
		border-radius: 18px;
		padding: 18px;
	}
	.card.bonus {
		border: 2px dashed var(--gold);
	}
	.cat-chip {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--muted);
		padding: 3px 9px;
		border-radius: 999px;
	}
	.cat-chip.gold {
		background: var(--gold-bg);
		color: var(--gold-text);
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
	.qpre {
		font-size: 16px;
		line-height: 1.6;
		white-space: pre-wrap;
		font-family: inherit;
	}
	.board-wrap {
		margin-top: 2px;
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
		/* 16px 미만이면 모바일 사파리가 포커스 시 자동 확대해 레이아웃이 깨진다 */
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
		gap: 8px;
		margin-top: 16px;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		cursor: pointer;
		text-align: left;
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
		font-size: 12px;
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
	.choice .mark {
		font-weight: 800;
		color: var(--accent);
	}
	.choice .mark.bad {
		color: var(--danger);
	}
	.choice.ok {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.choice.bad {
		border-color: var(--danger);
		background: var(--danger-bg);
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
		border-radius: 999px;
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
		animation: rise var(--dur-move) ease;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
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

	.submit {
		width: 100%;
		height: 52px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		border: none;
		margin-top: 16px;
		cursor: pointer;
		box-shadow: 0 6px 0 var(--accent-press);
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
		font-family: inherit;
	}
	.submit:active {
		transform: translateY(3px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.submit.inline {
		flex: 2;
		margin-top: 0;
	}
	.dual {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
	.ghost {
		flex: 1;
		height: 52px;
		border-radius: 14px;
		background: transparent;
		border: 1px solid var(--border-strong);
		color: var(--text);
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
	}
	.ghost:hover {
		background: var(--panel-2);
	}
	.ghost:disabled {
		color: var(--muted-2);
		cursor: default;
	}
	.ghost.wide {
		width: 100%;
		margin-top: 16px;
	}

	/* ── 결과 ── */
	.title {
		text-align: center;
		font-size: 14px;
		font-weight: 700;
		color: var(--muted);
		margin-bottom: 6px;
	}
	.score {
		text-align: center;
		font-size: 46px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.score .num {
		color: var(--accent);
	}
	.score .rest {
		color: var(--muted-2);
		font-size: 24px;
		font-weight: 700;
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 20px;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		padding: 11px 14px;
	}
	.row .label {
		font-size: 14px;
		font-weight: 700;
	}
	.frac {
		font-size: 14px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.frac.ok {
		color: var(--accent);
	}
	.frac.bad {
		color: var(--danger);
	}
	.share-label {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		margin: 22px 0 10px;
	}
	.share-btns {
		display: flex;
		gap: 8px;
	}
	.btn-primary,
	.btn-outline {
		flex: 1;
		height: 48px;
		border-radius: 12px;
		font-size: 14px;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-primary {
		background: var(--accent);
		color: #fff;
		font-weight: 800;
		border: none;
		box-shadow: 0 6px 0 var(--accent-press);
	}
	.btn-outline {
		background: transparent;
		color: var(--text);
		font-weight: 700;
		border: 1px solid var(--border-strong);
	}
	.cta.link {
		margin-top: 18px;
		min-height: 56px;
		font-size: 16px;
		line-height: 32px;
	}
	.next-day {
		text-align: center;
		margin-top: 12px;
		font-size: 12px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}

	.toast {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--text);
		color: #fff;
		font-size: 13px;
		font-weight: 600;
		padding: 10px 18px;
		border-radius: 999px;
		z-index: 60;
	}
</style>
