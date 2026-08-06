<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import problems from '$lib/data/matchstick-problems.json';
	import { parseEq, cloneBoard, isSolved, bit, type Board } from '$lib/matchstick';
	import { MATCH_KINDS } from '$lib/matchstickKinds';
	import { shareResult as shareCardResult, outcomeMessage } from '$lib/shareCard';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	type Mode =
		| { type: 'free' }
		| { type: 'time'; seconds: number }
		| { type: 'count'; total: number };

	let screen = $state<'menu' | 'play' | 'result'>('menu');
	let mode = $state<Mode>({ type: 'free' });

	let done = $state<number[]>([]);
	let stats = $state({ solved: 0, streak: 0, best: 0 });
	let bests = $state<Record<string, number>>({});

	let pIdx = $state(-1);
	let orig = $state<Board | null>(null);
	let cur = $state<Board | null>(null);
	/** 정답 공개 시 원래 배치 — 성냥이 집혔다 날아가 안착하는 연출에 쓴다.
	    홈·연속모드엔 있었는데 여기만 보드가 툭 바뀌어서 뭐가 움직였는지 알 수 없었다. */
	let animFrom = $state<Board | null>(null);
	let picked = $state<PickLoc | null>(null);
	let attempts = $state(0);
	let solvedThis = $state<'no' | 'won' | 'revealed'>('no');
	let feedback = $state('');
	let shaking = $state(false);
	let toastMsg = $state('');

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
		return 'free';
	}
	function modeLabel(m: Mode): string {
		if (m.type === 'time') return `타임어택 ${m.seconds / 60}분`;
		if (m.type === 'count') return `${m.total}문제 도전`;
		return '무한 연습';
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
		screen = 'menu';
	}

	function nextProblem(first = false) {
		const forced = Number(page.url.searchParams.get('p'));
		let idx: number;
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
		animFrom = null;
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
		// 원래 배치에서 성냥이 날아가 정답 자리에 안착하는 연출로 보여준다
		if (orig) animFrom = cloneBoard(orig);
		cur = parseEq(problems[pIdx].solution);
		picked = null;
		solvedThis = 'revealed';
		stats.streak = 0;
		markDone();
		persist();
		feedback = `정답: ${problems[pIdx].solution.replace('-', '−')}`;
		if (mode.type === 'count') {
			runResults = [...runResults, 'fail'];
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
		if (page.url.searchParams.has('p')) startMode({ type: 'free' });
	});
	onDestroy(() => clearInterval(timerId));
</script>

<svelte:head>
	<title>성냥개비 퍼즐 {problems.length}문제 — 하나만 옮겨 식 완성 | 딸깍</title>
	<meta
		name="description"
		content="성냥개비 문제 {problems.length}개를 무료로. 성냥 하나만 옮겨 틀린 등식을 참으로 만드는 고전 퍼즐 — 무한 연습·타임어택·개수 도전 모드로 원하는 만큼 풀어보세요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick" />
	<meta property="og:title" content="성냥개비 퍼즐 {problems.length}문제 — 하나만 옮겨 식 완성 | 딸깍" />
	<meta property="og:description" content="성냥 하나만 옮겨 등식을 참으로! 무한 연습·타임어택·개수 도전." />
	<meta property="og:url" content="https://ddalkkak.app/matchstick" />
</svelte:head>

<div class="mroot">
{#if screen === 'menu'}
	<div class="menu">
		<header class="mcover">
			<span class="kicker">성냥개비</span>
			<h1>성냥 <b>하나만</b> 옮겨<br />틀린 식을 참으로</h1>
			<p class="mlead">획을 눌러 집고, 빈 자리를 눌러 놓으면 됩니다. 준비된 문제 {problems.length}개.</p>
			<div class="mstats">
				<div class="ms"><b>{stats.solved}</b><span>푼 판</span></div>
				<div class="ms"><b>{stats.best}</b><span>최고 연속</span></div>
				<div class="ms"><b>{problems.length - done.length}</b><span>남은 새 문제</span></div>
			</div>
		</header>

		<!-- 처음 온 사람이 푸는 법을 찾을 수 있어야 한다(문장 속 링크는 눈에 안 띈다) -->
		<a class="gbanner" href="/matchstick/guide">
			<span class="gb-txt">
				<b>성냥개비가 처음이라면</b>
				<span>한 획 차이 숫자표로 푸는 법 익히기</span>
			</span>
			<span class="gb-go" aria-hidden="true">→</span>
		</a>

		<section class="msec">
			<h2 class="mh">무한 연습</h2>
			<p class="mp">시간·개수 제한 없이 계속 풉니다.</p>
			<button class="big" onclick={() => startMode({ type: 'free' })}>
				시작하기 <span class="arr" aria-hidden="true">→</span>
			</button>
		</section>

		<section class="msec">
			<h2 class="mh">타임어택</h2>
			<p class="mp">제한 시간 안에 최대한 많이.</p>
			<div class="opts">
				{#each [180, 300, 600] as sec (sec)}
					<button class="opt" onclick={() => startMode({ type: 'time', seconds: sec })}>
						<b>{sec / 60}분</b>
						{#if bests[`time-${sec}`]}<span class="bst">최고 {bests[`time-${sec}`]}</span>{/if}
					</button>
				{/each}
			</div>
		</section>

		<section class="msec">
			<h2 class="mh">개수 도전</h2>
			<p class="mp">시간은 무제한, 정해진 개수를 끝까지.</p>
			<div class="opts">
				{#each [5, 10, 20] as n (n)}
					<button class="opt" onclick={() => startMode({ type: 'count', total: n })}>
						<b>{n}문제</b>
						{#if bests[`count-${n}`]}<span class="bst">최고 {bests[`count-${n}`]}</span>{/if}
					</button>
				{/each}
			</div>
		</section>

		<!-- 검색으로 들어온 사람에게 이 퍼즐이 뭔지 설명한다. 놀이 흐름을 막지 않도록 모드 아래에 둔다. -->
		<section class="msec about">
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
		</section>
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
				<MatchstickBoard
					board={cur}
					{picked}
					onstick={handleStick}
					animateFrom={animFrom}
					label={pIdx >= 0 ? problems[pIdx].displayed : undefined}
				/>
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
					<!-- 무한 연습도 풀지 않고 모드 화면으로 돌아갈 길이 있어야 한다 -->
					<button class="btn ghost" onclick={toMenu}>나가기</button>
				{/if}
			</div>
		{:else if mode.type === 'free'}
			<button class="btn wide" onclick={() => nextProblem()}>다음 문제 →</button>
			<button class="btn ghost wide" onclick={share}>기록 공유하기</button>
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
	/* ── 메뉴 화면 ── */
	.menu {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.mcover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 24px 20px 20px;
	}
	.kicker {
		display: inline-block;
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.4px;
		color: var(--accent);
		background: var(--correct-bg);
		border-radius: 7px;
		padding: 4px 11px;
	}
	.mcover h1 {
		margin: 12px 0 8px;
		font-size: 24px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	.mcover h1 b {
		color: var(--accent);
	}
	.mlead {
		font-size: 13.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	/* 풀이 가이드 배너 — 모드 카드와 구분되게 왼쪽 강조선 + 연한 바탕 */
	.gbanner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: 14px;
		padding: 13px 15px;
		text-decoration: none;
		color: inherit;
		transition:
			transform var(--dur-tap) var(--ease-out),
			border-color var(--dur-move) ease;
	}
	.gbanner:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
	}
	.gb-txt b {
		display: block;
		font-size: 14.5px;
		font-weight: 800;
		margin-bottom: 2px;
	}
	.gb-txt > span {
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.55;
		word-break: keep-all;
	}
	.gb-go {
		flex: none;
		font-size: 17px;
		font-weight: 800;
		color: var(--accent);
	}
	.mstats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 16px;
	}
	.ms {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 11px 6px;
		text-align: center;
	}
	.ms b {
		display: block;
		font-size: 18px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.ms span {
		font-size: 11.5px;
		color: var(--muted-2);
	}


	.msec {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
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
		color: var(--accent);
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
		border-color: var(--accent);
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
	@media (min-width: 768px) {
		.mcover {
			padding: 32px 28px 26px;
		}
		.mcover h1 {
			font-size: 28px;
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
	/* 구 다크 테마의 남색 배경 + 어두운 글자 조합이 남아 글자가 안 보였다 — 현 토큰으로 교체 */
	.toast {
		position: fixed;
		bottom: 32px;
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
