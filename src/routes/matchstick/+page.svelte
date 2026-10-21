<script lang="ts">
	import { ctaTrack, track } from '$lib/analytics';
	import DailyNext from '$lib/components/DailyNext.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import problems from '$lib/data/matchstick-problems.json';
	import { parseEq, cloneBoard, bit, judgeRule, ruleHints, type Board } from '$lib/matchstick';
	import {
		STAGES,
		RULE_LABEL,
		starsFor,
		isUnlocked,
		nextStage,
		loadStages,
		saveStages,
		type StageProblem,
		type StageProgress,
		type StageResult
	} from '$lib/matchStages';
	import { MATCH_KINDS } from '$lib/matchstickKinds';
	import { MATCH_LEVELS, levelOf, type MatchLevel } from '$lib/matchstickLevels';
	import { kstDayNumber } from '$lib/game';
	import { matchOfDay, nextStreak, shownStreak, type MatchStreak } from '$lib/matchDaily';
	import PushPrompt from '$lib/components/PushPrompt.svelte';
	import { shareResult as shareCardResult, outcomeMessage } from '$lib/shareCard';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SolveEntry from '$lib/components/SolveEntry.svelte';

	type Mode =
		| { type: 'free' }
		| { type: 'time'; seconds: number }
		| { type: 'count'; total: number }
		| { type: 'today' }
		| { type: 'stage'; no: number };

	let screen = $state<'menu' | 'play' | 'result'>('menu');
	let mode = $state<Mode>({ type: 'free' });

	let done = $state<number[]>([]);
	let stats = $state({ solved: 0, streak: 0, best: 0 });
	let bests = $state<Record<string, number>>({});
	/** 난이도 페이지의 「~만 무한으로 풀기」(?level=)로 들어오면 그 난이도만 낸다. 메뉴로 나가면 풀린다 */
	let level = $state<MatchLevel | null>(null);
	const inLevel = (i: number) => !level || levelOf(problems[i].displayed, problems[i].solution) === level;

	// 오늘의 성냥개비(matchDaily.ts). 날짜는 onMount에서 잡는다 — 서버 렌더 시각과 어긋나지 않게.
	let day = $state(0);
	let daily = $state<MatchStreak | null>(null);
	let todayIdx = $derived(day ? matchOfDay(day) : -1);
	let todayDone = $derived(!!day && daily?.day === day);
	/** 「오늘의 10문제로 이어 가기」 카드가 보이는지 — 보이면 무한 연습 버튼을 테두리로 낮춘다(DailyNext) */
	let nextShown = $state(false);
	let todayWon = $derived(todayDone && (daily?.streak ?? 0) > 0);
	let dailyStreak = $derived(day ? shownStreak(daily, day) : 0);
	let todayLabel = $derived.by(() => {
		if (!day) return '';
		const d = new Date(day * 86400000);
		return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
	});
	let tomorrowPeek = $derived(day ? { chip: '성냥개비', line: problems[matchOfDay(day + 1)].displayed } : null);

	let pIdx = $state(-1);
	/** 지금 판의 문제. 은행 문제는 move1, 단계 문제(matchStages.ts)는 자기 규칙을 갖는다 */
	let prob = $state<StageProblem>({ displayed: '', solution: '', rule: 'move1' });
	let hintMax = $derived(prob.displayed ? ruleHints(prob, prob.rule).length : 0);
	// 단계 도전 — 진행은 기기에 남는다(matchStages.ts loadStages)
	let stageProgress = $state<StageProgress>({});
	let stageIdx = $state(0);
	let stageResults = $state<StageResult[]>([]);
	let nextNo = $derived(nextStage(stageProgress));
	/** v2(10/14): 메뉴 모드 타일에서 펼친 선택지(타임어택 시간·개수 도전 개수) */
	let pick = $state<'' | 'time' | 'count'>('');
	/** 60칸 단계판은 펼칠 때만 — 처음 온 사람에게 59칸 잠긴 판이 화면 한 장을 차지했다 */
	let showGrid = $state(false);
	let picSolved = $state(0);
	let orig = $state<Board | null>(null);
	let cur = $state<Board | null>(null);
	/** 정답 공개 시 원래 배치 — 성냥이 집혔다 날아가 안착하는 연출에 쓴다.
	    홈·연속모드엔 있었는데 여기만 보드가 툭 바뀌어서 뭐가 움직였는지 알 수 없었다. */
	let animFrom = $state<Board | null>(null);
	let picked = $state<PickLoc | null>(null);
	let attempts = $state(0);
	let solvedThis = $state<'no' | 'won' | 'revealed'>('no');
	/** 연 힌트 수(0~2) — 빼는 곳, 꽂는 곳(matchstick.ts moveHints) */
	let hintStep = $state(0);
	let feedback = $state('');
	let shaking = $state(false);
	let toastMsg = $state('');

	// 모드 런 상태
	let runSolved = $state(0);
	/** 무한 연습에서 맞힌 수. 세 번째 직후 한 번 내일 알림을 권한다(play/+page.svelte settledCount 주석) */
	let freeWins = $state(0);
	let runResults = $state<('win' | 'fail')[]>([]);
	let timeLeft = $state(0);
	let timerId: ReturnType<typeof setInterval> | undefined;

	let timeStr = $derived(
		`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
	);

	function modeKey(m: Mode): string {
		if (m.type === 'time') return `time-${m.seconds}`;
		if (m.type === 'count') return `count-${m.total}`;
		if (m.type === 'today') return 'today';
		return 'free';
	}
	function modeLabel(m: Mode): string {
		if (m.type === 'time') return `타임어택 ${m.seconds / 60}분`;
		if (m.type === 'count') return `${m.total}문제 도전`;
		if (m.type === 'today') return '오늘의 성냥개비';
		return '무한 연습';
	}
	function load() {
		try {
			done = JSON.parse(localStorage.getItem('ddal.match.done') || '[]');
			stats = JSON.parse(
				localStorage.getItem('ddal.match.stats') || '{"solved":0,"streak":0,"best":0}'
			);
			bests = JSON.parse(localStorage.getItem('ddal.match.bests') || '{}');
			daily = JSON.parse(localStorage.getItem('ddal.match.daily') || 'null');
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
			if (daily) localStorage.setItem('ddal.match.daily', JSON.stringify(daily));
		} catch {
			/* 무시 */
		}
	}

	function startMode(m: Mode) {
		mode = m;
		runSolved = 0;
		runResults = [];
		screen = 'play';
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
		const key = modeKey(mode);
		const score =
			mode.type === 'count'
				? runResults.filter((r) => r === 'win').length
				: runSolved;
		if (score > (bests[key] ?? 0)) bests[key] = score;
		persist();
		screen = 'result';
	}

	function toMenu() {
		clearInterval(timerId);
		timerId = undefined;
		level = null;
		screen = 'menu';
	}

	function resetBoard() {
		orig = parseEq(prob.displayed);
		cur = cloneBoard(orig);
		picked = null;
		attempts = 0;
		solvedThis = 'no';
		hintStep = 0;
		feedback = '';
		animFrom = null;
	}

	function nextProblem(first = false) {
		if (mode.type === 'stage') {
			prob = STAGES[mode.no - 1][stageIdx];
			pIdx = -1;
			resetBoard();
			return;
		}
		const forced = Number(page.url.searchParams.get('p'));
		let idx: number;
		if (mode.type === 'today') {
			idx = todayIdx;
		} else if (first && mode.type === 'free' && page.url.searchParams.has('p') && !Number.isNaN(forced)) {
			idx = Math.max(0, Math.min(problems.length - 1, forced));
		} else {
			let pool = problems.map((_, i) => i).filter((i) => inLevel(i) && !done.includes(i));
			if (pool.length === 0) {
				done = done.filter((i) => !inLevel(i));
				persist();
				pool = problems.map((_, i) => i).filter(inLevel);
			}
			idx = pool[Math.floor(Math.random() * pool.length)];
		}
		pIdx = idx;
		prob = { ...problems[idx], rule: 'move1' };
		resetBoard();
	}

	function revert() {
		if (!orig) return;
		cur = cloneBoard(orig);
		picked = null;
	}

	function handleStick(loc: PickLoc, lit: boolean) {
		if (screen !== 'play' || solvedThis !== 'no' || !cur || !orig) return;

		// 빼기·더하기 문제는 손에 들지 않는다 — 누르는 즉시 빠지거나 꽂히고 바로 판정한다
		if (prob.rule === 'remove1') {
			if (!lit) return;
			applyRemove(loc);
			return judge();
		}
		if (prob.rule === 'add1') {
			if (lit) return;
			applyAdd(loc);
			return judge();
		}
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
		judge();
	}

	/** 손을 하나 쓴 뒤. 2개 옮기기는 첫 번째를 옮긴 뒤 'more'라 되돌리지 않고 다음 손을 받는다 */
	function judge() {
		const r = judgeRule(orig!, cur!, prob.rule);
		if (r === 'more') {
			feedback = '하나 더 옮겨요';
			return;
		}
		if (r === 'solved') return win();
		attempts++;
		feedback = '아직 아니에요!';
		shaking = true;
		setTimeout(() => {
			shaking = false;
			revert();
		}, 420);
	}

	function win() {
		solvedThis = 'won';
		stats.solved++;
		stats.streak++;
		if (stats.streak > stats.best) stats.best = stats.streak;
		if (mode.type !== 'stage') markDone();
		persist();

		if (mode.type === 'stage') {
			stageResults = [...stageResults, hintStep > 0 ? 'hinted' : 'clean'];
			feedback = attempts === 0 ? '딸깍! 한 번에 맞혔어요' : `딸깍! ${attempts + 1}번 만에 맞혔어요`;
			return;
		}

		if (mode.type === 'today') finishToday('won');
		if (mode.type === 'free') freeWins++;
		if (mode.type === 'free' || mode.type === 'today') {
			// 점수 시스템은 없다 — 있지도 않은 점수를 암시하지 말고 시도 횟수만 알려준다
			feedback = attempts === 0 ? '딸깍! 한 번에 맞혔어요' : `딸깍! ${attempts + 1}번 만에 맞혔어요`;
		} else {
			runSolved++;
			if (mode.type === 'count') runResults = [...runResults, 'win'];
			feedback = '딸깍!';
			setTimeout(() => {
				if (screen !== 'play') return;
				if (
					mode.type === 'count' && runResults.length >= mode.total
				)
					endRun();
				else nextProblem();
			}, 650);
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
		// 원래 배치에서 성냥이 날아가 정답 자리에 안착하는 연출로 보여준다
		if (orig) animFrom = cloneBoard(orig);
		cur = parseEq(prob.solution);
		picked = null;
		solvedThis = 'revealed';
		stats.streak = 0;
		if (mode.type === 'stage') stageResults = [...stageResults, 'revealed'];
		else markDone();
		if (mode.type === 'today') finishToday('revealed');
		persist();
		feedback = `정답: ${prob.solution.replace('-', '−')}`;
		if (mode.type === 'count') {
			runResults = [...runResults, 'fail'];
			setTimeout(() => {
				if (screen !== 'play') return;
				if (runResults.length >= (mode as { total: number }).total) endRun();
				else nextProblem();
			}, 1400);
		}
	}

	function showHint() {
		if (solvedThis !== 'no' || hintStep >= hintMax) return;
		hintStep++;
		track('match_hint', { step: hintStep, mode: mode.type });
	}

	function finishToday(result: 'won' | 'revealed') {
		if (todayDone) return;
		daily = nextStreak(daily, day, result);
		persist();
		track(result === 'won' ? 'match_daily_solve' : 'match_daily_reveal', { streak: daily.streak });
	}

	function startStage(no: number) {
		if (!isUnlocked(stageProgress, no)) return;
		stageIdx = 0;
		stageResults = [];
		track('match_stage_start', { stage: no });
		startMode({ type: 'stage', no });
	}

	function nextInStage() {
		if (mode.type !== 'stage') return;
		if (stageIdx + 1 < STAGES[mode.no - 1].length) {
			stageIdx++;
			nextProblem();
			return;
		}
		const stars = starsFor(stageResults);
		if (stars > (stageProgress[mode.no] ?? 0)) {
			stageProgress = { ...stageProgress, [mode.no]: stars };
			saveStages(stageProgress);
		}
		track(stars ? 'match_stage_clear' : 'match_stage_fail', { stage: mode.no, stars });
		screen = 'result';
	}

	function startToday() {
		track('match_daily_start', { streak: dailyStreak });
		startMode({ type: 'today' });
	}

	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}

	// 홈·연속모드와 동일하게 이미지 카드 + 4단 폴백 + 결과 토스트로 통일(성공/취소 무피드백 해소).
	async function share() {
		let title: string;
		let scoreLabel: string;
		let emojiRow: string;
		let subLine: string;
		let text: string;
		if (mode.type === 'time') {
			title = `성냥개비 타임어택 ${mode.seconds / 60}분`;
			scoreLabel = `${runSolved}문제`;
			emojiRow = '🔥'.repeat(Math.min(Math.max(runSolved, 1), 10));
			subLine = `제한시간 안에 ${runSolved}문제 해결`;
			text = `딸깍! ${title} · ${runSolved}문제`;
		} else if (mode.type === 'count') {
			const wins = runResults.filter((r) => r === 'win').length;
			title = `성냥개비 ${mode.total}문제 도전`;
			scoreLabel = `${wins}문제`;
			emojiRow = runResults.map((r) => (r === 'win' ? '🟢' : '⚪')).join('');
			subLine = `${wins}/${runResults.length} 성공`;
			text = `딸깍! ${title} ${wins}개 ${runResults
				.map((r) => (r === 'win' ? '✅' : '🔓'))
				.join('')}`;
		} else {
			title = '성냥개비';
			scoreLabel = `연속 ${stats.streak}판`;
			emojiRow = '🔥';
			subLine = `연속 ${stats.streak}판 · 통산 ${stats.solved}판`;
			text = `딸깍! 성냥개비 — 연속 ${stats.streak}판 · 통산 ${stats.solved}판`;
		}
		text += `\n${location.origin}/matchstick?ref=match\n#딸깍`;
		const outcome = await shareCardResult(
			{ title, scoreLabel, emojiRow, subLine, cta: '너도 도전해봐!' },
			text
		);
		// 사용자가 공유 시트를 닫은 경우(canceled) 메시지가 비어 있다 — 빈 토스트를 띄우지 않는다
		const msg = outcomeMessage(outcome);
		if (msg) toast(msg);
	}

	onMount(() => {
		load();
		stageProgress = loadStages();
		try {
			picSolved = JSON.parse(localStorage.getItem('ddal.match.pic') || '[]').length;
		} catch {
			picSolved = 0;
		}
		day = kstDayNumber(Date.now());
		track('match_daily_seen', { done: todayDone, streak: dailyStreak });
		const lv = page.url.searchParams.get('level');
		if (lv === 'easy' || lv === 'hard') {
			level = lv;
			startMode({ type: 'free' });
		} else if (page.url.searchParams.has('p')) startMode({ type: 'free' });
	});
	onDestroy(() => clearInterval(timerId));
</script>

<svelte:head>
	<!--
		제목은 사람들이 실제로 치는 말로 연다 — 2026-09-28 서치어드바이저 실측.
		「성냥개비 문제」가 7일 노출 687로 사이트 전체 노출의 18%인데 CTR이 8.3%다.
		같은 뜻인데 표기가 다른 「성냥개비문제」는 11.6%, 「성냥 문제」는 30%다.
		제목이 「성냥개비 퍼즐」로 시작해 제일 큰 검색어와 글자가 안 맞았다 — 네이버는
		검색어와 같은 글자를 굵게 보여주는데, 그 굵은 글자가 제목 맨 앞에 없었다.
		「정답 풀이」는 실제로 있는 기능이다(무한·개수 모드의 「정답 보기」 버튼).
	-->
	<title>성냥개비 문제 {problems.length}개 — 하나만 옮겨 식 완성 · 정답 풀이 | 딸깍</title>
	<meta
		name="description"
		content="성냥개비 문제 {problems.length}개를 무료로 풉니다. 성냥 하나만 옮겨 틀린 식을 참으로 — 막히면 정답 풀이를 바로 볼 수 있습니다. 무한 연습·타임어택 모드."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick" />
	<meta property="og:title" content="성냥개비 문제 {problems.length}개 — 하나만 옮겨 식 완성 · 정답 풀이 | 딸깍" />
	<meta property="og:description" content="성냥 하나만 옮겨 등식을 참으로! 무한 연습·타임어택·개수 도전." />
	<meta property="og:url" content="https://ddalkkak.app/matchstick" />
</svelte:head>

<div class="mroot">
{#if screen === 'menu'}
	<div class="menu">
		<header class="cover">
			<span class="kicker">성냥개비</span>
			<h1>성냥 <b>하나만</b> 옮겨<br />틀린 식을 참으로</h1>
			<p class="lead">획을 눌러 집고 빈 자리를 눌러 놓아요. 마우스로 끌어 옮겨도 돼요. 문제는 {problems.length}개 준비돼 있어요.</p>
			<div class="facts">
				<div class="fact"><b>{stats.solved}</b><span>푼 판</span></div>
				<div class="fact"><b>{stats.best}</b><span>최고 연속</span></div>
				<div class="fact"><b>{problems.length - done.length}</b><span>남은 새 문제</span></div>
			</div>
		</header>

		<!-- 「12-7=6 성냥」처럼 식을 검색해 들어온 사람은 그 식의 답을 찾고 있다(10/21) — 오늘의 성냥보다 먼저 보이게 -->
		<SolveEntry from="match" />

		<!-- 오늘의 성냥개비 — 검색으로 온 사람에게 매일 올 이유를 준다(matchDaily.ts) -->
		{#if day && todayIdx >= 0}
			<section class="today" class:done={todayDone}>
				<div class="t-top">
					<span class="kicker">오늘의 성냥개비 · {todayLabel}</span>
					{#if dailyStreak > 0}<span class="t-streak">🔥 {dailyStreak}일 연속</span>{/if}
				</div>
				{#if todayDone}
					<p class="t-done">
						{todayWon ? '오늘 문제를 풀었어요.' : '오늘 문제는 정답을 봤어요.'} 내일 자정에 새 문제가 열려요.
					</p>
					<DailyNext pitch="오늘의 10문제에 성냥개비 2문제가 더 있어요" />
				{:else}
					<div class="t-board">
						<MatchstickBoard
							board={parseEq(problems[todayIdx].displayed)}
							picked={null}
							onstick={() => {}}
							interactive={false}
							label={problems[todayIdx].displayed}
						/>
					</div>
					<button class="big" onclick={startToday}>
						풀어 보기 <span class="arr" aria-hidden="true">→</span>
					</button>
					<p class="t-note">하루 한 문제, 모두 같은 문제예요. 매일 풀면 연속 기록이 쌓입니다.</p>
				{/if}
			</section>
		{/if}

		<!-- v2(10/14): 오늘의 성냥 · 단계 · 그림 · 처음이라면 · 띠 · 무한 · 타임어택 · 개수 · 설명이 세로로 쌓여
		     3,200px였다. 고르는 것은 타일 6칸 하나로 모으고, 시간·개수 선택지는 누른 타일 아래에만 펼친다. -->
		<section class="sec">
			<h2 class="mh">어떻게 풀까요?</h2>
			<div class="modes">
				<button class="mode" onclick={() => startStage(nextNo)}>
					<b>단계 도전</b><span>{Object.keys(stageProgress).length ? `${nextNo}단계 이어하기` : `${STAGES.length}단계 · 1단계부터`}</span>
				</button>
				<!-- 10/20: 6칸을 지키려고 「푸는 법」 타일을 뺐다 — 푸는 법은 아래 숫자표 링크와 푸터에 있다 -->
				<a class="mode" href="/matchstick/duel" onclick={() => track('mduel_entry_match')}><b>친구와 대결</b><span>같은 5문제로 겨루기</span></a>
				<a class="mode" href="/matchstick/picture"><b>그림 퍼즐</b><span>{picSolved ? `${picSolved} / 10 풀었어요` : '정사각형·강아지·한글'}</span></a>
				<button class="mode" onclick={() => startMode({ type: 'free' })}><b>무한 연습</b><span>제한 없이 계속</span></button>
				<button class="mode" class:on={pick === 'time'} aria-expanded={pick === 'time'} onclick={() => (pick = pick === 'time' ? '' : 'time')}><b>타임어택</b><span>3 · 5 · 10분</span></button>
				<button class="mode" class:on={pick === 'count'} aria-expanded={pick === 'count'} onclick={() => (pick = pick === 'count' ? '' : 'count')}><b>개수 도전</b><span>5 · 10 · 20문제</span></button>
			</div>
			{#if pick === 'time'}
				<div class="opts">
					{#each [180, 300, 600] as sec (sec)}
						<button class="opt" onclick={() => startMode({ type: 'time', seconds: sec })}>
							<b>{sec / 60}분</b>
							{#if bests[`time-${sec}`]}<span class="bst">최고 {bests[`time-${sec}`]}</span>{/if}
						</button>
					{/each}
				</div>
			{:else if pick === 'count'}
				<div class="opts">
					{#each [5, 10, 20] as n (n)}
						<button class="opt" onclick={() => startMode({ type: 'count', total: n })}>
							<b>{n}문제</b>
							{#if bests[`count-${n}`]}<span class="bst">최고 {bests[`count-${n}`]}</span>{/if}
						</button>
					{/each}
				</div>
			{/if}
		</section>

		<!-- 단계 도전(matchStages.ts) — 메인 「단계 도전」 카드가 #stages로 온다 -->
		<section class="sec" id="stages">
			<h2 class="mh">단계 도전</h2>
			<p class="mp">{STAGES.length}단계. 뒤로 갈수록 성냥 2개 옮기기, 빼기, 더하기 문제가 나와요.</p>
			<button class="big" onclick={() => startStage(nextNo)}>
				{nextNo}단계 {Object.keys(stageProgress).length ? '이어하기' : '시작하기'}
				<span class="arr" aria-hidden="true">→</span>
			</button>
			<button class="gridtoggle" aria-expanded={showGrid} onclick={() => (showGrid = !showGrid)}>
				{showGrid ? '단계판 접기' : `${STAGES.length}단계 전체 보기`}
			</button>
			{#if showGrid}
				<div class="sgrid">
					{#each STAGES as _, i (i)}
						{@const no = i + 1}
						{@const st = stageProgress[no] ?? 0}
						<button
							class="stile"
							class:cleared={st > 0}
							disabled={!isUnlocked(stageProgress, no)}
							onclick={() => startStage(no)}
							aria-label={st ? `${no}단계 별 ${st}개` : `${no}단계`}
						>
							<b>{no}</b><span>{'★'.repeat(st)}</span>
						</button>
					{/each}
				</div>
			{/if}
		</section>

		<!-- 검색으로 들어온 사람에게 이 퍼즐이 뭔지 설명한다. 놀이 흐름을 막지 않도록 모드 아래에 둔다. -->
		<section class="sec about">
			<h2 class="mh">성냥개비 퍼즐이란</h2>
			<p class="mp long">
				틀린 등식이 성냥개비로 놓여 있습니다. 성냥 <b>하나만</b> 다른 자리로 옮겨서 등식을 참으로
				만들면 됩니다. 빼거나 더하는 것이 아니라 <b>옮기는</b> 것이라, 판 위의 성냥 개수는 처음과
				끝이 똑같습니다.
			</p>
			<p class="mp long">
				푸는 방법은 크게 둘입니다. 숫자에서 획 하나를 빼서 다른 숫자로 바꾸거나(6→5, 8→0, 9→3),
				연산 기호를 건드리는 것입니다. <b>+에서 세로획을 빼면 −</b>가 되고 그 획이 숫자 쪽으로
				가며, 반대로 <b>−에 획을 얹으면 +</b>가 되면서 숫자 하나가 획을 내놓습니다. 숫자만 붙들고
				있다가 막혔다면 기호 쪽을 살펴보세요.
			</p>
			<p class="mp long">
				준비된 {problems.length}개는 전부 프로그램으로 전수 검증했습니다. 모든 문제가 성냥 하나를
				옮기는 것만으로 풀리고, 숫자의 개수는 바뀌지 않으며, 답이 여러 개로 갈리는 문제는 빼
				두었습니다.
			</p>
			<div class="qa">
				<h3>한 획 차이로 바뀌는 숫자</h3>
				<p>
					획을 <b>더하면</b> 0→8, 1→7, 3→9, 5→6, 5→9, 6→8, 9→8. 획을 <b>빼면</b> 6→5, 7→1, 8→0,
					8→6, 8→9, 9→3, 9→5. 자기 안에서 옮기면 0↔6, 0↔9, 2↔3, 3↔5, 6↔9. 이 표만 외워도 절반은
					풀립니다.
				</p>
			</div>
			<a class="glink" href="/matchstick/guide">전체 숫자표와 4단계 풀이법 보기 →</a>
			<h3 class="kh">해법별로 모아 보기</h3>
			<p class="mp">
				{problems.length}개를 성냥이 어디로 가는지에 따라 셋으로 나눠 두었습니다. 유형마다 요령과 정답이
				정리되어 있어요.
			</p>
			<div class="kinds">
				{#each MATCH_KINDS as k (k.slug)}
					<a class="kind" href="/matchstick/{k.slug}">{k.short}</a>
				{/each}
			</div>
			<h3 class="kh">난이도별로 모아 보기</h3>
			<div class="kinds">
				{#each MATCH_LEVELS as l (l.slug)}
					<a class="kind" href="/matchstick/{l.slug}">{l.title}</a>
				{/each}
			</div>
		</section>

		<OtherGames current="match" />
	</div>

	{:else if screen === 'play'}
	<div class="topbar">
		{#if mode.type === 'time'}
			<div class="timer" class:danger={timeLeft <= 10}><Icon name="timer" size={15} />{timeStr}</div>
			<div class="run-score"><Icon name="correct" size={15} />{runSolved}</div>
		{:else if mode.type === 'today'}
			<div class="run-score">오늘의 성냥개비 · {todayLabel}</div>
		{:else if mode.type === 'count'}
			<div class="run-score">문제 {runResults.length + 1} / {mode.total}</div>
			<div class="emoji-mini">{runResults.map((r) => (r === 'win' ? '✅' : '🔓')).join('')}</div>
		{:else if mode.type === 'stage'}
			<div class="run-score">{mode.no}단계 · {stageIdx + 1} / {STAGES[mode.no - 1].length}</div>
			<div class="rule">{RULE_LABEL[prob.rule]}</div>
		{:else}
			<div class="stats">
				{#if level}<div class="stat-box"><span>난이도</span><b>{level === 'easy' ? '쉬움' : '어려움'}</b></div>{/if}
				<div class="stat-box"><span>성공</span><b>{stats.solved}</b></div>
				<div class="stat-box"><span>연속</span><b>{stats.streak}</b></div>
			</div>
		{/if}
	</div>

	<div class="card">
		{#if cur}
			<div class:shaking>
				<MatchstickBoard
					board={cur}
					{picked}
					onstick={handleStick}
					animateFrom={animFrom}
					label={prob.displayed || undefined}
				/>
			</div>
		{/if}

		{#if feedback}
			<div class="feedback" class:ok={solvedThis === 'won'} role="alert" aria-live="assertive">{feedback}</div>
		{/if}

		{#if solvedThis === 'no' && hintStep > 0}
			{#each ruleHints(prob, prob.rule).slice(0, hintStep) as h}
				<p class="hint"><span>힌트</span>{h}</p>
			{/each}
		{/if}

		{#if solvedThis === 'no'}
			<div class="controls" class:four={mode.type !== 'time' && hintStep < hintMax}>
				<button class="btn ghost" onclick={revert}>처음부터</button>
				{#if mode.type === 'time'}
					<button class="btn ghost" onclick={skip}>건너뛰기</button>
					<button class="btn ghost" onclick={endRun}>끝내기</button>
				{:else}
					{#if hintStep < hintMax}
						<button class="btn ghost" onclick={showHint}>{hintStep === 0 ? '힌트 보기' : '힌트 하나 더'}</button>
					{/if}
					<button class="btn ghost" onclick={reveal}>정답 보기</button>
					<!-- 무한 연습도 풀지 않고 모드 화면으로 돌아갈 길이 있어야 한다 -->
					<button class="btn ghost" onclick={toMenu}>나가기</button>
				{/if}
			</div>
		{:else if mode.type === 'today'}
			<p class="t-after">
				{#if todayWon}🔥 <b>{daily?.streak}일 연속</b> · 내일 자정에 새 문제{:else}내일 문제를 맞히면 연속 기록이 시작돼요{/if}
			</p>
			<!-- 10/15: 오늘의 성냥을 끝낸 순간이 오늘의 10문제로 잇기 가장 좋은 때다(DailyNext 주석의 숫자) -->
			<DailyNext pitch="오늘의 10문제에 성냥개비 2문제가 더 있어요" bind:shown={nextShown} />
			<PushPrompt dayNum={day} streak={daily?.streak ?? 0} tomorrow={tomorrowPeek} slot="match" />
			<button class="btn wide" class:ghost={nextShown} onclick={() => startMode({ type: 'free' })}>무한 연습 이어서 →</button>
			<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
		{:else if mode.type === 'free'}
			{#if freeWins === 3 && solvedThis === 'won'}
				<PushPrompt dayNum={day} tomorrow={tomorrowPeek} slot="match_free" />
			{/if}
			<!-- 검색으로 와서 무한 연습만 하는 사람(10/1~10/13 /matchstick 랜딩의 92%)에게 다섯 문제째에 한 번 -->
			{#if freeWins === 5 && solvedThis === 'won'}
				<DailyNext pitch="오늘의 10문제에 성냥개비 2문제가 더 있어요" />
			{/if}
			<button class="btn wide" onclick={() => nextProblem()}>다음 문제 →</button>
			<button class="btn ghost wide" onclick={share}>기록 공유하기</button>
			<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
		{:else if mode.type === 'stage'}
			<button class="btn wide" onclick={nextInStage}>
				{stageIdx + 1 < STAGES[mode.no - 1].length ? '다음 문제 →' : '단계 결과 보기 →'}
			</button>
			<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
		{/if}
	</div>
{:else if mode.type === 'stage'}
	{@const stars = starsFor(stageResults)}
	{@const sno = mode.no}
	<div class="card result">
		<h2>{mode.no}단계 {stars ? '통과!' : '아쉬워요'}</h2>
		<div class="big-score">{stars ? '★'.repeat(stars) : '☆'}</div>
		<div class="emoji-row">
			{stageResults.map((r) => (r === 'clean' ? '🟩' : r === 'hinted' ? '🟨' : '⬜')).join(' ')}
		</div>
		{#if !stars}<p class="best-line">5문제 중 3문제 이상 풀면 다음 단계가 열려요</p>{/if}
		{#if stars && mode.no < STAGES.length}
			<button class="btn wide" onclick={() => startStage(sno + 1)}>{sno + 1}단계로 →</button>
		{/if}
		<button class="btn ghost wide" onclick={() => startStage(sno)}>이 단계 다시 하기</button>
		<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
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
		<button class="btn wide" onclick={share}>결과 공유 — 친구에게 도전장</button>
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
	/* 이 화면의 구역은 카드(v1부터). 사이는 .menu의 gap이 띄우므로 공통 .sec 여백(v2.css)은 0 */
	.menu > .sec {
		margin-top: 0;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 18px 16px;
	}
	/* 다른 놀이 칸은 다른 화면과 같은 28px — gap 14px가 더해지지 않게 */
	.menu > :global(.other) {
		margin-top: 14px;
	}
	/* ── 메뉴 화면 ── */
	.menu {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	/* 오늘의 성냥개비 — 모드 카드보다 앞에 서는 자리라 강조선으로 구분한다 */
	.today {
		background: var(--panel);
		border: 2px solid var(--accent);
		border-radius: 18px;
		padding: 16px;
	}
	.today.done {
		border-color: var(--border-strong);
	}
	.t-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px 10px;
	}
	.t-streak {
		font-size: 13.5px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.t-board {
		margin: 12px 0 14px;
	}
	.t-done,
	.t-note {
		margin-top: 10px;
		font-size: 13.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.t-done {
		color: var(--text);
		font-weight: 700;
	}
	.t-after {
		margin: 4px 0 0;
		text-align: center;
		font-size: 14.5px;
		line-height: 1.7;
		word-break: keep-all;
	}


	.mh {
		font-size: 16px;
		font-weight: 800;
		margin: 0 0 3px;
	}
	.mp {
		font-size: 12.5px;
		color: var(--muted);
		margin: 0 0 12px;
	}
	.mp.long {
		font-size: 13.5px;
		line-height: 1.8;
		word-break: keep-all;
	}
	.mp.long b {
		color: var(--text);
		font-weight: 700;
	}
	.about .qa {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 13px 15px;
		margin-bottom: 12px;
	}
	.about .qa h3 {
		margin: 0 0 6px;
		font-size: 13.5px;
		font-weight: 800;
		word-break: keep-all;
	}
	.about .qa p {
		margin: 0;
		font-size: 13px;
		line-height: 1.8;
		color: var(--muted);
		word-break: keep-all;
	}
	.about .qa b {
		color: var(--text);
	}
	.glink {
		display: inline-block;
		font-size: 13px;
		font-weight: 700;
		color: var(--accent-text);
		text-decoration: none;
	}
	.glink:hover {
		text-decoration: underline;
	}
	.kh {
		margin: 22px 0 6px;
		font-size: 14.5px;
		font-weight: 800;
		word-break: keep-all;
	}
	.kinds {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}
	.kind {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		padding: 7px 11px;
		text-decoration: none;
	}
	.kind:hover {
		background: var(--panel-2);
	}
	.big {
		width: 100%;
		padding: 15px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow var(--dur-tap) var(--ease-out);
	}
	.big:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	/* 3열 고정 — 예전엔 가로로 넘쳐 버튼이 잘렸다 */
	.opts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.opt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		min-width: 0;
		padding: 13px 4px;
		border-radius: 13px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		color: var(--text);
		font-family: inherit;
		cursor: pointer;
		transition:
			transform var(--dur-tap) var(--ease-out),
			border-color var(--dur-move) ease;
	}
	.opt:hover {
		transform: translateY(-2px);
		border-color: var(--accent-text);
	}
	.opt b {
		font-size: 15px;
		font-weight: 800;
	}
	.bst {
		font-size: 11px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}
	.arr {
		display: inline-block;
		animation: arrm 1.6s var(--ease-out) infinite;
	}
	@keyframes arrm {
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
	@media (prefers-reduced-motion: reduce) {
		.arr {
			animation: none;
		}
	}

	.mroot {
		max-width: 640px;
		margin: 0 auto;
	}
	/* 구 다크 테마의 검정 45% 그림자가 크림색 배경 위에 지저분하게 떠 있었다 */
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 24px 20px;
	}
	.opt {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
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
	}
	.run-score {
		font-size: 17px;
		font-weight: 800;
		color: var(--accent-text);
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
		color: var(--accent-text);
	}
	.feedback {
		margin-top: 14px;
		font-size: 16px;
		font-weight: 800;
		color: var(--danger);
	}
	.feedback.ok {
		color: var(--accent-text);
	}
	.mode.on {
		border-color: var(--accent);
		background: var(--panel);
	}
	.modes + .opts {
		margin-top: 10px;
	}
	.gridtoggle {
		display: block;
		width: 100%;
		margin-top: 10px;
		padding: 11px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted);
		font-size: 13.5px;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
	}
	.sgrid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		margin-top: 12px;
	}
	.stile {
		min-height: 48px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--panel);
		color: var(--text);
		font-family: inherit;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		cursor: pointer;
	}
	.stile b {
		font-size: 14px;
		font-weight: 800;
	}
	.stile span {
		font-size: 10px;
		line-height: 1;
		min-height: 10px;
		color: var(--accent-text);
	}
	.stile.cleared {
		border-color: var(--accent);
	}
	.stile:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.rule {
		font-size: 13px;
		font-weight: 800;
		color: var(--accent-text);
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
	/* 힌트 버튼까지 넷이면 휴대폰 폭에서 글자가 끼므로 2×2로 */
	.controls.four {
		flex-wrap: wrap;
	}
	.controls.four .btn {
		flex: 1 1 calc(50% - 5px);
	}
	.hint {
		margin: 10px 0 0;
		padding: 10px 13px;
		background: var(--panel-2);
		border-left: 3px solid var(--accent);
		border-radius: 0 12px 12px 0;
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.hint span {
		margin-right: 8px;
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-text);
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
		color: var(--accent-text);
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
	/* 구 다크 테마의 남색 배경 + 어두운 글자 조합이 남아 글자가 안 보였다 — 현 토큰으로 교체 */
	.toast {
		position: fixed;
		/* 휴대폰은 하단 탭 위(--tab-h, 레이아웃) — 탭 아래 층이라 가려졌다 */
		bottom: calc(24px + var(--tab-h, 0px));
		left: 50%;
		transform: translateX(-50%);
		background: var(--text);
		color: #fff;
		border-radius: 12px;
		padding: 12px 24px;
		font-size: 14px;
		z-index: 30;
		box-shadow: 0 8px 30px rgba(44, 40, 34, 0.3);
	}
</style>
