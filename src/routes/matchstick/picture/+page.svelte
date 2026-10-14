<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { track } from '$lib/analytics';
	import { GRID_PUZZLES, judgeGrid, gridMoved, type GridPuzzle } from '$lib/matchGrid';
	import MatchGridBoard from '$lib/components/MatchGridBoard.svelte';

	/**
	 * 그림 성냥(2026-10-14) — 네모 격자에서 성냥을 옮겨 정사각형을 만들거나 그림을 바꾼다.
	 * /matchstick의 등식 문제와 달리 칸의 변이면 어디든 놓을 수 있다(matchGrid.ts).
	 * 목록(지문 포함)은 서버에서 그려진다 — 「성냥개비 그림 퍼즐」로 들어온 사람이 무엇이 있는지 바로 본다.
	 */

	const KEY = 'ddal.match.pic';
	let solved = $state<string[]>([]);

	let cur = $state<GridPuzzle | null>(null);
	let lit = $state<string[]>([]);
	let picked = $state<string | null>(null);
	let status = $state<'no' | 'won' | 'revealed'>('no');
	let feedback = $state('');
	let hintOpen = $state(false);
	let shaking = $state(false);
	let attempts = $state(0);

	let moved = $derived(cur ? gridMoved(cur, new Set(lit)).removed : 0);
	let idx = $derived(cur ? GRID_PUZZLES.findIndex((p) => p.id === cur!.id) : -1);

	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem(KEY, JSON.stringify(solved));
		} catch {
			/* 진행이 안 남을 뿐 놀이는 막지 않는다 */
		}
	}

	function open(p: GridPuzzle) {
		cur = p;
		lit = [...p.start];
		picked = null;
		status = 'no';
		feedback = '';
		hintOpen = false;
		attempts = 0;
		track('match_pic_start', { id: p.id });
		if (browser) window.scrollTo({ top: 0 });
	}

	function reset() {
		if (!cur) return;
		lit = [...cur.start];
		picked = null;
		feedback = '';
	}

	function onedge(e: string, on: boolean) {
		if (!cur || status !== 'no') return;
		if (!picked) {
			if (!on) return;
			picked = e;
			lit = lit.filter((x) => x !== e);
			return;
		}
		if (on) return;
		lit = [...lit, e];
		const wasSame = e === picked;
		picked = null;
		if (wasSame) return; // 집었던 자리에 도로 놓았다
		const r = judgeGrid(cur, new Set(lit));
		if (r === 'more') {
			feedback = '';
			return;
		}
		if (r === 'solved') {
			status = 'won';
			feedback = attempts === 0 ? '딸깍! 한 번에 맞혔어요' : `딸깍! ${attempts + 1}번 만에 맞혔어요`;
			if (!solved.includes(cur.id)) solved = [...solved, cur.id];
			persist();
			track('match_pic_solve', { id: cur.id, hint: hintOpen });
			return;
		}
		attempts++;
		feedback = '아직 아니에요!';
		shaking = true;
		setTimeout(() => {
			shaking = false;
			reset();
		}, 420);
	}

	function reveal() {
		if (!cur || status !== 'no') return;
		lit = [...cur.answer];
		picked = null;
		status = 'revealed';
		feedback = '정답 중 하나예요';
		track('match_pic_reveal', { id: cur.id });
	}

	function showHint() {
		if (!cur || hintOpen) return;
		hintOpen = true;
		track('match_pic_hint', { id: cur.id });
	}

	function next() {
		const n = GRID_PUZZLES[idx + 1];
		if (n) open(n);
		else cur = null;
	}

	onMount(() => {
		try {
			solved = JSON.parse(localStorage.getItem(KEY) || '[]');
		} catch {
			solved = [];
		}
	});
</script>

<svelte:head>
	<title>성냥개비 그림 퍼즐 {GRID_PUZZLES.length}문제 — 정사각형 만들기·모양 바꾸기 | 딸깍</title>
	<meta
		name="description"
		content="성냥개비를 옮겨 정사각형 개수를 바꾸고, 강아지를 돌려세우고, ㅁ을 ㄹ로 바꾸는 그림 퍼즐 {GRID_PUZZLES.length}문제. 막히면 힌트와 정답을 바로 볼 수 있어요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick/picture" />
	<meta property="og:title" content="성냥개비 그림 퍼즐 — 정사각형 만들기·모양 바꾸기 | 딸깍" />
	<meta property="og:description" content="성냥을 옮겨 정사각형을 만들고 그림을 바꾸는 퍼즐." />
	<meta property="og:url" content="https://ddalkkak.app/matchstick/picture" />
</svelte:head>

<div class="proot">
	{#if !cur}
		<header class="pcover">
			<a class="back" href="/matchstick">← 성냥개비</a>
			<h1>성냥개비 <b>그림 퍼즐</b></h1>
			<p class="plead">
				성냥을 옮겨 정사각형을 만들고, 그림을 바꿔요. 성냥을 눌러 집고, 빈 자리를 눌러 놓으면 됩니다.
			</p>
			<p class="pcount">{solved.length} / {GRID_PUZZLES.length} 풀었어요</p>
		</header>

		<ol class="plist">
			{#each GRID_PUZZLES as p, i (p.id)}
				<li>
					<button class="pcard" class:done={solved.includes(p.id)} onclick={() => open(p)}>
						<span class="pno">{solved.includes(p.id) ? "✓" : i + 1}</span>
						<span class="pbody">
							<b>{p.title}</b>
							<span class="pask">{p.ask}</span>
						</span>
						<span class="pmini" aria-hidden="true">
							<MatchGridBoard w={p.w} h={p.h} lit={p.start} interactive={false} />
						</span>
					</button>
				</li>
			{/each}
		</ol>
	{:else}
		<div class="topbar">
			<button class="tback" onclick={() => (cur = null)}>← 목록</button>
			<span class="tno">{idx + 1} / {GRID_PUZZLES.length}</span>
		</div>

		<div class="card">
			<h2 class="ptitle">{cur.title}</h2>
			<p class="ask">{cur.ask}</p>

			<div class:shaking>
				<MatchGridBoard w={cur.w} h={cur.h} {lit} {picked} {onedge} label={cur.ask} />
			</div>

			<p class="mcount">옮긴 성냥 <b>{Math.min(moved, cur.moves)}</b> / {cur.moves}</p>

			{#if feedback}
				<div class="feedback" class:ok={status === 'won'} role="alert" aria-live="assertive">{feedback}</div>
			{/if}

			{#if status === 'no' && hintOpen}
				<p class="hint"><span>힌트</span>{cur.hint}</p>
			{/if}

			{#if status === 'no'}
				<div class="controls" class:four={!hintOpen}>
					<button class="btn ghost" onclick={reset}>처음부터</button>
					{#if !hintOpen}<button class="btn ghost" onclick={showHint}>힌트 보기</button>{/if}
					<button class="btn ghost" onclick={reveal}>정답 보기</button>
					<button class="btn ghost" onclick={() => (cur = null)}>나가기</button>
				</div>
			{:else}
				{#if idx + 1 < GRID_PUZZLES.length}
					<button class="btn wide" onclick={next}>다음 문제 →</button>
				{:else}
					<a class="btn wide alink" href="/matchstick#stages">성냥개비 단계 도전하러 가기 →</a>
				{/if}
				<button class="btn ghost wide" onclick={() => (cur = null)}>목록으로</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.proot {
		max-width: 560px;
		margin: 0 auto;
		padding: 16px;
	}
	.pcover {
		margin-bottom: 14px;
	}
	.back,
	.tback {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		text-decoration: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
	}
	h1 {
		margin: 10px 0 8px;
		font-size: 26px;
		font-weight: 900;
		line-height: 1.3;
	}
	h1 b {
		color: var(--accent-text);
	}
	.plead {
		margin: 0;
		font-size: 14.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.pcount {
		margin: 10px 0 0;
		font-size: 13px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.plist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.pcard {
		width: 100%;
		display: grid;
		grid-template-columns: auto 1fr 96px;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 14px;
		color: var(--text);
		text-align: left;
		font-family: inherit;
		cursor: pointer;
	}
	.pcard.done {
		border-color: var(--accent);
	}
	.pno {
		font-size: 15px;
		font-weight: 900;
		color: var(--accent-text);
		min-width: 18px;
	}
	.pbody {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}
	.pbody b {
		font-size: 15px;
		font-weight: 800;
	}
	.pask {
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--muted);
		word-break: keep-all;
	}
	.pmini :global(.gboard) {
		padding: 6px;
		border-radius: 9px;
	}
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}
	.tno {
		font-size: 13px;
		font-weight: 800;
		color: var(--muted);
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 20px 16px;
	}
	.ptitle {
		margin: 0;
		font-size: 19px;
		font-weight: 900;
	}
	.ask {
		margin: 6px 0 14px;
		font-size: 15px;
		line-height: 1.6;
		word-break: keep-all;
	}
	.mcount {
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--muted);
		text-align: center;
	}
	.mcount b {
		color: var(--accent-text);
	}
	.feedback {
		margin-top: 12px;
		font-size: 16px;
		font-weight: 800;
		color: var(--danger);
		text-align: center;
	}
	.feedback.ok {
		color: var(--accent-text);
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
	.controls.four {
		flex-wrap: wrap;
	}
	.controls.four .btn {
		flex: 1 1 calc(50% - 5px);
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
	}
	.btn.ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
	}
	.btn.wide {
		width: 100%;
		margin-top: 12px;
	}
	.alink {
		display: block;
		box-sizing: border-box;
		text-align: center;
		text-decoration: none;
	}
	.shaking {
		animation: shake 0.42s;
	}
	@keyframes shake {
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}
</style>
