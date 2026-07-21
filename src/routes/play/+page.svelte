<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { PROBLEMS, type Problem } from '$lib/problems';
	import { TRIVIA } from '$lib/trivia';
	import { buildSession, comboScore, isCorrectText } from '$lib/game';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	type Filter = 'all' | 'puzzle' | 'trivia';
	type Screen = 'menu' | 'play' | 'result';

	let screen = $state<Screen>('menu');
	let filter = $state<Filter>('all');
	let sessionSize = $state(10);

	let queue = $state<Problem[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let combo = $state(0);
	let maxCombo = $state(0);
	let correctCount = $state(0);
	let results = $state<('o' | 'x')[]>([]);

	let hintsUsed = $state(0);
	let done = $state(false);
	let answerValue = $state('');
	let feedback = $state<{ msg: string; ok: boolean } | null>(null);
	let toastMsg = $state('');

	let best = $state<Record<string, number>>({});

	let current = $derived(queue[idx]);
	let shownHints = $derived(
		current && !current.trivia && current.hints ? current.hints.slice(0, hintsUsed) : []
	);
	let bestKey = $derived(`${filter}-${sessionSize}`);

	function pool(f: Filter): Problem[] {
		if (f === 'puzzle') return PROBLEMS;
		if (f === 'trivia') return TRIVIA;
		return [...PROBLEMS, ...TRIVIA];
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
		done = false;
		answerValue = '';
		feedback = null;
		if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function finish(win: boolean) {
		if (done) return;
		done = true;
		if (win) {
			const base = current.trivia ? 100 : Math.max(20, 100 - hintsUsed * 25);
			const gained = comboScore(base, combo);
			score += gained;
			combo += 1;
			maxCombo = Math.max(maxCombo, combo);
			correctCount += 1;
			results = [...results, 'o'];
			feedback = { msg: `정답! +${gained}${combo > 1 ? ` (콤보 x${combo})` : ''}`, ok: true };
		} else {
			combo = 0;
			results = [...results, 'x'];
			feedback = { msg: '아쉬워요', ok: false };
		}
	}

	function submitText() {
		if (done || !answerValue.trim()) return;
		if (isCorrectText(current, answerValue)) finish(true);
		else feedback = { msg: '땡! 다시 생각해 보세요', ok: false };
	}
	function submitChoice(i: number) {
		if (done) return;
		finish(i === current.answerIndex);
	}
	function showHint() {
		if (done || current.trivia || !current.hints || hintsUsed >= current.hints.length) return;
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

	function share() {
		const fname = { all: '전체 믹스', puzzle: '발견형', trivia: '상식퀴즈' }[filter];
		const text = `딸깍! 연속 모드 ${fname} ${sessionSize}문제 — ${correctCount}개 정답 · ${score}점 🔥\n${'⭐'.repeat(Math.min(maxCombo, 10))}\n너도 도전! ${location.origin}/play`;
		if (navigator.share) navigator.share({ text }).catch(() => {});
		else if (navigator.clipboard?.writeText)
			navigator.clipboard.writeText(text).then(
				() => toast('결과 복사됨 — 친구에게 도전장을 보내세요!'),
				() => toast('복사 실패')
			);
		else toast('복사를 지원하지 않는 브라우저');
	}

	const FILTERS: { key: Filter; label: string; sub: string }[] = [
		{ key: 'all', label: '전체 믹스', sub: '발견형+상식 200문제' },
		{ key: 'puzzle', label: '발견형 퍼즐', sub: '숨은 규칙 찾기 100' },
		{ key: 'trivia', label: '상식 퀴즈', sub: '수도·역사·과학 100' }
	];
	const SIZES = [5, 10, 20];

	onMount(load);
</script>

<svelte:head>
	<title>연속 모드 — 딸깍</title>
	<meta
		name="description"
		content="문제은행에서 랜덤으로 계속! 발견형 퍼즐과 상식 퀴즈를 5·10·20문제 연속으로 풀고 콤보 점수에 도전하세요."
	/>
</svelte:head>

<div class="mroot">
	{#if screen === 'menu'}
		<div class="card menu">
			<h2>🎯 연속 모드</h2>
			<p class="desc">문제은행에서 랜덤 출제. <b>콤보</b>를 이어 최고 점수에 도전하세요.</p>

			<div class="label">무엇을 풀까요?</div>
			<div class="filters">
				{#each FILTERS as f (f.key)}
					<button class="filter" class:on={filter === f.key} onclick={() => (filter = f.key)}>
						<b>{f.label}</b><span>{f.sub}</span>
					</button>
				{/each}
			</div>

			<div class="label">몇 문제?</div>
			<div class="sizes">
				{#each SIZES as s (s)}
					<button class="size" onclick={() => start(s)}>
						{s}문제
						{#if best[`${filter}-${s}`]}<span class="best">최고 {best[`${filter}-${s}`]}</span>{/if}
					</button>
				{/each}
			</div>

			<AdSlot label="연속 모드" />
		</div>
	{:else if screen === 'play' && current}
		<div class="topbar">
			<div class="tb-item">문제 {idx + 1} / {queue.length}</div>
			<div class="tb-item score">{score}점</div>
			<div class="tb-item" class:hot={combo >= 2}>🔥 콤보 {combo}</div>
		</div>
		<div class="card">
			<div class="chip" class:triv={current.trivia}>{current.chip}</div>
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
								class:correct={done && i === current.answerIndex}
								disabled={done}
								onclick={() => submitChoice(i)}>{c}</button
							>
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
					{#if !current.trivia && current.hints}
						<button class="btn ghost" disabled={hintsUsed >= 3} onclick={showHint}>
							{hintsUsed >= 3 ? '힌트 소진' : `💡 힌트 (${hintsUsed + 1}/3)`}
						</button>
					{/if}
					<button class="btn ghost" onclick={() => finish(false)}>모르겠어요</button>
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
					{idx + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
				</button>
			{/if}
		</div>
	{:else if screen === 'result'}
		<div class="card result">
			<h2>세션 완료!</h2>
			<div class="emoji">{results.map((r) => (r === 'o' ? '🟢' : '⚪')).join(' ')}</div>
			<div class="rscore">{score}<span class="unit">점</span></div>
			<div class="rmeta">{correctCount}/{queue.length} 정답 · 최고 콤보 {maxCombo}</div>
			{#if score >= (best[bestKey] ?? 0) && score > 0}<div class="newbest">🏆 신기록!</div>{/if}
			<button class="btn wide" onclick={share}>결과 공유 — 친구에게 도전장</button>
			<button class="btn ghost wide" onclick={() => start(sessionSize)}>다시 하기</button>
			<button class="btn ghost wide" onclick={() => (screen = 'menu')}>모드 선택으로</button>
			<AdSlot label="결과" />
		</div>
	{/if}
</div>

{#if toastMsg}
	<div class="toast">{toastMsg}</div>
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
	.chip {
		display: inline-block;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 12px;
		font-weight: 800;
		border-radius: 999px;
		padding: 6px 15px;
		margin-bottom: 20px;
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
	}
	.btn:hover:not(:disabled) {
		filter: brightness(1.06);
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
	}
	.choice:hover:not(:disabled) {
		border-color: var(--accent);
		background: #fff;
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
