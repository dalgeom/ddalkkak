<script lang="ts">
	import { onMount } from 'svelte';
	import { browser, dev } from '$app/environment';
	import { PROBLEMS, GRADES, DISCOVER_FIELDS, fieldOfChip, type Problem } from '$lib/problems';
	import { TRIVIA } from '$lib/trivia';
	import {
		TRACKS,
		MATCH_TOTAL,
		type TrackKey,
		buildRound,
		isCorrectText,
		scoreFor,
		emojiFor,
		kstDayNumber,
		dailyIndices,
		hintUnlocked,
		isCloseAnswer,
		wanderBonus,
		displayChoices,
		advanceStreakIfComplete
	} from '$lib/game';
	import { shareResult, outcomeMessage } from '$lib/shareCard';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import { parseEq } from '$lib/matchstick';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SegNumber from '$lib/components/SegNumber.svelte';

	// SSR 시점 load에서 계산한 오늘 날짜(FOUC·크롤러 stale 방지). 클라이언트에서 재확인.
	let { data }: { data: { dayNum: number } } = $props();

	let solved = $state<string[]>([]);
	let stats = $state({ score: 0, dayStreak: 0, maxStreak: 0, played: 0, lastDay: -1 });
	let calendar = $state<boolean[]>([]);

	let mode = $state<'daily' | 'random'>('daily');
	// SSR 초기 HTML은 이 seed 값으로 그린다(FOUC 방지). 클라이언트에선 onMount가 재계산하므로 초기값 캡처가 의도된 동작.
	// svelte-ignore state_referenced_locally
	let dayNum = $state(data.dayNum ?? 0);
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
	const INLINE_TRACKS: TrackKey[] = ['discover', 'trivia', 'match'];
	let allInlineDone = $derived(INLINE_TRACKS.every((k) => trackDone[k]));

	/** 카드에 실제 문제를 미리 보여준다 — 이름만 보고는 뭘 하는 모드인지 알 수 없다는 지적 대응 */
	const PEEK: Record<TrackKey, string> = {
		discover: '11 · 31 · 55 · 66 · ?\n숫자가 아닙니다',
		trivia: '세계에서 국토 면적이\n가장 넓은 나라는?',
		match: '0 + 0 = 8\n한 개만 옮기세요'
	};
	const todayTotal = TRACKS.reduce((n, t) => n + t.size, 0);
	/** 성냥개비 카드 미리보기용 정적 보드 — 그 모드의 고유 부품을 그대로 쓴다 */
	const PREVIEW_BOARD = parseEq('0 + 0 = 8');
	/** 상식 카드 미리보기용 보기 — 그 모드의 고유 형태(객관식)를 그대로 쓴다 */
	const PREVIEW_CHOICES = ['러시아', '캐나다', '중국'];

	/** 18개 분야가 "18개 분야"라는 글자 하나로만 존재했다. 실제 분포를 보여준다. */
	const CAT_COUNTS = (() => {
		const m = new Map<string, number>();
		for (const t of TRIVIA) m.set(t.category!, (m.get(t.category!) ?? 0) + 1);
		return [...m.entries()].sort((a, b) => b[1] - a[1]);
	})();
	/** 발견형은 chip이 35종이라 그대로 보여주면 시끄럽다. 6개 상위 분야로 묶어 보여준다. */
	const FIELD_COUNTS = (() => {
		const m = new Map<string, number>();
		for (const p of PROBLEMS) {
			const f = fieldOfChip(p.chip);
			m.set(f, (m.get(f) ?? 0) + 1);
		}
		return DISCOVER_FIELDS.map((f) => [f, m.get(f) ?? 0] as [string, number]).filter(
			([, c]) => c > 0
		);
	})();
	const GRADE_COUNTS = GRADES.map((g) => ({
		key: g.key,
		count: TRIVIA.filter((t) => t.grade === g.key).length
	}));
	let showCats = $state(false);

	let doneCount = $derived(TRACKS.filter((t) => trackDone[t.key]).length);

	/** 하루 전체 결과를 Wordle식 3줄 그리드로 공유한다 — 데일리 정체성의 핵심 바이럴 장치 */
	async function shareToday() {
		if (!browser) return;
		const rowFor = (k: TrackKey): string => {
			try {
				const rec = JSON.parse(localStorage.getItem(`ddal.daily.${dayNum}.${k}`) || 'null');
				if (!rec?.results) return '';
				// 발견/상식은 이모지(✅💡🔓), 성냥개비는 win/fail 문자열 — 정규화한다
				return (rec.results as string[])
					.map((r) => (r === 'win' ? '✅' : r === 'fail' ? '🔓' : r))
					.join('');
			} catch {
				return '';
			}
		};
		const rows = [
			{ key: 'discover' as TrackKey, label: '발견' },
			{ key: 'trivia' as TrackKey, label: '상식' },
			{ key: 'match' as TrackKey, label: '성냥' }
		]
			.map((r) => ({ label: r.label, emoji: rowFor(r.key) }))
			.filter((r) => r.emoji);
		const solvedN = rows.reduce(
			(n, r) => n + [...r.emoji].filter((e) => e === '✅' || e === '💡').length,
			0
		);
		const totalN = TRACKS.reduce((n, t) => n + t.size, 0);
		let text = `딸깍 ${dateLabel}\n${rows.map((r) => `${r.label} ${r.emoji}`).join('\n')}\n${solvedN}/${totalN}`;
		if (stats.dayStreak > 1) text += ` · 🔥 ${stats.dayStreak}일 연속`;
		text += `\n${location.origin}`;
		const outcome = await shareResult(
			{
				title: `오늘의 딸깍 · ${dateLabel}`,
				scoreLabel: `${solvedN} / ${totalN}`,
				gridRows: rows,
				subLine: stats.dayStreak > 1 ? `🔥 ${stats.dayStreak}일 연속` : undefined,
				cta: '너도 오늘의 딸깍 풀어볼래?'
			},
			text
		);
		toast(outcomeMessage(outcome));
	}
	let nextTrack = $derived(
		TRACKS.find((t) => t.key !== 'match' && t.key !== track && !trackDone[t.key]) ?? null
	);

	let current = $derived(displayChoices(queue[pos]));
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
				doneDay = INLINE_TRACKS.every((k) => {
					const rec = JSON.parse(localStorage.getItem(`ddal.daily.${d}.${k}`) || 'null');
					return !!rec && rec.phase === 'done';
				});
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
		syncStreak();
	}

	/** 오늘 3트랙 완료 시 연속 기록 갱신. 어느 트랙을 마지막에 끝내든(홈·성냥개비) 동작. */
	function syncStreak() {
		const s = advanceStreakIfComplete(dayNum);
		if (s) stats = { ...s };
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

	/** 방금 끝낸 트랙에만 완료 축하 모션을 준다 — 허브 로드 시 모든 완료 카드가 튀는 잡음을 피한다 */
	let pulseKey = $state<TrackKey | null>(null);
	let celebrateAll = $state(false);
	let pulseTimer: ReturnType<typeof setTimeout> | undefined;

	function goHub() {
		const justFinished = phase === 'done' && mode === 'daily';
		const finishedTrack = track;
		phase = 'hub';
		refreshTrackState();
		buildCalendar();
		if (justFinished && trackDone[finishedTrack]) {
			clearTimeout(pulseTimer);
			pulseKey = finishedTrack;
			// 3트랙 완주 축하는 하루 한 번만 — trackDone은 플레이 중 실시간 갱신돼
			// '방금 완성됐는지'를 못 가리므로 localStorage 플래그로 판정한다
			const celKey = `ddal.celebrated.${dayNum}`;
			let already = true;
			try {
				already = !!localStorage.getItem(celKey);
			} catch {
				/* 무시 */
			}
			if (allInlineDone && !already) {
				celebrateAll = true;
				try {
					localStorage.setItem(celKey, '1');
				} catch {
					/* 무시 */
				}
			}
			pulseTimer = setTimeout(() => {
				pulseKey = null;
				celebrateAll = false;
			}, 900);
		}
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
			// 스트릭 갱신은 saveDaily()가 이 트랙의 done 레코드를 쓴 뒤 refreshTrackState→syncStreak에서.
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
		const label = mode === 'daily' ? `${trackInfo.name} · ${dateLabel}` : '랜덤 3문제';
		const solvedN = results.filter((r) => r !== '🔓').length;
		let text = `딸깍! ${label} ${solvedN}/${results.length} ${results.join('')}`;
		if (mode === 'daily' && stats.dayStreak > 1) text += `\n🔥 ${stats.dayStreak}일 연속`;
		text += `\n${location.origin}`;
		const outcome = await shareResult(
			{
				title: label,
				scoreLabel: `${solvedN} / ${results.length}`,
				emojiRow: results.join(' '),
				subLine:
					mode === 'daily' && stats.dayStreak > 1 ? `🔥 ${stats.dayStreak}일 연속` : undefined,
				cta: '너도 오늘의 딸깍 풀어볼래?'
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
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/" />
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

{#if celebrateAll}
	<div class="celebrate">
		<Icon name="correct" size={17} />
		<span>오늘의 딸깍 완주! 내일 또 만나요</span>
	</div>
{/if}

{#if phase === 'landing' || phase === 'hub'}
	<section class="tracks">
		{#each TRACK_META as t (t.key)}
			{#if t.key === 'match'}
				<a
					class="track"
					class:cleared={trackDone[t.key]}
					class:pulse={pulseKey === t.key}
					href="/matchstick?daily=1"
				>
					<span class="t-top">
						<Icon name={trackDone[t.key] ? 'correct' : t.icon} size={17} />{t.name}
					</span>
					<span class="t-desc">{t.desc}</span>
					<span class="t-board">
						<MatchstickBoard board={PREVIEW_BOARD} picked={null} onstick={() => {}} />
					</span>
					<span class="t-cap">한 개만 옮기세요</span>
					<span class="t-foot">
						<span class="t-dots">
							{#each Array(t.size) as _, i (i)}
								<span class="t-dot" class:on={trackDone[t.key] || i < (trackPos[t.key] ?? 0)}
								></span>
							{/each}
						</span>
						<span class="t-go">{trackDone[t.key] ? '다시 보기 →' : '풀어보기 →'}</span>
					</span>
				</a>
			{:else}
				<button
					class="track"
					class:feature={t.key === 'discover'}
					class:cleared={trackDone[t.key]}
					class:pulse={pulseKey === t.key}
					onclick={() => startTrack(t.key)}
				>
					<span class="t-top">
						<Icon name={trackDone[t.key] ? 'correct' : t.icon} size={17} />{t.name}
					</span>
					<span class="t-desc">{t.desc}</span>
					{#if t.key === 'discover'}
						<!-- 시그니처 트랙만 실제 전광판으로 보여준다. 사이트에서 가장 특징적인
						     부품인데 지금까지 문제 화면 안에만 있었다. -->
						<span class="t-lcd"><SevenSeg lines={['11 31 55 66 ?']} /></span>
						<span class="t-cap">숫자가 아닙니다</span>
					{:else}
						<span class="t-quiz">
							<span class="tq-q">세계에서 국토 면적이 가장 넓은 나라는?</span>
							<span class="tq-opts">
								{#each PREVIEW_CHOICES as c (c)}
									<span class="tq-opt">{c}</span>
								{/each}
							</span>
						</span>
					{/if}
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

{#if phase === 'landing' || phase === 'hub'}
	<!-- 문제 은행 규모. 숫자를 크게 박는 대신 이미 아이덴티티인 세그먼트 부품으로 센다. -->
	<section class="bank">
		<div class="bank-item"><b>{PROBLEMS.length}</b><span>발견형</span></div>
		<div class="bank-item"><b>{TRIVIA.length}</b><span>상식 · 18개 분야</span></div>
		<div class="bank-item"><b>{MATCH_TOTAL}</b><span>성냥개비</span></div>
		<div class="bank-total">
			<span>모두 합쳐</span>
			<SegNumber value={PROBLEMS.length + TRIVIA.length + MATCH_TOTAL} size={34} />
			<span>문제</span>
		</div>
	</section>

	<!-- 발견형 분야 밀도 (chip 35종을 6개 분야로) -->
	<section class="fields">
		<div class="fields-head">
			<span class="fields-title">발견형 {PROBLEMS.length}문제 · {FIELD_COUNTS.length}개 분야</span>
			<a class="fields-more" href="/play?filter=puzzle">연속으로 풀기 →</a>
		</div>
		<div class="field-bar" aria-hidden="true">
			{#each FIELD_COUNTS as [name, count] (name)}
				<span class="field-seg" style="flex-grow:{count}" title="{name} · {count}문제"></span>
			{/each}
		</div>
		<div class="field-pills compact">
			{#each FIELD_COUNTS as [name, count] (name)}
				<span class="field-pill static">{name}<span>{count}</span></span>
			{/each}
		</div>
	</section>

	<!-- 기본은 조용한 밀도 바 하나. 파고들 사람만 칩을 펼친다. -->
	<section class="fields">
		<div class="fields-head">
			<span class="fields-title">상식 {TRIVIA.length}문제 · {CAT_COUNTS.length}개 분야 · 4단계</span>
			<a class="fields-more" href="/play?filter=trivia">연속으로 풀기 →</a>
		</div>
		<div class="field-bar" aria-hidden="true">
			{#each CAT_COUNTS as [name, count] (name)}
				<span class="field-seg" style="flex-grow:{count}" title="{name} · {count}문제"></span>
			{/each}
		</div>
		<button class="fields-toggle" onclick={() => (showCats = !showCats)}>
			{showCats ? '접기' : '분야별로 보기'}
		</button>
		{#if showCats}
			<div class="field-pills">
				{#each CAT_COUNTS as [name, count] (name)}
					<a class="field-pill" href="/play?filter=trivia&cat={encodeURIComponent(name)}"
						>{name}<span>{count}</span></a
					>
				{/each}
			</div>
		{/if}
		<div class="grade-bar">
			{#each GRADE_COUNTS as g (g.key)}
				<a class="grade-seg" style="flex-grow:{g.count}" href="/play?filter=trivia&grade={g.key}">
					<span class="grade-seg-label">{g.key}</span>
					<span class="grade-seg-n">{g.count}</span>
				</a>
			{/each}
		</div>
	</section>
{/if}

{#if phase === 'hub'}
	<section class="hub-grid">
		<div class="panel">
			<div class="panel-title">기록</div>
			<div class="today-row">
				<span class="today-label">오늘</span>
				<span class="today-dots">
					{#each TRACK_META as t (t.key)}
						<span class="today-dot" class:on={trackDone[t.key]} title={t.name}></span>
					{/each}
				</span>
				<span class="today-count">{doneCount} / {TRACK_META.length} 트랙</span>
			</div>
			{#if stats.played === 0}
				<div class="empty-note">아직 기록이 없어요 — 오늘 첫 문제부터 시작해보세요</div>
			{:else}
				<div class="stat-strip">
					<div class="stat"><b>{stats.played}</b><span>플레이</span></div>
					<div class="stat"><b>{stats.dayStreak}</b><span>연속</span></div>
					<div class="stat"><b>{stats.maxStreak}</b><span>최고</span></div>
					<div class="stat"><b>{stats.score.toLocaleString()}</b><span>총점</span></div>
				</div>
			{/if}
			{#if doneCount > 0}
				<button class="share-today" class:ready={allInlineDone} onclick={shareToday}>
					<Icon name="share" size={15} />
					{allInlineDone ? '오늘 결과 공유하기' : '지금까지 결과 공유'}
				</button>
			{/if}
		</div>
		<div class="panel">
			<div class="panel-title">최근 14일</div>
			<div class="cal">
				{#each calendar as d, i (i)}
					<span class="cell" class:done={d} class:today={i === calendar.length - 1}></span>
				{/each}
			</div>
		</div>
		<div class="panel center">
			<div class="cd-title">다음 퍼즐까지</div>
			<div class="cd-big">{countdown}</div>
		</div>
	</section>

	<!-- 오늘 치를 다 풀기 전에는 조용한 줄, 다 푼 뒤에만 다음 행동으로 올라온다 -->
	<div class="hub-links">
		<a class="next-bar" class:ready={allInlineDone} href="/play">
			<span class="nb-main">
				<Icon name="arrow" size={15} />
				{allInlineDone ? '오늘 치 완료 — 계속 풀기로' : '계속 풀기'}
			</span>
			<span class="nb-sub">{PROBLEMS.length + TRIVIA.length}문제 무제한 랜덤 · 콤보 점수</span>
		</a>
		<a class="next-bar archive-link" href="/archive">
			<span class="nb-main"><Icon name="search" size={15} /> 지난 문제</span>
			<span class="nb-sub">놓친 날의 오늘의 딸깍 다시 풀기</span>
		</a>
	</div>
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
						{:else if b.kind === 'glyph'}
							<Glyph lines={b.lines} axis={b.axis} />
						{:else if b.kind === 'figure'}
							<Figure svg={b.svg} caption={b.caption} />
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
						<Icon name="streak" size={18} /><b>{stats.dayStreak}</b><small>일 연속</small>
					</div>
				{:else}
					<div class="streak-none">오늘 풀면 연속 기록이 시작돼요</div>
				{/if}
				{#if mode === 'daily'}<div class="cd-sub">다음 퍼즐까지 {countdown}</div>{/if}
			</div>
			{#if mode === 'daily'}
				<!-- 푸는 동안에도 오늘까지의 연속이 보여야 다음 날 다시 올 이유가 된다 -->
				<div class="panel">
					<div class="panel-title">최근 14일</div>
					<div class="cal">
						{#each calendar as d, i (i)}
							<span class="cell" class:done={d} class:today={i === calendar.length - 1}></span>
						{/each}
					</div>
				</div>
			{/if}
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
						<span class="cell" class:done={d} class:today={i === calendar.length - 1}></span>
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
		font-size: var(--fs-lg);
		font-weight: var(--fw-emphasis);
		letter-spacing: var(--ls-normal);
	}
	.b-date {
		font-size: var(--fs-xs);
		font-weight: var(--fw-caption);
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
		font-size: var(--fs-xs);
		font-weight: var(--fw-label);
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
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
	}
	.pp-sub {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		opacity: 0.92;
	}
	.pp-go {
		font-size: var(--fs-sm);
		font-weight: var(--fw-emphasis);
		letter-spacing: var(--ls-label);
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
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		letter-spacing: var(--ls-label);
		border-radius: 999px;
		padding: 6px 15px;
		margin-bottom: 22px;
	}
	.q {
		container-type: inline-size;
		/* 문제마다 높이가 달라 카드가 튀는 걸 막되, 한 줄 문제에서 크게 비지 않을 만큼만 */
		min-height: 44px;
	}
	.qtext {
		font-size: var(--fs-lg);
		font-weight: var(--fw-body);
		letter-spacing: var(--ls-normal);
		line-height: var(--lh-reading);
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
		font-size: var(--fs-lg);
		font-weight: var(--fw-body);
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
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
		letter-spacing: var(--ls-label);
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
		font-size: var(--fs-md);
		font-weight: var(--fw-label);
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
		font-size: var(--fs-sm);
		padding: 13px 10px;
	}
	.hint {
		background: #fbf3dd;
		border-left: 3px solid var(--gold);
		border-radius: 8px;
		padding: 13px 16px;
		font-size: var(--fs-sm);
		font-weight: var(--fw-caption);
		margin-top: 12px;
		line-height: var(--lh-reading);
		color: #6a5f48;
		animation: slidein 0.25s ease;
	}
	.hint b {
		font-weight: var(--fw-label);
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
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
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
	.btn {
		border-bottom: 3px solid #24714a;
	}
	.btn:active:not(:disabled) {
		border-bottom-width: 1px;
	}
	.btn.ghost {
		border-bottom: 3px solid var(--border-strong);
	}
	.btn.ghost:active:not(:disabled) {
		border-bottom-width: 1px;
	}
	.explain {
		border-radius: 12px;
		padding: 18px;
		margin-top: 16px;
		font-size: var(--fs-sm);
		font-weight: var(--fw-caption);
		line-height: var(--lh-reading);
		word-break: keep-all;
		animation: judge-fade var(--dur-move) var(--ease-out);
	}
	.explain-head {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		letter-spacing: var(--ls-label);
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
		font-size: var(--fs-xl);
		font-weight: var(--fw-emphasis);
		letter-spacing: var(--ls-tight);
		margin-bottom: 14px;
	}
	.emoji {
		font-size: 34px;
		letter-spacing: 6px;
		margin: 12px 0;
	}
	.rscore {
		font-size: var(--fs-2xl);
		font-weight: var(--fw-number);
		font-variant-numeric: tabular-nums;
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
		font-size: var(--fs-lg);
		font-weight: var(--fw-number);
		font-variant-numeric: tabular-nums;
	}
	.stat span {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
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
	/* 완료 표시는 이모지 대신 세그먼트 획 하나 — 사이트 조형 문법과 같은 부품 */
	.cell.done::after {
		content: '';
		width: 55%;
		height: 5px;
		border-radius: var(--seg-r);
		background: var(--accent);
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
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		margin-bottom: 4px;
	}
	.cd-big {
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
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
		font-size: var(--fs-xs);
		font-weight: var(--fw-label);
		letter-spacing: var(--ls-label);
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
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		margin-top: 10px;
	}
	/* 한 자리 스트릭은 세그먼트로 그리면 획이 2~3개뿐이라 숫자로 안 읽힌다 */
	.streak-num b {
		font-size: 34px;
		font-weight: var(--fw-number);
		color: var(--accent-2);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.streak-num {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
		color: var(--accent-2);
		font-variant-numeric: tabular-nums;
	}
	.streak-none {
		font-size: var(--fs-xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		word-break: keep-all;
	}
	.streak-num small {
		font-size: var(--fs-xs);
		font-weight: var(--fw-label);
		color: var(--muted);
	}
	.cd-sub {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
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
		font-size: var(--fs-sm);
		font-weight: var(--fw-label);
		z-index: 30;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
	}
	/* ---- 랜딩 / 트랙 허브 ---- */
	.landing {
		text-align: center;
		padding: 26px 0 6px;
	}
	.l-h1 {
		font-size: clamp(var(--fs-xl), 5vw, var(--fs-2xl));
		font-weight: var(--fw-number);
		letter-spacing: var(--ls-tight);
		line-height: var(--lh-tight);
		word-break: keep-all;
	}
	.l-sub {
		margin-top: 10px;
		font-size: var(--fs-xs);
		color: var(--muted);
		font-weight: var(--fw-caption);
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
		min-width: 0;
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
	/* 방금 완료한 트랙만 한 번 튄다 (transform/opacity, reduce-motion 전역 룰이 무력화) */
	.track.pulse {
		animation: track-pop 0.6s var(--ease-pop);
	}
	@keyframes track-pop {
		0% { transform: scale(1); }
		40% { transform: scale(1.035); }
		100% { transform: scale(1); }
	}
	.celebrate {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 14px;
		padding: 12px;
		border-radius: 14px;
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		color: #1f6b41;
		font-size: var(--fs-sm);
		font-weight: var(--fw-emphasis);
		animation: celebrate-in 0.5s var(--ease-pop);
	}
	@keyframes celebrate-in {
		0% { opacity: 0; transform: translateY(-8px) scale(0.96); }
		100% { opacity: 1; transform: none; }
	}
	.track.cleared {
		border-color: #cfe6d8;
		background: linear-gradient(180deg, var(--accent-soft), var(--panel) 46%);
	}
	.t-top {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--fs-md);
		font-weight: var(--fw-label);
	}
	.t-desc {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		line-height: var(--lh-normal);
		word-break: keep-all;
	}
	.t-peek {
		background: var(--panel-2);
		border: 1px dashed var(--border-strong);
		border-radius: 10px;
		padding: 11px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		line-height: var(--lh-reading);
		white-space: pre-wrap;
		color: #6f6555;
		font-variant-numeric: tabular-nums;
	}
	.t-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		letter-spacing: var(--ls-label);
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
		font-size: var(--fs-xs);
		font-weight: var(--fw-label);
		letter-spacing: var(--ls-label);
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
	/* ---- 문제 은행 스트립 ---- */
	.bank {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px 26px;
		margin-top: 14px;
		padding: 14px 20px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 14px;
	}
	.bank-item b {
		font-size: var(--fs-sm);
		font-weight: var(--fw-number);
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.bank-item,
	.bank-total {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
	}
	.bank-total {
		margin-left: auto;
		color: var(--text);
		font-weight: var(--fw-emphasis);
	}
	@media (max-width: 700px) {
		.bank-total {
			margin-left: 0;
			width: 100%;
			padding-top: 10px;
			border-top: 1px solid var(--border);
		}
	}

	/* ---- 허브 하단 3열 ---- */
	.hub-grid {
		display: grid;
		grid-template-columns: 1.1fr 1.3fr 0.9fr;
		gap: 14px;
		margin-top: 14px;
		align-items: stretch;
	}
	@media (max-width: 860px) {
		.hub-grid {
			grid-template-columns: 1fr 1fr;
		}
		.hub-grid > :last-child {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 560px) {
		.hub-grid {
			grid-template-columns: 1fr;
		}
	}
	.empty-note {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		line-height: var(--lh-reading);
		word-break: keep-all;
	}

	/* ---- 계속 풀기: 평소엔 조용한 줄, 오늘 치 완료 시에만 승격 ---- */
	.hub-links {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 12px;
		margin-top: 14px;
	}
	@media (max-width: 560px) {
		.hub-links {
			grid-template-columns: 1fr;
		}
	}
	.next-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding: 13px 18px;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--panel);
		text-decoration: none;
		color: var(--muted);
		transition:
			border-color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.next-bar:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.nb-main {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: var(--fs-xs);
		font-weight: var(--fw-emphasis);
		color: var(--text);
	}
	.nb-sub {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
	}
	.next-bar.ready {
		background: var(--accent-soft);
		border-color: #cfe6d8;
	}
	.next-bar.ready .nb-main {
		color: #1f6b41;
	}

	/* ---- 트랙 벤토: 발견형이 시그니처다 ---- */
	.tracks {
		grid-template-columns: 1.35fr 1fr 1fr;
	}
	.track.feature {
		gap: 12px;
		padding: 22px;
	}
	.track.feature .t-top {
		font-size: var(--fs-lg);
	}
	@media (max-width: 860px) {
		.tracks {
			grid-template-columns: 1fr 1fr;
		}
		.track.feature {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 560px) {
		.tracks {
			grid-template-columns: 1fr;
		}
	}
	/* 시그니처 카드: 전광판 미리보기 */
	.t-lcd {
		display: block;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 12px;
		min-width: 0;
		overflow: hidden;
	}
	/* 글리프가 4개뿐이라 원래 크기면 시그니처 카드의 전광판보다 커져 위계가 뒤집힌다.
	   보드는 고정 픽셀 SVG라 max-width로 줄이면 잘리므로 높이 기준으로 비례 축소한다. */
	.t-board {
		display: block;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 12px;
		pointer-events: none;
	}
	.t-board :global(svg) {
		height: 66px;
		width: auto;
	}
	.t-quiz {
		display: flex;
		flex-direction: column;
		gap: 9px;
		background: var(--panel-2);
		border: 1px dashed var(--border-strong);
		border-radius: 10px;
		padding: 12px;
	}
	.tq-q {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: #6f6555;
		line-height: var(--lh-normal);
		word-break: keep-all;
	}
	.tq-opts {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.tq-opt {
		font-size: 11px;
		font-weight: var(--fw-caption);
		color: var(--muted);
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 3px 9px;
	}
	.t-cap {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		text-align: center;
	}

	/* 기록 패널: 오늘 진행 */
	.share-today {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		width: 100%;
		margin-top: 12px;
		padding: 10px;
		border-radius: 12px;
		border: 1.5px solid var(--border-strong);
		border-bottom-width: 3px;
		background: var(--panel-2);
		color: var(--muted);
		font-family: inherit;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		cursor: pointer;
		transition:
			color var(--dur-tap) var(--ease-out),
			border-color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out);
	}
	.share-today:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.share-today:active {
		border-bottom-width: 1px;
	}
	.share-today.ready {
		background: var(--accent-soft);
		border-color: #cfe6d8;
		color: #1f6b41;
	}
	.today-row {
		display: flex;
		align-items: center;
		gap: 9px;
		padding-bottom: 12px;
		margin-bottom: 12px;
		border-bottom: 1px solid var(--border);
	}
	.today-label {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		color: var(--text);
	}
	.today-dots {
		display: flex;
		gap: 5px;
	}
	.today-dot {
		width: 16px;
		height: 6px;
		border-radius: var(--seg-r);
		background: var(--border-strong);
	}
	.today-dot.on {
		background: var(--accent);
	}
	.today-count {
		margin-left: auto;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	/* 통계 4개가 한 줄에서 접혀 3+1로 어긋났다. 2×2로 고정해 리듬을 맞춘다. */
	.hub-grid .stat-strip {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px 10px;
	}
	/* ---- 분야·난이도 밀도 ---- */
	.fields {
		margin-top: 12px;
		padding: 15px 20px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 14px;
	}
	.fields-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 4px 10px;
		min-width: 0;
		margin-bottom: 10px;
	}
	.fields-title {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
	}
	.fields-more {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--accent);
		text-decoration: none;
		white-space: nowrap;
	}
	.field-bar {
		display: flex;
		gap: 2px;
		height: 10px;
	}
	.field-seg {
		flex-shrink: 0;
		flex-basis: 0;
		border-radius: var(--seg-r);
		background: var(--border-strong);
	}
	.fields-toggle {
		margin-top: 9px;
		background: none;
		border: none;
		font-family: inherit;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
		cursor: pointer;
		padding: 3px 0;
		transition: color var(--dur-tap) var(--ease-out);
	}
	.fields-toggle:hover {
		color: var(--text);
	}
	.field-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.field-pill {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 7px 13px;
		border-radius: 999px;
		background: var(--panel);
		border: 1px solid var(--border);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--text);
		text-decoration: none;
		transition:
			border-color var(--dur-tap) var(--ease-out),
			color var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.field-pills.compact {
		margin-top: 10px;
	}
	.field-pill.static {
		cursor: default;
	}
	.field-pill.static:hover {
		border-color: var(--border);
		color: var(--text);
		transform: none;
	}
	.field-pill:hover {
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
	}
	.field-pill span {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.grade-bar {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		margin-top: 10px;
	}
	@media (max-width: 520px) {
		.grade-bar {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.grade-seg {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 4px;
		border-radius: 10px;
		background: var(--panel);
		border: 1px solid var(--border);
		text-decoration: none;
		color: var(--text);
		transition:
			border-color var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.grade-seg:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.grade-seg-label {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
	}
	.grade-seg-n {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-number);
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
</style>
