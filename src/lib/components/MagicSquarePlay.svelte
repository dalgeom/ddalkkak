<script lang="ts">
	/* /read/magic-square 글 끝에서 읽은 방법을 바로 손으로 해 보는 판.
	   줄마다 합이 바로 보여서 「어느 줄이 모자라나」를 스스로 고친다. */
	import { seenOnce, track } from '$lib/analytics';
	import { type Size, target, startBoard, lineSums, duplicates, isSolved } from '$lib/magicSquare';

	let n = $state<Size>(3);
	let board = $state(startBoard(3));
	let fixed = $state(startBoard(3).map(Boolean));
	const started = new Set<number>();
	const solvedOnce = new Set<number>();

	const t = $derived(target(n));
	const sums = $derived(lineSums(board, n));
	const dup = $derived(duplicates(board));
	const solved = $derived(isSolved(board, n));

	function reset(size: Size) {
		n = size;
		board = startBoard(size);
		fixed = board.map(Boolean);
	}

	function input(i: number, e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const v = Number(el.value.replace(/\D/g, '').slice(0, 2)) || 0;
		board[i] = v > n * n ? 0 : v;
		el.value = board[i] ? String(board[i]) : '';
		if (!started.has(n)) {
			started.add(n);
			track(`magic_play_start_${n}`);
		}
		if (isSolved(board, n) && !solvedOnce.has(n)) {
			solvedOnce.add(n);
			track(`magic_play_solve_${n}`);
		}
	}

	const tone = (s: number | null) => (s === null ? '' : s === t ? 'ok' : 'off');
	const LEAD: Record<Size, string> = {
		3: '빈 판입니다. 5를 가운데에 두고 시작해 보세요.',
		4: '대각선이 아닌 칸은 채워 두었습니다. 대각선 8칸에 남은 수를 넣어 보세요.',
		5: '1~10은 시암 방법대로 놓아 두었습니다. 11부터 이어 보세요.'
	};
</script>

<section class="sec mplay" use:seenOnce={'magic_play_seen'}>
	<h2 class="sh">직접 채워 보기</h2>
	<div class="tabs" role="group" aria-label="판 크기">
		{#each [3, 4, 5] as const as s (s)}
			<button type="button" class:on={n === s} aria-pressed={n === s} onclick={() => reset(s)}
				>{s}×{s}</button
			>
		{/each}
	</div>
	<p class="lead">
		1부터 {n * n}까지 한 번씩 넣어 가로 · 세로 · 대각선 합을 모두 <b>{t}</b>로 만드세요. {LEAD[n]}
	</p>

	{#key n}
		<div class="grid" style="--n:{n}">
			{#each Array(n) as _, y (y)}
				{#each Array(n) as _, x (x)}
					{@const i = y * n + x}
					{#if fixed[i]}
						<span class="cell given">{board[i]}</span>
					{:else}
						<input
							class="cell"
							class:dup={dup.has(board[i])}
							inputmode="numeric"
							maxlength="2"
							aria-label="{y + 1}행 {x + 1}열"
							value={board[i] || ''}
							oninput={(e) => input(i, e)}
						/>
					{/if}
				{/each}
				<span class="sum {tone(sums.rows[y])}">{sums.rows[y] ?? '·'}</span>
			{/each}
			{#each sums.cols as c, x (x)}
				<span class="sum {tone(c)}">{c ?? '·'}</span>
			{/each}
			<span></span>
		</div>
	{/key}
	<p class="diag">
		<span class={tone(sums.diag)}>↘ {sums.diag ?? '·'}</span>
		<span class={tone(sums.anti)}>↙ {sums.anti ?? '·'}</span>
	</p>

	{#if solved}
		<p class="done" role="status">완성! 모든 줄이 {t}입니다.</p>
	{/if}
	<button type="button" class="reset" onclick={() => reset(n)}>처음부터</button>
</section>

<style>
	.mplay {
		display: grid;
		gap: 10px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 0 2px;
		word-break: keep-all;
	}
	.tabs {
		display: flex;
		gap: 6px;
	}
	.tabs button {
		flex: 1;
		min-height: 40px;
		border-radius: 10px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-weight: 700;
		font-size: 14px;
	}
	.tabs button.on {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent-text);
	}
	.lead {
		margin: 0 2px;
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 52px)) minmax(0, 40px);
		gap: 5px;
		justify-content: center;
	}
	.cell {
		box-sizing: border-box;
		width: 100%;
		aspect-ratio: 1;
		min-width: 0;
		border-radius: 10px;
		border: 1.5px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-size: 18px;
		font-weight: 800;
		text-align: center;
		padding: 0;
		font-variant-numeric: tabular-nums;
	}
	.cell:focus {
		outline: none;
		border-color: var(--accent);
	}
	.given {
		display: grid;
		place-items: center;
		background: var(--panel-2);
		color: var(--muted);
	}
	.cell.dup {
		border-color: var(--danger);
		background: var(--danger-bg);
	}
	.sum {
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}
	.ok {
		color: var(--accent-text);
	}
	.off {
		color: var(--danger);
	}
	.diag {
		margin: 0;
		display: flex;
		justify-content: center;
		gap: 18px;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.done {
		margin: 0;
		padding: 10px 14px;
		border-radius: 12px;
		background: var(--correct-bg);
		font-weight: 800;
		text-align: center;
	}
	.reset {
		justify-self: center;
		min-height: 40px;
		padding: 0 18px;
		border-radius: 10px;
		border: 1px solid var(--border-strong);
		background: none;
		color: var(--muted);
		font-weight: 700;
	}
</style>
