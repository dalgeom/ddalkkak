<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { PROBLEMS, GRADES, type Problem, type Grade } from '$lib/problems';
	import { TRIVIA } from '$lib/trivia';
	import {
		buildSession,
		comboScore,
		isCorrectText,
		hintUnlocked,
		isCloseAnswer,
		wanderBonus,
		displayChoices
	} from '$lib/game';
	import { shareResult, outcomeMessage } from '$lib/shareCard';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Icon from '$lib/components/Icon.svelte';

	type Filter = 'all' | 'puzzle' | 'trivia';
	type Screen = 'menu' | 'play' | 'result';

	let screen = $state<Screen>('menu');
	let filter = $state<Filter>('all');
	let grade = $state<Grade | 'all'>('all');
	let cat = $state<string>('all');
	let showCats = $state(false);
	let sessionSize = $state(10);

	/** 상식 퀴즈에 존재하는 카테고리 목록 */
	const CATS = [...new Set(TRIVIA.map((t) => t.category!))].sort();

	let queue = $state<Problem[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let combo = $state(0);
	let maxCombo = $state(0);
	let correctCount = $state(0);
	let results = $state<('o' | 'x')[]>([]);

	let hintsUsed = $state(0);
	let wrongAttempts = $state(0);
	let startedAt = $state(0);
	let elapsedMs = $state(0);
	let tickIv: ReturnType<typeof setInterval> | undefined;
	let done = $state(false);
	let answerValue = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let judge = $state<'correct' | 'wrong' | 'giveup' | null>(null);

	/** 입력창·선택지가 판정에 직접 반응하도록 하는 일시 상태 */
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
	let toastMsg = $state('');

	let best = $state<Record<string, number>>({});

	let current = $derived(displayChoices(queue[idx]));
	let shownHints = $derived(
		current && !current.trivia && current.hints ? current.hints.slice(0, hintsUsed) : []
	);
	let bestKey = $derived(`${filter}-${grade}-${cat}-${sessionSize}`);
	let availCount = $derived(pool(filter).length);

	/** 상식 퀴즈에 난이도·카테고리 필터 적용 */
	function triviaPool(): Problem[] {
		return TRIVIA.filter(
			(t) => (grade === 'all' || t.grade === grade) && (cat === 'all' || t.category === cat)
		);
	}
	function pool(f: Filter): Problem[] {
		if (f === 'puzzle') return PROBLEMS;
		if (f === 'trivia') return triviaPool();
		return [...PROBLEMS, ...triviaPool()];
	}

	function load() {
		try {
			best = JSON.parse(localStorage.getItem('ddal.play.best') || '{}');
		} catch {
			/* 무시 */
		}
	}
	function saveBest() {
		if (!browser) return;
		try {
			localStorage.setItem('ddal.play.best', JSON.stringify(best));
		} catch {
			/* 무시 */
		}
	}

	function start(size: number) {
		sessionSize = size;
		queue = buildSession(pool(filter), size);
		idx = 0;
		score = 0;
		combo = 0;
		maxCombo = 0;
		correctCount = 0;
		results = [];
		screen = 'play';
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
		judge = null;
		clearTimeout(flashTimer);
		inputState = 'idle';
		flashIndex = null;
		flashKind = null;
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
		// 데스크톱에서만 새 문제의 입력창에 포커스(모바일은 키보드가 튀어 방해되므로 제외)
		if (browser && window.matchMedia?.('(hover: hover)').matches) {
			tick().then(() => inputEl?.focus());
		}
	}

	function finish(win: boolean, reason: 'answered' | 'giveup' = 'answered') {
		if (done) return;
		done = true;
		judge = win ? 'correct' : reason === 'giveup' ? 'giveup' : 'wrong';
		if (win) {
			const base =
				(current.trivia ? 100 : Math.max(20, 100 - hintsUsed * 25)) +
				wanderBonus(hintsUsed, wrongAttempts);
			const gained = comboScore(base, combo);
			score += gained;
			combo += 1;
			maxCombo = Math.max(maxCombo, combo);
			correctCount += 1;
			results = [...results, 'o'];
			feedback = { msg: `정답 · +${gained}${combo > 1 ? ` (콤보 x${combo})` : ''}`, ok: true };
		} else {
			combo = 0;
			results = [...results, 'x'];
			feedback = {
				msg: reason === 'giveup' ? '정답을 확인했어요' : '오답이에요',
				ok: false
			};
		}
	}

	function submitText() {
		if (done || !answerValue.trim()) return;
		if (isCorrectText(current, answerValue)) {
			flash('correct');
			finish(true);
		} else {
			wrongAttempts += 1;
			flash('wrong');
			judge = 'wrong';
			feedback = isCloseAnswer(current, answerValue)
				? { msg: '거의 다 왔어요', ok: false }
				: { msg: '아직이에요 — 다시 들여다볼까요?', ok: false };
		}
	}
	function submitChoice(i: number) {
		if (done) return;
		const ok = i === current.answerIndex;
		flash(ok ? 'correct' : 'wrong', i);
		finish(ok);
	}
	function showHint() {
		if (done || current.trivia || !current.hints || hintsUsed >= current.hints.length) return;
		if (!hintUnlocked(hintsUsed, elapsedMs, wrongAttempts)) return;
		hintsUsed += 1;
	}

	function next() {
		idx += 1;
		if (idx < queue.length) resetProblem();
		else endSession();
	}

	function endSession() {
		if (score > (best[bestKey] ?? 0)) {
			best[bestKey] = score;
			saveBest();
		}
		screen = 'result';
	}

	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2400);
	}

	async function share() {
		const fname = { all: '전체 믹스', puzzle: '발견형', trivia: '상식퀴즈' }[filter];
		const gradeLabel = grade === 'all' ? '' : ` ${grade}`;
		const catLabel = cat === 'all' ? '' : ` ${cat}`;
		const title = `연속 모드 · ${fname}${gradeLabel}${catLabel} ${sessionSize}문제`;
		const text = `딸깍! ${title} — ${correctCount}개 정답 · ${score}점\n너도 도전! ${location.origin}/play`;
		const outcome = await shareResult(
			{
				title,
				scoreLabel: `${score}점`,
				emojiRow: results.map((r) => (r === 'o' ? '🟢' : '⚪')).join(''),
				subLine: `${correctCount}/${queue.length} 정답 · 최고 콤보 ${maxCombo}`,
				cta: '내 점수 넘어볼래?'
			},
			text
		);
		toast(outcomeMessage(outcome));
	}

	const FILTERS: { key: Filter; label: string; sub: string }[] = [
		{
			key: 'all',
			label: '전체 믹스',
			sub: `발견형 ${PROBLEMS.length} + 상식 ${TRIVIA.length}문제`
		},
		{ key: 'puzzle', label: '발견형 퍼즐', sub: `숨은 규칙 찾기 ${PROBLEMS.length}문제` },
		{
			key: 'trivia',
			label: '상식 퀴즈',
			sub: `${CATS.length}개 분야 · 4단계 난이도 ${TRIVIA.length}문제`
		}
	];
	const SIZES = [5, 10, 20];

	onMount(() => {
		load();
		// 허브의 분야·난이도 링크로 들어오면 메뉴를 미리 맞춰준다(문제 수는 사용자가 고른다)
		const q = page.url.searchParams;
		const f = q.get('filter');
		if (f === 'all' || f === 'puzzle' || f === 'trivia') filter = f;
		const g = q.get('grade');
		if (g && GRADES.some((x) => x.key === g)) grade = g as Grade;
		const c = q.get('cat');
		if (c && CATS.includes(c)) {
			cat = c;
			showCats = true;
		}
		tickIv = setInterval(() => {
			if (screen === 'play' && !done && startedAt) elapsedMs = Date.now() - startedAt;
		}, 1000);
		return () => clearInterval(tickIv);
	});
</script>

<svelte:head>
	<title>연속 모드 — 딸깍</title>
	<meta
		name="description"
		content="문제은행에서 랜덤으로 계속! 발견형 퍼즐과 상식 퀴즈를 5·10·20문제 연속으로 풀고 콤보 점수에 도전하세요."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/play" />
	<meta property="og:title" content="연속 모드 — 딸깍" />
	<meta property="og:description" content="문제은행에서 랜덤으로 계속! 발견형 퍼즐과 상식 퀴즈를 5·10·20문제 연속으로 풀고 콤보 점수에 도전하세요." />
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/play" />
</svelte:head>

<div class="mroot">
	{#if screen === 'menu'}
		<div class="card menu">
			<h2>연속 모드</h2>
			<p class="desc">문제은행에서 랜덤 출제. <b>콤보</b>를 이어 최고 점수에 도전하세요.</p>

			<div class="label">무엇을 풀까요?</div>
			<div class="filters">
				{#each FILTERS as f (f.key)}
					<button class="filter" class:on={filter === f.key} onclick={() => (filter = f.key)}>
						<b>{f.label}</b><span>{f.sub}</span>
					</button>
				{/each}
			</div>

			{#if filter !== 'puzzle'}
				<div class="label">난이도</div>
				<div class="pills">
					<button class="pill" class:on={grade === 'all'} onclick={() => (grade = 'all')}
						>전체</button
					>
					{#each GRADES as g (g.key)}
						<button class="pill" class:on={grade === g.key} onclick={() => (grade = g.key)}
							>{g.label}</button
						>
					{/each}
				</div>

				<div class="label">
					분야
					<button class="more" onclick={() => (showCats = !showCats)}>
						{showCats ? '접기' : `${cat === 'all' ? '전체' : cat} · 바꾸기`}
					</button>
				</div>
				{#if showCats}
					<div class="pills wrap">
						<button class="pill" class:on={cat === 'all'} onclick={() => (cat = 'all')}>전체</button>
						{#each CATS as c (c)}
							<button class="pill" class:on={cat === c} onclick={() => (cat = c)}>{c}</button>
						{/each}
					</div>
				{/if}
			{/if}

			<div class="label">몇 문제? <span class="avail">선택된 문제 {availCount}개</span></div>
			<div class="sizes">
				{#each SIZES as s (s)}
					<button class="size" disabled={availCount === 0} onclick={() => start(s)}>
						{s}문제
						{#if best[`${filter}-${grade}-${cat}-${s}`]}<span class="best"
								>최고 {best[`${filter}-${grade}-${cat}-${s}`]}</span
							>{/if}
					</button>
				{/each}
			</div>
			{#if availCount === 0}
				<div class="warn">이 조합에 문제가 없어요. 난이도나 분야를 바꿔 보세요.</div>
			{:else if availCount < 5}
				<div class="warn">문제가 {availCount}개뿐이라 그만큼만 출제됩니다.</div>
			{/if}

			<AdSlot label="연속 모드" />
		</div>
	{:else if screen === 'play' && current}
		<div class="topbar">
			<div class="tb-item">문제 {idx + 1} / {queue.length}</div>
			<div class="tb-item score">{score}점</div>
			<div class="tb-item" class:hot={combo >= 2}>콤보 {combo}</div>
		</div>
		{#key current.id}
		<div class="card slide">
			<div class="chiprow">
				<span class="chip" class:triv={current.trivia}>{current.chip}</span>
				{#if current.grade}
					<span class="gradechip">{GRADES.find((g) => g.key === current.grade)?.label}</span>
				{/if}
			</div>
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
								class:correct={done && i === current.answerIndex}
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
							bind:this={inputEl}
							class:flash-wrong={inputState === 'wrong'}
							class:flash-correct={inputState === 'correct'}
							placeholder="정답을 입력하세요"
							aria-label="정답 입력"
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
					{#if !current.trivia && current.hints}
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
					<button class="btn ghost" onclick={() => finish(false, 'giveup')}>모르겠어요</button>
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

			{#if done}
				<div class="explain" class:win={feedback?.ok} class:giveup={!feedback?.ok}>
					<div class="explain-head">
						<Icon name={feedback?.ok ? 'correct' : 'giveup'} size={15} />
						<span>{feedback?.ok ? '정답 풀이' : '정답 공개'}</span>
					</div>
					{@html current.explain}
				</div>
				<button class="btn wide" onclick={next}>
					{idx + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
				</button>
			{/if}
		</div>
		{/key}
	{:else if screen === 'result'}
		<div class="card result">
			<h2>세션 완료!</h2>
			<div class="emoji">{results.map((r) => (r === 'o' ? '🟢' : '⚪')).join(' ')}</div>
			<div class="rscore">{score}<span class="unit">점</span></div>
			<div class="rmeta">{correctCount}/{queue.length} 정답 · 최고 콤보 {maxCombo}</div>
			{#if score >= (best[bestKey] ?? 0) && score > 0}
				<div class="newbest"><Icon name="trophy" size={16} /> 신기록!</div>
			{/if}
			<button class="btn wide" onclick={share}>결과 공유 — 친구에게 도전장</button>
			<button class="btn ghost wide" onclick={() => start(sessionSize)}>다시 하기</button>
			<button class="btn ghost wide" onclick={() => (screen = 'menu')}>모드 선택으로</button>
			<AdSlot label="결과" />
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
	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 30px 26px;
		box-shadow: 0 4px 22px rgba(60, 50, 30, 0.07);
	}
	@media (max-width: 640px) {
		.card {
			padding: 22px 18px;
		}
	}
	.menu h2 {
		font-size: 26px;
		margin-bottom: 4px;
	}
	.desc {
		font-size: 15px;
		color: var(--muted);
		margin-bottom: 20px;
	}
	.desc :global(b) {
		color: var(--accent);
	}
	.label {
		font-size: 13px;
		font-weight: 800;
		color: var(--muted);
		margin: 16px 0 10px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.avail {
		font-weight: 600;
		color: #b3a894;
	}
	.more {
		margin-left: auto;
		background: transparent;
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		padding: 4px 12px;
		font-size: 11px;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
		font-family: inherit;
	}
	.pills {
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
	}
	.pills.wrap {
		max-height: 190px;
		overflow-y: auto;
	}
	.pill {
		background: var(--panel-2);
		border: 2px solid var(--border);
		border-radius: 999px;
		padding: 9px 15px;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text);
		cursor: pointer;
		font-family: inherit;
		transition:
			border-color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out),
			color var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.pill:hover:not(.on) {
		border-color: var(--border-strong);
		background: #fff;
		transform: translateY(-1px);
	}
	.pill:active {
		transform: translateY(1px) scale(0.98);
	}
	.pill.on {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent);
	}
	.warn {
		margin-top: 10px;
		font-size: 12.5px;
		color: var(--accent-2);
		font-weight: 700;
	}
	.size:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.filters {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.filter {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		background: var(--panel-2);
		border: 2px solid var(--border);
		border-radius: 12px;
		padding: 13px 16px;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		color: var(--text);
		transition:
			border-color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out),
			box-shadow 0.18s var(--ease-out);
	}
	.filter:hover:not(.on) {
		border-color: var(--border-strong);
		background: #fff;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(44, 40, 34, 0.08);
	}
	.filter:active {
		transform: translateY(0) scale(0.995);
	}
	.filter b {
		font-size: 16px;
	}
	.filter span {
		font-size: 12px;
		color: var(--muted);
	}
	.filter.on {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.sizes {
		display: flex;
		gap: 10px;
	}
	.size {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 12px;
		padding: 17px 8px;
		font-size: 16px;
		font-weight: 800;
		cursor: pointer;
		font-family: inherit;
	}
	.size:hover {
		filter: brightness(1.06);
	}
	.size .best {
		font-size: 10px;
		font-weight: 600;
		opacity: 0.9;
	}
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		gap: 8px;
	}
	.tb-item {
		font-size: 14px;
		font-weight: 800;
		color: var(--muted);
	}
	.tb-item.score {
		color: var(--accent);
	}
	.tb-item.hot {
		color: var(--accent-2);
	}
	.chiprow {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}
	.chip {
		display: inline-block;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 800;
		border-radius: 999px;
		padding: 6px 15px;
	}
	.gradechip {
		display: inline-block;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		color: var(--muted);
		font-size: 11.5px;
		font-weight: 800;
		border-radius: 999px;
		padding: 5px 12px;
	}
	.chip.triv {
		background: #f3ead4;
		color: #a9791a;
	}
	.q {
		container-type: inline-size;
		min-height: 60px;
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
		margin-top: 20px;
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
		box-shadow: 0 1px 2px rgba(44, 40, 34, 0.16);
		transition:
			transform var(--dur-tap) var(--ease-out),
			box-shadow 0.18s var(--ease-out),
			filter 0.18s var(--ease-out);
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
	.choice:hover:not(:disabled) {
		border-color: var(--accent);
		background: #fff;
		transform: translateY(-1px);
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
	.choice.correct {
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.choice:disabled {
		opacity: 0.75;
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
	}
	.hint b {
		color: #a9791a;
		margin-right: 8px;
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
	.explain.giveup {
		background: var(--giveup-soft);
		border: 1px solid var(--giveup-border);
		color: #6b4d1c;
	}
	.explain.giveup .explain-head {
		color: var(--giveup);
	}
	.result {
		text-align: center;
		padding: 38px 24px;
	}
	.result h2 {
		font-size: 24px;
		margin-bottom: 12px;
	}
	.emoji {
		font-size: 22px;
		letter-spacing: 2px;
		margin: 10px 0;
		word-break: break-all;
	}
	.rscore {
		font-size: 52px;
		font-weight: 900;
		color: var(--accent);
		margin: 6px 0;
	}
	.rscore .unit {
		font-size: 22px;
		color: var(--muted);
	}
	.rmeta {
		font-size: 14px;
		color: var(--muted);
		margin-bottom: 8px;
	}
	.newbest {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 17px;
		font-weight: 900;
		color: var(--accent-2);
		margin-bottom: 10px;
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
