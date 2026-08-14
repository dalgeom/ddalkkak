<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { Problem } from '$lib/problems';
	import {
		kstDayNumber,
		puzzleNumber,
		buildDailySetStable,
		DAILY_SIZE,
		MATCH_TOTAL,
		isCorrectText,
		isCloseAnswer,
		hintUnlocked,
		displayChoices,
		recordSolve,
		readDailyProgress,
		writeDailyProgress,
		hasPlayedBefore,
		completeDailySession,
		formatDuration,
		bestDailyTime,
		dailyKindOrder,
		CUBE_TOTAL,
		type DailyProgress,
		type Mark,
		type DailyKind
	} from '$lib/game';
	import { shareResult, outcomeMessage } from '$lib/shareCard';
	import { weekOf, readDayRecord } from '$lib/record';
	import { bankSizesAt } from '$lib/bankHistory';
	import { logoClicks } from '$lib/nav';
	import { track } from '$lib/analytics';
	import { parseEq, cloneBoard, isSolved, bit, type Board } from '$lib/matchstick';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import CubeNetFigure from '$lib/components/CubeNetFigure.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import CubeFold from '$lib/components/CubeFold.svelte';
	import { FACES as CUBE_FACES, type CubeNetProblem } from '$lib/cubenet';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import ExampleList from '$lib/components/ExampleList.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Bulb from '$lib/components/Bulb.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import InstallHint from '$lib/components/InstallHint.svelte';

	type Sample = {
		chip: string;
		blocks: Problem['blocks'];
		type: 'text' | 'choice';
		answers: string[];
		choices: string[];
		answerIndex: number;
		explain: string;
	};
	let {
		data
	}: {
		data: {
			dayNum: number;
			sample: Sample | null;
			categories: { slug: string; name: string; count: number }[];
			// 레이아웃 서버 로드가 합쳐 내려주는 실제 문제 수
			counts: { discover: number; trivia: number; match: number; cube: number };
		};
	} = $props();

	// SSR 시점 날짜(FOUC·크롤러 stale 방지). 클라이언트에서 자정을 넘겼는지 다시 확인한다.
	// svelte-ignore state_referenced_locally
	let dayNum = $state(data.dayNum ?? 0);

	type Phase = 'home' | 'play' | 'done';
	let phase = $state<Phase>('home');
	let loading = $state(false);

	/** 세션에 올라가는 한 문제. 성냥개비는 등식 한 쌍, 전개도는 그림 문제라 Problem이 아니다. */
	type Item = {
		kind: DailyKind;
		bonus: boolean;
		/** 은행에서의 인덱스 — 계측에서 id 없는 유형(성냥·전개도)을 특정한다 */
		index: number;
		problem?: Problem;
		eq?: { displayed: string; solution: string };
		cube?: CubeNetProblem;
	};
	let queue = $state<Item[]>([]);
	let pos = $state(0);
	let marks = $state<Mark[]>([]);

	/* ───────── 세션 타이머 (푸는 중엔 안 보이고 결과에서만 공개) ─────────
	 * 벽시계로 재면 안 된다 — 아침에 3문제 풀고 저녁에 마저 풀면 11시간이 찍힌다.
	 * 화면을 보고 있는 동안만 더하고, 탭을 떠나면 멈춘다.
	 * 한 구간이 10분을 넘으면 자리를 비운 것으로 보고 10분까지만 센다
	 * (창을 켜둔 채 밥 먹고 온 사람이 3시간으로 기록되면 비교가 무의미해진다). */
	const SEGMENT_CAP_MS = 10 * 60 * 1000;
	let sessionMs = $state(0);
	let segStart: number | null = null;

	function startTimer() {
		if (phase !== 'play' || segStart !== null) return;
		segStart = Date.now();
	}
	function flushTimer() {
		if (segStart === null) return;
		sessionMs += Math.min(Date.now() - segStart, SEGMENT_CAP_MS);
		segStart = null;
	}

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
	let mAnimFrom = $state<Board | null>(null); // 정답 공개 시 원래 배치 → 성냥이 날아가는 연출
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

	const KIND_LABEL: Record<DailyKind, string> = {
		discover: '발견',
		trivia: '상식',
		match: '성냥',
		cube: '전개도'
	};
	// 랜딩 소개용 — 문제은행을 랜딩에서 받지 않으려고 개수는 상수로 둔다(레이아웃 서버 로드와 같은 값)
	/* 개수는 레이아웃 서버 로드가 실제 문제은행에서 세어 내려준다.
	   예전엔 여기에 숫자를 박아뒀는데, 문제를 추가할 때마다 홈만 옛 숫자로 남았다. */
	const KIND_COUNT = $derived(data.counts);
	const TOTAL_PROBLEMS = $derived(
		data.counts.discover + data.counts.trivia + data.counts.match + data.counts.cube
	);
	// 성냥개비 소개 카드에 띄우는 읽기전용 보드
	const demoBoard = parseEq('8 - 0 = 8');

	/** 오늘 구성 — 유형이 늘어도 문구가 저절로 따라오게 계산해서 쓴다 */
	const LONG_LABEL: Record<DailyKind, string> = {
		discover: '발견형 퍼즐',
		trivia: '상식 퀴즈',
		match: '성냥개비',
		cube: '전개도'
	};
	let todayCounts = $derived.by(() => {
		const order = dailyKindOrder(dayNum);
		const c: Partial<Record<DailyKind, number>> = {};
		for (const k of order.slice(0, -1)) c[k] = (c[k] ?? 0) + 1;
		return order.slice(0, -1).filter((k, i, a) => a.indexOf(k) === i).map((k) => ({ kind: k, n: c[k]! }));
	});
	let compositionShort = $derived(
		todayCounts.map((x) => `${KIND_LABEL[x.kind]} ${x.n}`).join(' · ') + ' · 보너스 1'
	);
	let compositionLong = $derived(
		todayCounts.map((x) => `${LONG_LABEL[x.kind]} ${x.n}`).join(' · ') + ' · 보너스 1'
	);

	/** 상단 유형 칩: "발견 · 2/3" — 같은 유형 안에서 몇 번째인지 */
	let typeChip = $derived.by(() => {
		const c = queue[pos];
		if (!c) return '';
		if (c.bonus) return '보너스 · 마지막 문제';
		const same = queue.filter((q) => q.kind === c.kind && !q.bonus);
		const nth = queue.slice(0, pos + 1).filter((q) => q.kind === c.kind && !q.bonus).length;
		return `${KIND_LABEL[c.kind]} · ${nth}/${same.length}`;
	});

	/** 결과 화면 행: 유형 3개 + 보너스. 보너스를 유형에 합치면 "발견형 4"처럼 보여 10문제 구성이 어긋난다.
	 * 다 푼 뒤 새로고침하면 queue가 비어 있는데, 배치 순서는 늘 발견-상식-성냥 반복 + 마지막 보너스로
	 * 고정이므로 marks만으로도 유형별 집계를 복원할 수 있다. */
	let resultRows = $derived.by(() => {
		const base: Record<string, { label: string; ok: number; total: number }> = {
			discover: { label: '발견형', ok: 0, total: 0 },
			trivia: { label: '상식', ok: 0, total: 0 },
			match: { label: '성냥개비', ok: 0, total: 0 },
			cube: { label: '전개도', ok: 0, total: 0 },
			bonus: { label: '보너스', ok: 0, total: 0 }
		};
		// 배치 순서는 그날 구성만 알면 복원된다(다 풀고 새로고침하면 queue가 비어 있다)
		const order = dailyKindOrder(dayNum);
		const kindAt = (i: number): string =>
			queue[i]
				? queue[i].bonus
					? 'bonus'
					: queue[i].kind
				: i >= order.length - 1
					? 'bonus'
					: (order[i] ?? 'discover');
		const n = Math.max(queue.length, marks.length);
		for (let i = 0; i < n; i++) {
			const row = base[kindAt(i)];
			row.total += 1;
			if (marks[i] && marks[i] !== 'miss') row.ok += 1;
		}
		return Object.values(base).filter((r) => r.total > 0);
	});

	/** 다음 힌트가 열리기까지 남은 초. 잠긴 이유를 숫자로 보여줘야 죽은 버튼으로 안 읽힌다. */
	let hintWaitSec = $derived.by(() => {
		const need = hintsUsed <= 1 ? 25000 : 60000;
		return Math.max(1, Math.ceil((need - elapsedMs) / 1000));
	});

	/** epoch day → "7월 27일 월요일" (KST 정오 기준으로 안전하게 변환) */
	let todayLabel = $derived.by(() => {
		const d = new Date(dayNum * 86400000 - 9 * 3600 * 1000 + 43200000);
		const w = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
		return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${w}요일`;
	});

	/* ───────── 오늘의 맛보기(랜딩) ───────── */
	// 오늘의 10문제와 겹치지 않는 문제를 서버가 하나 골라 내려준다. 세션과 별개라 점수도 없다.
	let sampleValue = $state('');
	let samplePicked = $state<number | null>(null);
	let sampleDone = $state(false);
	let sampleOk = $state(false);

	function sampleSubmitText() {
		if (sampleDone || !data.sample || !sampleValue.trim()) return;
		// 본 게임과 같은 판정(isCorrectText) — 랜딩에서만 더 엄격하면 같은 답이 오답이 된다
		sampleOk = isCorrectText({ answers: data.sample.answers } as Problem, sampleValue);
		if (sampleOk) sampleDone = true;
		else sampleShake = true;
		setTimeout(() => (sampleShake = false), 420);
	}
	function sampleSubmitChoice(i: number) {
		if (sampleDone || !data.sample) return;
		samplePicked = i;
		sampleOk = i === data.sample.answerIndex;
		sampleDone = true;
	}
	function sampleReveal() {
		sampleOk = false;
		sampleDone = true;
	}
	let sampleShake = $state(false);

	/* ───────── 진행 저장·복원 ───────── */

	function persist(done = false) {
		writeDailyProgress(dayNum, { pos, marks, done, elapsedMs: sessionMs });
	}

	/** 문제은행은 첫 화면에 필요 없다. 시작을 누른 순간에만 내려받아 홈을 가볍게 유지한다. */
	async function loadBank() {
		const [p, t, m, cn] = await Promise.all([
			import('$lib/problems'),
			import('$lib/trivia'),
			import('$lib/data/matchstick-problems.json'),
			import('$lib/cubenet')
		]);
		const eqs = (m.default ?? m) as { displayed: string; solution: string }[];
		// 날짜별 은행 크기 이력째로 — 안정 뽑기(v2)가 과거 하루하루의 크기로 세트를 고정한다
		const picks = buildDailySetStable(
			p.PROBLEMS,
			t.TRIVIA,
			MATCH_TOTAL,
			dayNum,
			(x) => p.fieldOfChip(x.chip),
			(x) => x.category ?? '기타',
			bankSizesAt
		);
		queue = picks.map((pick) => ({
			kind: pick.kind,
			bonus: !!pick.bonus,
			index: pick.index,
			problem:
				pick.kind === 'discover'
					? p.PROBLEMS[pick.index]
					: pick.kind === 'trivia'
						? t.TRIVIA[pick.index]
						: undefined,
			eq: pick.kind === 'match' ? eqs[pick.index] : undefined,
			cube: pick.kind === 'cube' ? cn.problemAt(pick.index) : undefined
		}));
	}

	async function startOrResume() {
		if (loading) return;
		loading = true;
		try {
			if (!queue.length) await loadBank();
			if (!queue.length) throw new Error('empty bank');
			const saved = readDailyProgress(dayNum);
			pos = Math.min(saved.pos, queue.length - 1);
			marks = saved.marks.slice(0, queue.length);
			sessionMs = saved.elapsedMs ?? 0;
			phase = saved.done ? 'done' : 'play';
			if (phase === 'play') {
				resetProblem();
				startTimer();
				track(saved.marks.length ? 'daily_resume' : 'daily_start', { at: saved.marks.length });
			}
		} catch {
			// 문제은행 동적 로드 실패(오프라인 등) — 빈 화면 대신 홈에 남기고 안내한다
			phase = 'home';
			toast('문제를 불러오지 못했어요 — 네트워크 확인 후 다시 눌러주세요');
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
		mAnimFrom = null;
		// 전개도 해설은 다음 문제에서 다시 펼친 상태로 시작해야 한다
		cubeFold = 0;
		cubeRotX = -22;
		cubeRotY = -38;
		cubeSmooth = true;
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
		// 문제 단위 계측 — 어떤 문제에서 틀리고 힌트를 쓰는지가 은행 품질 관리의 실측 근거
		const it = queue[pos];
		if (it) {
			track('problem_result', {
				kind: it.kind,
				id: it.problem?.id ?? `${it.kind}-${it.index}`,
				correct: ok,
				hints: hintsUsed,
				wrong: wrongAttempts,
				bonus: it.bonus,
				day: dayNum
			});
		}
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
			// 한 번 더 고를 기회를 주되, 남은 보기가 정답 하나뿐이면 주지 않는다.
			// O/X 문제(보기 2개)에서 재시도를 주면 소거법으로 반드시 맞아 절대 틀릴 수 없었다.
			if (wrongAttempts >= maxWrong(current.problem.choices?.length))
				settle('miss', '정답을 확인했어요', false);
			else feedback = { msg: '아쉬워요 — 한 번 더 골라볼까요?', ok: false };
		}
	}

	/** 객관식 오답 허용 횟수 — 소거법으로 정답이 확정되기 전까지만 (보기 2개면 재시도 없음) */
	function maxWrong(choiceCount: number | undefined): number {
		return Math.max(1, Math.min(2, (choiceCount ?? 4) - 1));
	}

	/* ───────── 전개도 해설용 접기 ───────── */
	let cubeFold = $state(0);
	let cubeRotX = $state(-22);
	let cubeRotY = $state(-38);
	let cubeSmooth = $state(true);
	let cubeDrag: { x: number; y: number; rx: number; ry: number } | null = null;
	function cubeDown(e: PointerEvent) {
		cubeDrag = { x: e.clientX, y: e.clientY, rx: cubeRotX, ry: cubeRotY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function cubeMove(e: PointerEvent) {
		if (!cubeDrag) return;
		cubeRotY = cubeDrag.ry + (e.clientX - cubeDrag.x) * 0.6;
		cubeRotX = cubeDrag.rx - (e.clientY - cubeDrag.y) * 0.6;
	}
	function cubeUp() {
		cubeDrag = null;
	}

	/** 전개도는 그림 보기라 별도 판정이 필요하다(문제 구조가 Problem이 아니다) */
	function submitCube(i: number) {
		if (judged || !current?.cube) return;
		picked = i;
		if (i === current.cube.answer) settle(wrongAttempts === 0 ? 'clean' : 'hinted', '정답이에요', true);
		else {
			wrongAttempts += 1;
			if (wrongAttempts >= maxWrong(current.cube.options?.length))
				settle('miss', '정답을 확인했어요', false);
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
			// 정답으로 확 바뀌면 원래 문제가 뭐였는지 알 수 없다 —
			// 원래 배치에서 성냥이 날아가 정답 자리에 안착하는 연출로 보여준다
			mAnimFrom = cloneBoard(mOrig);
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

	/* ───────── 진행 ───────── */

	function next() {
		// 문제 단위로 끊어 더한다 — 구간 상한(10분)이 문제 하나 기준으로 걸리게
		flushTimer();
		if (pos + 1 < queue.length) {
			pos += 1;
			persist();
			resetProblem();
			startTimer();
		} else {
			phase = 'done';
			persist(true);
			completeDailySession(dayNum);
			// 완주 퍼널의 끝 — 점수와 걸린 시간을 함께 보내 분포를 본다
			track('daily_complete', {
				score: correctCount,
				total: DAILY_SIZE,
				seconds: Math.round(sessionMs / 1000)
			});
			if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function quit() {
		flushTimer();
		persist();
		phase = 'home';
		savedProgress = readDailyProgress(dayNum);
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/* ───────── 공유 ───────── */

	// 같은 점수라도 시간으로 겨룰 수 있게 — 시간이 없는 예전 기록은 그 줄만 빠진다
	let shareText = $derived(
		`딸깍 — 오늘 ${correctCount}/${DAILY_SIZE} 맞혔어요${sessionMs > 0 ? ` (${formatDuration(sessionMs)})` : ''}\n오늘의 10문제, 당신은 몇 개 맞힐까요?\n${browser ? location.origin : ''}/?ref=daily`
	);

	async function copyLink() {
		track('share_click', { method: 'copy', score: correctCount });
		try {
			await navigator.clipboard.writeText(shareText);
			toast('결과가 복사됐어요 (링크 포함)');
		} catch {
			// clipboard API가 없는 구형·인앱 브라우저 폴백
			try {
				const ta = document.createElement('textarea');
				ta.value = shareText;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				ta.remove();
				toast('결과가 복사됐어요 (링크 포함)');
			} catch {
				toast('복사에 실패했어요');
			}
		}
	}

	async function shareNative() {
		track('share_click', { method: 'native', score: correctCount });
		const outcome = await shareResult(
			{
				title: `딸깍 #${puzzleNo}`,
				scoreLabel: `${correctCount} / ${DAILY_SIZE}`,
				emojiRow: '',
				subLine: sessionMs > 0 ? `${todayLabel} · ${formatDuration(sessionMs)}` : `${todayLabel}의 10문제`,
				cta: '너도 오늘 문제 풀어볼래?'
			},
			shareText
		);
		track('share_result', { outcome });
		const msg = outcomeMessage(outcome);
		if (msg) toast(msg);
	}

	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 1800);
	}

	/* ───────── 초기화 ───────── */

	let savedProgress = $state<DailyProgress>({ pos: 0, marks: [], done: false });
	// pos는 '다음'을 눌러야 오르므로 1번만 풀고 나간 경우 pos=0, marks만 1개다 — marks 기준이 맞다
	let resumable = $derived(savedProgress.marks.length > 0 && !savedProgress.done);

	/* 헤더 로고 클릭 → 랜딩 화면으로(진행은 저장). 이미 /에 있으면 링크가 죽은 버튼이라 신호로 받는다. */
	let logoSeen = -1;
	$effect(() => {
		const n = $logoClicks;
		if (logoSeen === -1) {
			logoSeen = n; // 마운트 시점 값과 동기화 — 다른 페이지에서 눌린 횟수에 반응하지 않게
			return;
		}
		if (n === logoSeen) return;
		logoSeen = n;
		if (phase === 'play') quit();
		else if (phase === 'done') {
			phase = 'home';
			savedProgress = readDailyProgress(dayNum);
			if (browser) window.scrollTo({ top: 0 });
		}
	});

	/** 오늘 이전에 푼 적이 있는가 — 재방문자에게만 홈 설치 안내를 띄우는 판단에 쓴다 */
	let returningVisitor = $state(false);

	/* ── 결과 화면 기록: 연속·누적은 completeDailySession이 쌓는 ddal.stats에서, 어제 점수는 어제 진행에서 ── */
	let doneStats = $state({ streak: 0, played: 0, yesterday: -1, best: 0 });
	$effect(() => {
		if (phase !== 'done' || !browser) return;
		let s: { dayStreak?: number; played?: number } | null = null;
		try {
			s = JSON.parse(localStorage.getItem('ddal.stats') || 'null');
		} catch {
			s = null;
		}
		const y = readDailyProgress(dayNum - 1);
		doneStats = {
			streak: s?.dayStreak || 1,
			played: s?.played || 1,
			yesterday: y.done ? y.marks.filter((m) => m !== 'miss').length : -1,
			// 오늘 이전의 최고 기록 — 기록이 없던 시절에 푼 날은 자연히 빠진다
			best: bestDailyTime(dayNum) ?? 0
		};
	});

	/* ── 결과 화면 주간 스트립: 이번 주(월~일) 완주 기록 — /record로 이어진다 ── */
	const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
	let weekCells = $state<{ label: string; correct: number; isToday: boolean }[]>([]);
	$effect(() => {
		if (phase !== 'done' || !browser) return;
		weekCells = weekOf(dayNum).map((d, i) => {
			const r = readDayRecord(d);
			return { label: WEEK_LABELS[i], correct: r ? r.correct : -1, isToday: d === dayNum };
		});
	});

	/* 걸린 시간 표시. 기록이 없던 시절에 완주한 날은 0이라 아예 감춘다. */
	let timeLabel = $derived(sessionMs > 0 ? formatDuration(sessionMs) : '');
	let timeNote = $derived.by(() => {
		if (!sessionMs || !doneStats.best) return '';
		const diff = doneStats.best - sessionMs;
		if (diff > 0) return `최고 기록! ${formatDuration(diff)} 단축`;
		if (diff === 0) return '최고 기록과 같아요';
		return `최고 기록보다 ${formatDuration(-diff)} 느려요`;
	});

	/** 가장 약했던 유형 — 결과 화면에서 그 유형 연습으로 이어준다(전부 맞았으면 null) */
	const FILTER_OF: Record<string, string> = { 발견형: 'puzzle', 상식: 'trivia', 성냥개비: 'match' };
	let weakest = $derived.by(() => {
		const rows = resultRows.filter((r) => FILTER_OF[r.label]);
		let w: (typeof rows)[0] | null = null;
		for (const r of rows) if (!w || r.ok / r.total < w.ok / w.total) w = r;
		return w && w.ok < w.total ? w : null;
	});

	onMount(() => {
		dayNum = kstDayNumber(Date.now());
		savedProgress = readDailyProgress(dayNum);
		marks = savedProgress.marks;
		pos = savedProgress.pos;
		// 결과 화면을 새로고침해도 걸린 시간이 0으로 사라지지 않게
		sessionMs = savedProgress.elapsedMs ?? 0;
		if (savedProgress.done) phase = 'done';

		// 설치 안내 노출 조건 — 완주하지 않고 나간 사람도 재방문자로 잡는다
		returningVisitor = hasPlayedBefore(dayNum);

		/* 탭을 떠나면 타이머를 멈춘다. 이게 없으면 앱을 닫아둔 시간까지 다 세어져
		   '오늘 11시간 걸림' 같은 기록이 남는다. pagehide는 모바일에서 탭이
		   그냥 사라질 때 unload보다 확실히 불린다. */
		const pause = () => {
			if (phase !== 'play') return;
			flushTimer();
			persist();
		};
		const onVis = () => {
			if (document.visibilityState === 'hidden') pause();
			else startTimer();
		};
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('pagehide', pause);

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
			// KST 자정까지 남은 시간 — epoch에 +9h만 더해 getUTC*로 읽는다.
			// getTimezoneOffset()을 섞으면 로컬 오프셋이 이중으로 들어가(한국에서 +18h) 어긋난다.
			const kst = new Date(Date.now() + 9 * 3600 * 1000);
			const nextMid = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1);
			const diff = Math.max(0, nextMid - kst.getTime());
			const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
			const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
			const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
			countdown = `${h}:${m}:${s}`;
		}, 1000);
		return () => {
			clearInterval(iv);
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('pagehide', pause);
		};
	});
</script>

<svelte:head>
	<title>딸깍 — 매일 새로 열리는 두뇌 퍼즐 10문제</title>
	<meta
		name="description"
		content="하루 10문제. {compositionLong}. 매일 자정에 새로 열리고, 그날은 모두 같은 문제를 풉니다."
	/>
	<link rel="canonical" href="https://ddalkkak.app/" />
	<meta property="og:url" content="https://ddalkkak.app/" />
	<meta property="og:title" content="딸깍 — 매일 새로 열리는 두뇌 퍼즐 10문제" />
	<meta
		property="og:description"
		content="하루 10문제. {compositionLong}."
	/>
</svelte:head>

{#if phase === 'home'}
	<!-- ① 히어로 -->
	<section class="hero-card reveal">
		<div class="mark"><Bulb size={44} /></div>
		<h1 class="slogan">매일 두뇌를 깨우는<br /><b>10분의 딸깍</b></h1>
		<p class="tagline">규칙을 발견하는 순간, 머릿속에서 딸깍 소리가 납니다.</p>

		<div class="date">{todayLabel}</div>
		<div class="countdown">다음 문제까지 {countdown || '--:--:--'}</div>

		<div class="ticks home-ticks" aria-label="오늘 {DAILY_SIZE}문제 중 {savedProgress.marks.length}문제 완료">
			{#each Array(DAILY_SIZE) as _, i (i)}
				<span
					class="tick"
					class:done={i < savedProgress.marks.length}
					class:current={resumable && i === savedProgress.pos}
				></span>
			{/each}
		</div>

		<button class="cta" onclick={startOrResume} disabled={loading}>
			{#if loading}
				불러오는 중…
			{:else if savedProgress.done}
				오늘의 결과 보기 <span class="arr" aria-hidden="true">→</span>
			{:else if resumable}
				<span class="cta-main">이어서 풀기 <span class="arr" aria-hidden="true">→</span></span>
				<span class="cta-sub">{savedProgress.pos} / {DAILY_SIZE}문제 진행 중</span>
			{:else}
				오늘의 10문제 시작하기 <span class="arr" aria-hidden="true">→</span>
			{/if}
		</button>

		<p class="composition">{compositionShort}</p>

		<!-- 한 번이라도 와 본 사람에게만 — 첫 방문자의 첫인상은 건드리지 않는다 -->
		<InstallHint {dayNum} returning={returningVisitor} />
	</section>

	<!-- ② 오늘의 맛보기 — 시작 전에 한 문제 그냥 풀어볼 수 있다(오늘의 10문제와 겹치지 않음) -->
	{#if data.sample}
		<section class="sec reveal d1">
			<h2 class="sec-h">오늘의 맛보기<span>10문제와 별개예요</span></h2>
			<div class="card sample" class:shake={sampleShake}>
				<span class="cat-chip">{data.sample.chip}</span>
				<div class="q">
					{#each data.sample.blocks as b, i (i)}
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

				{#if data.sample.type === 'choice'}
					<div class="choices">
						{#each data.sample.choices as c, i (i)}
							<button
								class="choice"
								class:ok={sampleDone && i === data.sample.answerIndex}
								class:bad={samplePicked === i && i !== data.sample.answerIndex}
								disabled={sampleDone}
								onclick={() => sampleSubmitChoice(i)}
							>
								<span class="badge">{['A', 'B', 'C', 'D', 'E'][i]}</span>
								<span class="ctext">{c}</span>
							</button>
						{/each}
					</div>
				{:else}
					<input
						type="text"
						bind:value={sampleValue}
						placeholder="답을 입력해보세요"
						aria-label="맛보기 정답 입력"
						autocomplete="off"
						disabled={sampleDone}
						onkeydown={(e) => e.key === 'Enter' && sampleSubmitText()}
					/>
				{/if}

				{#if sampleDone}
					<div class="feedback" class:ok={sampleOk}>
						<span class="fmark">{sampleOk ? '✓' : '✕'}</span>
						<span>{sampleOk ? '딸깍! 맞혔어요' : '정답을 확인했어요'}</span>
					</div>
					{#if !sampleOk && data.sample.type !== 'choice'}
						<div class="answer-line">정답은 <b>{data.sample.answers[0]}</b></div>
					{/if}
					<div class="explain"><b>해설</b> {@html data.sample.explain}</div>
				{:else if data.sample.type !== 'choice'}
					<div class="dual">
						<button class="ghost" onclick={sampleReveal}>정답 보기</button>
						<button class="submit inline" onclick={sampleSubmitText}>확인</button>
					</div>
				{:else}
					<button class="ghost wide" onclick={sampleReveal}>정답 보기</button>
				{/if}
			</div>
		</section>
	{/if}

	<div class="adwrap reveal d2"><AdSlot label="랜딩 중단" /></div>

	<!-- ③ 어떤 문제가 나오나 — 설명이 아니라 실제 생김새로 -->
	<section class="sec reveal d2">
		<h2 class="sec-h">네 가지가 매일 섞여 나와요</h2>
		<div class="kinds">
			<div class="kind">
				<div class="kind-vis rule">
					<div class="rrow"><span>나무</span><em>→</em><b>2</b></div>
					<div class="rrow"><span>가나다</span><em>→</em><b>1</b></div>
					<div class="rrow"><span>고구마</span><em>→</em><b class="qm">?</b></div>
				</div>
				<b>발견형 {KIND_COUNT.discover}</b>
				<span>예시에 숨은 규칙을 스스로 찾습니다. 막히면 힌트가 3단계로 열려요.</span>
			</div>
			<div class="kind">
				<div class="kind-vis quiz">
					<span class="mini-badge">A</span><span class="mini-line"></span>
					<span class="mini-badge on">B</span><span class="mini-line on"></span>
					<span class="mini-badge">C</span><span class="mini-line"></span>
				</div>
				<b>상식 퀴즈 {KIND_COUNT.trivia}</b>
				<span>18개 분야, 초등부터 어른까지. 해설이 함께 나옵니다.</span>
			</div>
			<div class="kind">
				<div class="kind-vis">
					<MatchstickBoard board={demoBoard} picked={null} onstick={() => {}} interactive={false} label="8 − 0 = 8" />
				</div>
				<b>성냥개비 {KIND_COUNT.match}</b>
				<span>성냥 하나만 옮겨 식을 참으로. 획을 눌러 집고 빈 자리에 놓습니다.</span>
			</div>
			<div class="kind">
				<div class="kind-vis"><CubeDie view={[2, 3, 4]} size={78} /></div>
				<b>전개도 {KIND_COUNT.cube}</b>
				<span>머릿속에서 종이를 접어 어떤 주사위가 되는지 맞힙니다. 틀리면 접히는 과정을 보여줘요.</span>
			</div>
		</div>
	</section>

	<div class="adwrap reveal d3"><AdSlot label="랜딩 하단" /></div>

	<!-- ④ 10문제로 부족한 사람 — 유형별로 바로 들어가게 -->
	<section class="sec reveal d3">
		<div class="more">
			<p class="more-h">더 풀고 싶다면?</p>
			<p class="more-s">
				딸깍이 준비한 <b>{TOTAL_PROBLEMS.toLocaleString()}</b>문제! 유형별로 계속 풀어봐요
			</p>
			<div class="more-grid">
				<a class="mbtn" href="/play?filter=puzzle">
					<span class="mb-t">발견형</span>
					<span class="mb-n">{KIND_COUNT.discover}</span>
				</a>
				<a class="mbtn" href="/play?filter=trivia">
					<span class="mb-t">상식</span>
					<span class="mb-n">{KIND_COUNT.trivia}</span>
				</a>
				<a class="mbtn" href="/play?filter=match">
					<span class="mb-t">성냥개비</span>
					<span class="mb-n">{KIND_COUNT.match}</span>
				</a>
				<a class="mbtn" href="/play?filter=cube">
					<span class="mb-t">전개도</span>
					<span class="mb-n">{KIND_COUNT.cube}</span>
				</a>
			</div>
			<a class="mall" href="/play?filter=all">
				전부 섞어서 풀기 <span class="arr" aria-hidden="true">→</span>
			</a>
		</div>
	</section>

	<!-- ⑤ 문제를 눈으로 훑고 싶은 사람 — 푸는 게 아니라 읽는 입구.
	     분야별 페이지가 푸터 링크 하나로만 닿아 있어서 사람도 크롤러도 못 찾았다. -->
	<section class="sec reveal d3">
		<h2 class="sec-h">분야별로 골라 보기<span>정답·해설 포함</span></h2>
		<div class="catgrid">
			{#each data.categories as c (c.slug)}
				<a class="catlink" href="/trivia/{c.slug}">{c.name}<b>{c.count}</b></a>
			{/each}
		</div>
		<div class="deeplinks">
			<a href="/read">읽을거리</a>
			<a href="/discover">발견형 퍼즐이란</a>
			<a href="/matchstick/guide">성냥개비 푸는 법</a>
			<a href="/cubenet/guide">전개도 푸는 법</a>
			<a href="/guide">발견형 푸는 법</a>
			<a href="/archive">지난 문제</a>
		</div>
	</section>
{:else if phase === 'play' && current}
	<div class="topbar">
		<button class="exit" onclick={quit}><span class="ar" aria-hidden="true">←</span>나가기</button>
		<span class="type-chip" class:bonus={current.bonus}>{typeChip}</span>
	</div>

	<div class="ticks" aria-label="{pos + 1}번째 문제 / 총 {queue.length}문제">
		{#each Array(queue.length) as _, i (i)}
			<span class="tick" class:done={!!marks[i]} class:current={i === pos}></span>
		{/each}
	</div>

	{#key pos}
		<section
			class="card"
			class:bonus={current.bonus}
			class:hit={judged && feedback?.ok}
			class:miss={feedback && !feedback.ok}
		>
			{#if current.problem?.chip && !current.bonus}
				<span class="cat-chip">{current.problem.chip}</span>
			{:else if current.bonus}
				<span class="cat-chip gold">마지막 한 문제예요</span>
			{/if}

			<div class="q">
				{#if current.cube}
					<div class="qtext">이 전개도를 접어 주사위를 만들면, 어떤 모양이 될까요?</div>
					<div class="netbox">
						<CubeNetFigure
							rows={current.cube.net.rows}
							cells={current.cube.net.cells}
							faceOf={current.cube.net.faceOf}
						/>
					</div>
				{:else if current.eq && mCur}
					<div class="qtext">성냥 <b>하나만</b> 옮겨 식을 참으로 만드세요.</div>
					<div class="board-wrap">
						<MatchstickBoard
							board={mCur}
							picked={mPicked}
							onstick={handleStick}
							animateFrom={mAnimFrom}
							label={current.eq.displayed.replace('-', '−')}
						/>
					</div>
					<p class="guide" class:on={mPicked}>
						{mPicked ? '이제 빈 자리를 눌러 놓으세요' : '옮길 획을 눌러 집으세요'}
					</p>
				{:else if current.problem}
					{#each current.problem.blocks as b, i (i)}
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

			{#if current.cube}
				<div class="cubeopts">
					{#each current.cube.options as opt, i (i)}
						<button
							class="cubeopt"
							class:ok={judged && i === current.cube.answer}
							class:bad={picked === i && i !== current.cube.answer}
							disabled={judged}
							onclick={() => submitCube(i)}
						>
							<span class="badge">{['A', 'B', 'C', 'D'][i]}</span>
							<CubeDie view={opt} size={84} />
						</button>
					{/each}
				</div>
			{/if}

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
				{#if current.problem && current.problem.type !== 'choice' && feedback && !feedback.ok}
					<div class="answer-line">정답은 <b>{current.problem.answers?.[0]}</b></div>
				{/if}
				<div class="explain">
					<b>해설</b>
					{#if current.eq}
						성냥 하나만 옮겨 <b>{current.eq.solution.replace('-', '−')}</b>을 만들면 참이 됩니다.
					{:else if current.cube}
						마주 보는 면은
						{#each current.cube.opposites as [a, b], k (k)}<span class="oppair"
								>{CUBE_FACES[a].name} ↔ {CUBE_FACES[b].name}</span
							>{k < current.cube.opposites.length - 1 ? ', ' : ''}{/each}
						입니다. 마주 본 두 면은 한 화면에 같이 보이지 않아요.
					{:else if current.problem}
						{@html current.problem.explain}
					{/if}
				</div>

				<!-- 말로 설명하면 안 와닿는다. 실제로 접히는 걸 보여준다. -->
				{#if current.cube}
					<div class="foldbox">
						<button class="foldbtn" onclick={() => { cubeSmooth = true; cubeFold = cubeFold > 0.5 ? 0 : 1; }}>
							{cubeFold > 0.5 ? '다시 펼치기' : '접히는 과정 보기'}
						</button>
						<div
							class="foldstage"
							onpointerdown={cubeDown}
							onpointermove={cubeMove}
							onpointerup={cubeUp}
							onpointercancel={cubeUp}
							role="img"
							aria-label="전개도가 접히는 모습. 끌어서 돌릴 수 있습니다."
						>
							<CubeFold
								cells={current.cube.net.cells}
								faceOf={current.cube.net.faceOf}
								t={cubeFold}
								rotX={cubeRotX}
								rotY={cubeRotY}
								smooth={cubeSmooth}
							/>
						</div>
						<p class="foldhint">그림을 끌면 돌려볼 수 있어요.</p>
					</div>
				{/if}
				<button class="submit" onclick={next}>
					{pos + 1 < queue.length ? '다음' : '결과 보기'}
				</button>
			{:else if current.eq}
				<div class="dual">
					<button class="ghost" disabled={!mPicked} onclick={resetBoard}>처음부터</button>
					<button class="ghost" onclick={giveUp}>모르겠어요</button>
				</div>
			{:else if current.cube || current.problem?.type === 'choice'}
				<!-- 보기를 눌러 답하는 유형에는 제출 버튼이 필요 없다 -->
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

	<!-- 걸린 시간은 푸는 동안 숨겨 두었다가 여기서만 공개한다.
	     보면서 풀면 쫓기는 기분이 들어 발견형 퍼즐과 안 맞는다. -->
	{#if timeLabel}
		<div class="took">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
				<circle cx="12" cy="13" r="8" />
				<path d="M12 9v4l2.5 2M9 2h6" />
			</svg>
			<b>{timeLabel}</b>
			<span>만에 완주</span>
		</div>
		{#if timeNote}
			<p class="took-note" class:record={doneStats.best > sessionMs}>{timeNote}</p>
		{/if}
	{/if}

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

	<!-- 기록: 결과만 덜렁 있으면 다 푼 사람이 볼 게 없다 — 연속·누적·어제 대비를 보여준다 -->
	<div class="stats">
		<div class="stat">
			<b>{doneStats.streak}일</b>
			<span>연속 딸깍</span>
		</div>
		<div class="stat">
			<b>{doneStats.played}일</b>
			<span>누적 참여</span>
		</div>
		<div class="stat">
			{#if doneStats.yesterday >= 0}
				<b class:up={correctCount > doneStats.yesterday} class:down={correctCount < doneStats.yesterday}>
					{doneStats.yesterday} → {correctCount}
				</b>
				<span>어제 → 오늘</span>
			{:else}
				<b>첫 기록</b>
				<span>내일부터 비교돼요</span>
			{/if}
		</div>
	</div>

	<!-- 이번 주 잔디: 매일의 완주가 칸으로 쌓이는 걸 보여주고 전체 달력으로 이어준다 -->
	<a class="week" href="/record">
		{#each weekCells as c (c.label)}
			<span class="wcell" class:done={c.correct >= 0} class:tod={c.isToday}>
				<i>{c.label}</i>
				<b>{c.correct >= 0 ? c.correct : "·"}</b>
			</span>
		{/each}
		<span class="wmore">전체<br />기록<span class="arr" aria-hidden="true">→</span></span>
	</a>

	<!-- GN 피드백(8/11): 완주하고 나면 오늘 문제를 다시 볼 길이 없었다 -->
	<a class="review-link" href="/today">오늘 문제 다시 보기 <span aria-hidden="true">→</span></a>

	<p class="share-label">결과 공유</p>
	<div class="share-btns">
		<button class="sh-btn primary" onclick={shareNative}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 15V4" />
				<path d="M8 7l4-4 4 4" />
				<path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
			</svg>
			공유하기
		</button>
		<button class="sh-btn" onclick={copyLink}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
				<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
			</svg>
			링크 복사
		</button>
	</div>

	<!-- 설치가 사실상 유일한 재방문 경로다. 기록을 막 만든 지금이 가장 설득력 있는 순간이라
	     연습 유도보다 위에 둔다. -->
	<InstallPrompt {dayNum} streak={doneStats.streak} />

	<!-- 다음 행동: 가장 약했던 유형의 연습으로 이어준다 -->
	<div class="nudge">
		{#if weakest}
			<p class="nudge-t">
				오늘 <b>{weakest.label} {weakest.ok}/{weakest.total}</b> — 연습으로 감을 잡아볼까요?
			</p>
			<a class="nudge-btn" href="/play?filter={FILTER_OF[weakest.label]}">
				{weakest.label} 연습하러 가기 <span class="arr" aria-hidden="true">→</span>
			</a>
		{:else}
			<p class="nudge-t">오늘 감이 좋은데요? 이 기세로 계속 풀어봐요.</p>
			<a class="nudge-btn" href="/play?filter=all">
				무한 연습하러 가기 <span class="arr" aria-hidden="true">→</span>
			</a>
		{/if}
	</div>

	<p class="next-day">내일 10문제까지 {countdown || '--:--:--'}</p>
{/if}

{#if toastMsg}
	<div class="toast" role="status">{toastMsg}</div>
{/if}

<style>
	/* ── 랜딩 ── */
	/* 스크롤 없이 위에서부터 순서대로 떠오른다. 과하지 않게 8px·150ms. */
	.reveal {
		animation: rise 420ms var(--ease-out) both;
	}
	.reveal.d1 {
		animation-delay: 90ms;
	}
	.reveal.d2 {
		animation-delay: 160ms;
	}
	.reveal.d3 {
		animation-delay: 230ms;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}

	.hero-card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 22px;
		padding: 32px 24px 30px;
		text-align: center;
	}
	/* 전구가 켜지며 시작한다 — 로고의 '딸깍'을 화면에서 한 번 재생 */
	.mark {
		display: flex;
		justify-content: center;
		margin-bottom: 16px;
	}
	.slogan {
		font-size: 27px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		margin: 0;
		word-break: keep-all;
	}
	.slogan b {
		color: var(--accent);
	}
	.tagline {
		margin: 10px 0 22px;
		font-size: 13.5px;
		color: var(--muted);
		word-break: keep-all;
	}
	.date {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.2px;
	}
	.countdown {
		display: inline-block;
		margin-top: 8px;
		padding: 6px 14px;
		border-radius: 9px;
		background: var(--panel-2);
		color: var(--accent-2);
		font-size: 13px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.home-ticks {
		margin: 18px 0;
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
		font-family: inherit;
		padding: 12px;
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
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
	/* 화살표가 앞으로 밀렸다 돌아온다 — 누르라는 신호 */
	.arr {
		display: inline-block;
		animation: arr-nudge 1.6s var(--ease-out) infinite;
	}
	@keyframes arr-nudge {
		0%,
		55%,
		100% {
			transform: translateX(0);
		}
		70% {
			transform: translateX(5px);
		}
		85% {
			transform: translateX(1px);
		}
	}
	.cta:hover .arr {
		animation-duration: 900ms;
	}
	@media (prefers-reduced-motion: reduce) {
		.arr {
			animation: none;
		}
	}
	.cta-sub {
		display: block;
		font-size: 12.5px;
		font-weight: 600;
		opacity: 0.85;
		margin-top: 2px;
	}

	/* ── 섹션 공통 ── */
	.sec {
		margin-top: 26px;
	}
	.sec-h {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: 15px;
		font-weight: 800;
		margin: 0 0 10px 2px;
	}
	.sec-h span {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted-2);
	}
	/* 여백은 AdSlot 내부(.ad-slot, dev 전용)가 갖는다 — 프로덕션 빈 공백 방지 */
	.adwrap {
		margin: 0;
	}

	.card.sample {
		min-height: 0;
	}
	.card.sample.shake {
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

	/* ── 유형 소개 ── */
	.kinds {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.kind {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.kind-vis {
		background: var(--panel-2);
		border-radius: 12px;
		padding: 12px;
		margin-bottom: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 78px;
		overflow: hidden;
	}
	.kind-vis.rule {
		flex-direction: column;
		align-items: stretch;
		gap: 5px;
		padding: 14px 22px;
	}
	/* 그리드로 두면 행마다 트랙 높이가 달라져(마지막 행 35px) 물음표 줄만 내려앉는다.
	   flex + 고정폭·고정높이로 세 줄을 같은 자리에 못박는다. */
	.rrow {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		height: 21px;
		line-height: 21px;
		font-size: 14px;
		font-weight: 700;
	}
	.rrow span {
		width: 66px;
		text-align: right;
		font-size: 14px;
		line-height: 21px;
		color: var(--text);
	}
	.rrow em {
		width: 14px;
		text-align: center;
		font-style: normal;
		font-size: 14px;
		line-height: 21px;
		color: var(--muted-2);
		font-weight: 400;
	}
	.rrow b {
		width: 40px;
		text-align: left;
		font-size: 14px;
		line-height: 21px;
		color: var(--muted);
	}
	.rrow b.qm {
		color: var(--accent-2);
		font-weight: 800;
	}
	.kind-vis.quiz {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 7px 9px;
		align-content: center;
		padding: 14px 18px;
	}
	.mini-badge {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		font-size: 11px;
		font-weight: 800;
		color: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mini-badge.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.mini-line {
		height: 8px;
		border-radius: 4px;
		background: var(--border);
		align-self: center;
	}
	.mini-line.on {
		background: #bcdcc9;
	}
	/* 카드 제목·설명만 겨냥한다. 자손 선택자로 두면 예시 표(.rrow) 안의 b·span까지
	   먹어 글자 크기와 여백이 뒤틀린다. */
	.kind > b {
		display: block;
		font-size: 15px;
		margin-bottom: 4px;
	}
	.kind > span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.55;
		word-break: keep-all;
	}

	/* ── 10문제로 부족한 사람 ── */
	.more {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 20px 18px;
		text-align: center;
	}
	.more-h {
		font-size: 17px;
		font-weight: 800;
		margin: 0;
	}
	.more-s {
		margin: 6px 0 16px;
		font-size: 13px;
		color: var(--muted);
	}
	.more-s b {
		color: var(--accent);
		font-size: 15px;
		font-variant-numeric: tabular-nums;
	}
	.more-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.mbtn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 13px 6px;
		border-radius: 14px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		text-decoration: none;
		color: inherit;
		transition:
			transform var(--dur-tap) var(--ease-out),
			border-color var(--dur-move) ease;
	}
	.mbtn:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
	}
	.mb-t {
		font-size: 13px;
		font-weight: 700;
	}
	.mb-n {
		font-size: 17px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.mall {
		display: block;
		margin-top: 10px;
		padding: 14px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 4px 0 var(--accent-press);
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
	}
	.mall:active {
		transform: translateY(2px);
		box-shadow: 0 2px 0 var(--accent-press);
	}

	.catgrid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.catlink {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		padding: 8px 11px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}
	.catlink:hover {
		background: var(--panel-2);
	}
	.catlink b {
		font-size: 12px;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.deeplinks {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}
	.deeplinks a {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
		text-decoration: none;
	}
	.deeplinks a:hover {
		color: var(--accent);
		text-decoration: underline;
	}

	@media (min-width: 768px) {
		.hero-card {
			padding: 44px 40px 38px;
		}
		.slogan {
			font-size: 32px;
		}
		.date {
			font-size: 22px;
		}
		.cta {
			min-height: 68px;
			font-size: 19px;
		}
		.kinds {
			gap: 12px;
		}
	}

	.composition {
		text-align: center;
		margin-top: 16px;
		font-size: 13px;
		color: var(--muted);
		font-weight: 600;
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
	/* 텍스트만 두면 버튼으로 안 읽히고 누를 자리도 좁다 — 테두리 있는 알약으로 */
	.exit {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 34px;
		padding: 0 13px;
		font-size: 13px;
		font-weight: 700;
		font-family: inherit;
		color: var(--muted);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		cursor: pointer;
		transition: background var(--dur-move) ease;
	}
	.exit:hover {
		background: var(--panel-2);
		color: var(--text);
	}
	.exit .ar {
		font-size: 14px;
		line-height: 1;
	}
	.type-chip {
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--text);
		padding: 4px 10px;
		border-radius: 7px;
	}
	.type-chip.bonus {
		background: var(--gold-bg);
		color: var(--gold-text);
	}
	.card {
		border: 1px solid var(--border-strong);
		background: var(--panel);
		border-radius: 18px;
		padding: 20px;
		/* 문제 길이에 따라 카드가 조각처럼 작아지거나 화면이 출렁이지 않도록 바닥을 깐다 */
		min-height: 380px;
		display: flex;
		flex-direction: column;
	}
	@media (min-width: 768px) {
		.card {
			min-height: 440px;
			padding: 26px;
		}
	}
	.card.bonus {
		border: 2px dashed var(--gold);
	}
	.cat-chip {
		/* 카드가 flex column이라 그냥 두면 칩이 가로로 늘어난다 */
		align-self: flex-start;
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--muted);
		padding: 3px 9px;
		border-radius: 7px;
	}
	.cat-chip.gold {
		background: var(--gold-bg);
		color: var(--gold-text);
	}
	.q {
		margin-top: 14px;
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 12px;
	}
	.qtext {
		font-size: 18px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.board-wrap {
		margin-top: 2px;
	}
	.guide {
		text-align: center;
		font-size: 14px;
		font-weight: 700;
		color: var(--muted);
		margin: 0;
	}
	.guide.on {
		color: var(--accent-2);
	}

	input[type='text'] {
		width: 100%;
		margin-top: 16px;
		height: 50px;
		flex: none;
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
		flex: none;
	}
	.choice {
		flex: none;
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
		color: var(--text);
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
		flex: none;
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
		flex: none;
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

	.card.hit {
		border-color: var(--accent);
		animation: pop 420ms var(--ease-out);
	}
	.card.miss {
		animation: nudge 420ms ease;
	}
	@keyframes pop {
		40% {
			transform: scale(1.012);
		}
	}
	@keyframes nudge {
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
	.feedback {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 14px;
		flex: none;
		animation: fb-in 320ms var(--ease-out) both;
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
	@keyframes fb-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}
	.fmark {
		font-weight: 800;
		display: inline-flex;
		animation: mark-pop 380ms var(--ease-out) both;
	}
	@keyframes mark-pop {
		0% {
			transform: scale(0.4);
			opacity: 0;
		}
		60% {
			transform: scale(1.25);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}

	/* 모르겠어요·오답 뒤 정답 공개 — 해설에 답이 없을 수 있어 정답을 따로 명시한다 */
	.answer-line {
		margin-top: 10px;
		flex: none;
		background: var(--correct-bg);
		border: 1px solid var(--accent);
		border-radius: 12px;
		padding: 11px 14px;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		animation: fb-in 320ms var(--ease-out) both;
	}
	.answer-line b {
		color: var(--accent);
		font-weight: 800;
	}

	/* ── 전개도 ── */
	.netbox {
		display: flex;
		justify-content: center;
		padding: 6px 0 2px;
	}
	.cubeopts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 9px;
		margin-top: 4px;
	}
	.cubeopt {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 124px;
		padding: 16px 8px 10px;
		background: var(--panel);
		border: 2px solid var(--border-strong);
		border-radius: 14px;
		font-family: inherit;
		cursor: pointer;
	}
	.cubeopt:disabled {
		cursor: default;
	}
	.cubeopt .badge {
		position: absolute;
		top: 7px;
		left: 9px;
		font-size: 12px;
		font-weight: 800;
		color: var(--muted-2);
	}
	.cubeopt.ok {
		border-color: var(--accent);
		background: var(--correct-bg, var(--panel-2));
	}
	.cubeopt.ok .badge {
		color: var(--accent);
	}
	.cubeopt.bad {
		border-color: var(--accent-2);
	}
	.cubeopt.bad .badge {
		color: var(--accent-2);
	}
	.oppair {
		font-weight: 700;
		color: var(--text);
		white-space: nowrap;
	}
	.foldbox {
		margin-top: 10px;
	}
	.foldbtn {
		width: 100%;
		padding: 11px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		font-family: inherit;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text);
		cursor: pointer;
	}
	.foldstage {
		margin-top: 8px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		touch-action: none;
		cursor: grab;
		user-select: none;
	}
	.foldstage:active {
		cursor: grabbing;
	}
	.foldhint {
		margin: 6px 0 0;
		text-align: center;
		font-size: 12px;
		color: var(--muted-2);
	}

	.explain {
		margin-top: 14px;
		flex: none;
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
		flex: none;
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
		flex: none;
	}
	.ghost {
		flex: 1 0 auto;
		height: 52px;
		min-height: 52px;
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
		flex: none;
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
	.took {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 6px;
		font-size: 15px;
		color: var(--muted);
	}
	.took svg {
		width: 16px;
		height: 16px;
		color: var(--muted-2);
	}
	.took b {
		font-size: 17px;
		font-weight: 800;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.took-note {
		margin: 5px 0 0;
		text-align: center;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.took-note.record {
		color: var(--accent);
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
	/* 기록 3칸 — 연속·누적·어제 대비 */
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 8px;
	}
	.stat {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		padding: 13px 6px 11px;
		text-align: center;
	}
	.stat b {
		display: block;
		font-size: 17px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.2px;
	}
	.stat b.up {
		color: var(--accent);
	}
	.stat b.down {
		color: var(--accent-2);
	}
	.stat span {
		display: block;
		margin-top: 3px;
		font-size: 11.5px;
		color: var(--muted-2);
		font-weight: 600;
	}

	/* 이번 주 잔디 스트립 */
	.week {
		display: flex;
		align-items: stretch;
		gap: 5px;
		margin-top: 8px;
		text-decoration: none;
	}
	.wcell {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 8px 0 7px;
	}
	.wcell.done {
		background: var(--accent-soft);
		border-color: #cfe6d8;
	}
	.wcell.tod {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}
	.wcell i {
		font-style: normal;
		font-size: 10.5px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.wcell b {
		font-size: 14px;
		font-weight: 800;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.wcell.done b {
		color: #1f6b41;
	}
	.wmore {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		padding: 0 10px;
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		background: var(--panel);
		font-size: 10.5px;
		font-weight: 700;
		color: var(--muted);
		line-height: 1.35;
		text-align: center;
	}
	.wmore .arr {
		color: var(--accent);
		font-size: 12px;
	}
	.week:hover .wmore {
		background: var(--panel-2);
	}

	.review-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 8px;
		min-height: 46px;
		border-radius: 12px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}
	.review-link:hover {
		background: var(--panel-2);
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
	.sh-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		height: 52px;
		border-radius: 14px;
		font-size: 14.5px;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		color: var(--text);
		transition:
			background var(--dur-move) ease,
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
	}
	.sh-btn:hover {
		background: var(--panel-2);
	}
	.sh-btn svg {
		width: 18px;
		height: 18px;
		flex: none;
	}
	.sh-btn.primary {
		background: var(--accent);
		border: none;
		color: #fff;
		font-weight: 800;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.sh-btn.primary:hover {
		background: var(--accent);
		filter: brightness(1.04);
	}
	.sh-btn.primary:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--accent-press);
	}

	/* 약점 유형 연습 유도 */
	.nudge {
		margin-top: 18px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
		text-align: center;
	}
	.nudge-t {
		font-size: 13.5px;
		color: var(--muted);
		margin: 0 0 12px;
		word-break: keep-all;
	}
	.nudge-t b {
		color: var(--text);
	}
	.nudge-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15.5px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
	}
	.nudge-btn:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--accent-press);
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
		border-radius: 12px;
		z-index: 60;
	}
</style>
