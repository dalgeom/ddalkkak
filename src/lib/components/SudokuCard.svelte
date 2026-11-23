<script lang="ts">
	import type { Sudoku } from '$lib/sudoku';

	/**
	 * 미니 스도쿠 한 문제(오늘의 10문제 5번 칸, 11/24부터) — 짝수 날 4×4, 홀수 날 6×6.
	 * 해가 하나뿐인 퍼즐이라 정답 판과 대조한다. 판정이 끝나면 빈칸에 정답을 채워 보여 준다.
	 */
	let {
		data,
		judged,
		onwrong,
		onsolve
	}: { data: Sudoku; judged: boolean; onwrong: () => void; onsolve: () => void } = $props();

	const n = $derived(data.size);
	let cells = $state<string[]>([]);
	$effect.pre(() => {
		if (cells.length !== data.givens.length) cells = data.givens.map((g) => (g ? String(g) : ''));
	});
	const filled = $derived(cells.length > 0 && cells.every((c) => /^[1-9]$/.test(c)));

	function put(i: number, v: string) {
		const d = v.replace(/[^0-9]/g, '').slice(-1);
		cells[i] = d && Number(d) >= 1 && Number(d) <= n ? d : '';
	}
	function submit() {
		if (judged || !filled) return;
		if (cells.every((c, i) => Number(c) === data.solution[i])) onsolve();
		else onwrong();
	}
	const edge = (i: number) => {
		const r = Math.floor(i / n);
		const c = i % n;
		return {
			right: (c + 1) % data.boxC === 0 && c < n - 1,
			bottom: (r + 1) % data.boxR === 0 && r < n - 1
		};
	};
</script>

<div class="qtext">
	가로줄 · 세로줄 · 굵은 칸 묶음마다 1부터 {n}까지가 한 번씩 들어가요. 빈칸을 채워 주세요.
</div>
<div class="grid" style="--n:{n}">
	{#each data.givens as g, i (i)}
		{@const e = edge(i)}
		{#if g}
			<div class="cell given" class:r={e.right} class:b={e.bottom}>{g}</div>
		{:else if judged}
			<div class="cell shown" class:r={e.right} class:b={e.bottom} class:bad={cells[i] !== String(data.solution[i])}>
				{data.solution[i]}
			</div>
		{:else}
			<input
				class="cell inp"
				class:r={e.right}
				class:b={e.bottom}
				inputmode="numeric"
				maxlength="1"
				aria-label={`${Math.floor(i / n) + 1}행 ${(i % n) + 1}열`}
				value={cells[i]}
				oninput={(ev) => {
					put(i, ev.currentTarget.value);
					ev.currentTarget.value = cells[i];
				}}
				onkeydown={(ev) => ev.key === 'Enter' && submit()}
			/>
		{/if}
	{/each}
</div>
{#if !judged}
	<button class="go" disabled={!filled} onclick={submit}>확인</button>
{/if}

<style>
	.qtext {
		margin-top: 14px;
		font-size: 16px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--n), 1fr);
		width: min(100%, calc(var(--n) * 56px));
		margin: 16px auto;
		border: 2px solid var(--text);
		border-radius: 8px;
		overflow: hidden;
	}
	.cell {
		aspect-ratio: 1;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-right: 1px solid var(--border-strong);
		border-bottom: 1px solid var(--border-strong);
		font-family: inherit;
		font-size: 22px;
		font-weight: 800;
		text-align: center;
		color: var(--text);
		background: var(--panel);
		padding: 0;
		border-radius: 0;
	}
	.cell.r {
		border-right: 2px solid var(--text);
	}
	.cell.b {
		border-bottom: 2px solid var(--text);
	}
	.given {
		background: var(--panel-2);
	}
	.inp {
		color: var(--accent);
	}
	.inp:focus {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.shown {
		color: var(--accent);
	}
	.shown.bad {
		color: var(--danger);
	}
	.go {
		width: 100%;
		min-height: 48px;
		border-radius: 12px;
		border: 0;
		font-family: inherit;
		font-weight: 800;
		font-size: 16px;
		background: var(--accent);
		color: #fff;
		cursor: pointer;
	}
	.go:disabled {
		opacity: 0.5;
	}
</style>
