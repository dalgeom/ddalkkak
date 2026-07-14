<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import problems from '$lib/data/matchstick-problems.json';
	import {
		parseEq,
		cloneBoard,
		isSolved,
		isTrue,
		moveDiff,
		bit,
		type Board
	} from '$lib/matchstick';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let done = $state<number[]>([]);
	let stats = $state({ solved: 0, streak: 0, best: 0 });

	let pIdx = $state(-1);
	let orig = $state<Board | null>(null);
	let cur = $state<Board | null>(null);
	let picked = $state<PickLoc | null>(null);
	let attempts = $state(0);
	let phase = $state<'play' | 'won' | 'revealed'>('play');
	let feedback = $state('');
	let shaking = $state(false);
	let toastMsg = $state('');

	function load() {
		try {
			done = JSON.parse(localStorage.getItem('ddal.match.done') || '[]');
			stats = JSON.parse(
				localStorage.getItem('ddal.match.stats') || '{"solved":0,"streak":0,"best":0}'
			);
		} catch {
			/* 무시 */
		}
	}
	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem('ddal.match.done', JSON.stringify(done));
			localStorage.setItem('ddal.match.stats', JSON.stringify(stats));
		} catch {
			/* 무시 */
		}
	}

	function nextProblem() {
		const forced = Number(page.url.searchParams.get('p'));
		let idx: number;
		if (!Number.isNaN(forced) && page.url.searchParams.has('p') && pIdx === -1) {
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
		phase = 'play';
		feedback = '';
	}

	function revert() {
		if (!orig) return;
		cur = cloneBoard(orig);
		picked = null;
	}

	function handleStick(loc: PickLoc, lit: boolean) {
		if (phase !== 'play' || !cur || !orig) return;

		if (!picked) {
			if (!lit) return; // 빈 자리 먼저 클릭은 무시
			picked = loc;
			// 집기: 보드에서 제거
			applyRemove(loc);
			return;
		}

		// 같은 자리 다시 클릭 = 내려놓기(취소)
		if (lit === false && sameLoc(picked, loc)) {
			applyAdd(loc);
			picked = null;
			return;
		}
		if (lit) return; // 이미 켜진 자리엔 못 놓음

		// 놓기
		applyAdd(loc);
		const p = picked;
		picked = null;

		if (isSolved(orig, cur)) {
			phase = 'won';
			const gained = Math.max(20, 100 - attempts * 20);
			stats.solved++;
			stats.streak++;
			if (stats.streak > stats.best) stats.best = stats.streak;
			markDone();
			feedback = `딸깍! ⚡ +${gained}점 (시도 ${attempts + 1}회)`;
			persist();
		} else {
			attempts++;
			feedback = '아직 아니에요 — 성냥이 제자리로 돌아갑니다.';
			shaking = true;
			setTimeout(() => {
				shaking = false;
				revert();
			}, 450);
			void p;
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

	function reveal() {
		if (phase !== 'play') return;
		cur = parseEq(problems[pIdx].solution);
		picked = null;
		phase = 'revealed';
		stats.streak = 0;
		markDone();
		feedback = `정답: ${problems[pIdx].solution.replace('-', '−')}`;
		persist();
	}

	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}

	function share() {
		const text = `딸깍! 성냥개비 🔥 연속 ${stats.streak}판 · 통산 ${stats.solved}판 성공\n${location.origin}/matchstick`;
		if (navigator.share) navigator.share({ text }).catch(() => {});
		else if (navigator.clipboard?.writeText)
			navigator.clipboard.writeText(text).then(
				() => toast('결과가 복사됐어요!'),
				() => toast('복사에 실패했어요')
			);
	}

	onMount(() => {
		load();
		nextProblem();
	});
</script>

<svelte:head>
	<title>성냥개비 — 딸깍</title>
	<meta name="description" content="성냥개비 하나만 옮겨 등식을 참으로! 741개의 유일해 퍼즐." />
</svelte:head>

<div class="topbar">
	<div class="stats">
		<div class="stat-box"><span>성공</span><b>{stats.solved}</b></div>
		<div class="stat-box"><span>연속</span><b>{stats.streak}</b></div>
		<div class="stat-box"><span>최고</span><b>{stats.best}</b></div>
	</div>
	<div class="left-count">{problems.length - done.length} / {problems.length}</div>
</div>

<div class="card">
	<div class="rule">
		🔥 <b>성냥개비 하나만 옮겨</b> 등식을 참으로 만드세요.
		<span class="sub">켜진 획을 눌러 집고, 빈 자리를 눌러 놓습니다. (= 는 못 건드려요)</span>
	</div>

	{#if cur}
		<div class:shaking>
			<MatchstickBoard board={cur} {picked} onstick={handleStick} />
		</div>
	{/if}

	{#if feedback}
		<div class="feedback" class:ok={phase === 'won'}>{feedback}</div>
	{/if}

	{#if phase === 'play'}
		<div class="controls">
			<button class="btn ghost" onclick={revert}>처음부터</button>
			<button class="btn ghost" onclick={reveal}>정답 보기 (연속 끊김)</button>
		</div>
	{:else}
		<button class="btn wide" onclick={nextProblem}>다음 문제 →</button>
		<button class="btn ghost wide" onclick={share}>🔥 기록 공유하기</button>
	{/if}
</div>

<AdSlot label="성냥개비 결과" />

{#if toastMsg}
	<div class="toast">{toastMsg}</div>
{/if}

<style>
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.stats {
		display: flex;
		gap: 6px;
	}
	.stat-box {
		background: #26221c;
		color: #f7f5f0;
		border-radius: 8px;
		padding: 4px 10px;
		text-align: center;
		min-width: 52px;
	}
	.stat-box span {
		display: block;
		font-size: 10px;
		color: #b8b0a4;
	}
	.stat-box b {
		font-size: 15px;
	}
	.left-count {
		font-size: 12px;
		color: #8d8478;
		font-weight: 700;
	}
	.card {
		background: #fff;
		border: 1px solid #e5dfd4;
		border-radius: 16px;
		padding: 18px 16px;
		box-shadow: 0 3px 12px rgba(38, 34, 28, 0.06);
	}
	.rule {
		font-size: 14px;
		line-height: 1.6;
		margin-bottom: 12px;
		word-break: keep-all;
	}
	.rule .sub {
		display: block;
		font-size: 12px;
		color: #8d8478;
	}
	.feedback {
		margin-top: 12px;
		font-size: 15px;
		font-weight: 800;
		color: #d33;
	}
	.feedback.ok {
		color: #2b8a3e;
	}
	.controls {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	.controls .btn {
		flex: 1;
		font-size: 13px;
		padding: 10px 8px;
	}
	.btn {
		background: #e8590c;
		color: #fff;
		border: none;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 800;
		padding: 12px 18px;
		cursor: pointer;
		font-family: inherit;
	}
	.btn.ghost {
		background: #f0ebe0;
		color: #6b6152;
	}
	.btn.wide {
		width: 100%;
		margin-top: 10px;
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
	.toast {
		position: fixed;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		background: #26221c;
		color: #f7f5f0;
		border-radius: 20px;
		padding: 10px 20px;
		font-size: 14px;
		z-index: 30;
	}
</style>
