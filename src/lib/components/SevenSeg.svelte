<script lang="ts">
	let { lines, frags = {} }: { lines: string[]; frags?: Record<string, string> } = $props();

	const SEG: Record<string, [number, number, number, number]> = {
		a: [10, 0, 34, 7],
		b: [46, 8, 7, 34],
		c: [46, 50, 7, 34],
		d: [10, 86, 34, 7],
		e: [0, 50, 7, 34],
		f: [0, 8, 7, 34],
		g: [10, 43, 34, 7]
	};
	const DIG: Record<string, string> = {
		'0': 'abcdef',
		'1': 'bc',
		'2': 'abdeg',
		'3': 'abcdg',
		'4': 'bcfg',
		'5': 'acdfg',
		'6': 'acdefg',
		'7': 'abc',
		'8': 'abcdefg',
		'9': 'abcdfg'
	};
	const segEntries = Object.entries(SEG);

	const H = 93; // 디지트 높이
	const DW = 53; // 디지트 셀 폭
	const SYMW = 40; // 기호/물음표 셀 폭
	const SPW = 16; // 공백 폭
	const GAP = 9;

	type Cell =
		| { t: 'd'; segs: string; x: number }
		| { t: 's'; ch: string; x: number }
		| { t: 'q'; x: number };

	/** 한 줄을 하나의 SVG 좌표계로 배치 (셀 목록 + 전체 폭) */
	function layout(line: string): { cells: Cell[]; w: number } {
		const cells: Cell[] = [];
		let x = 0;
		for (const ch of line) {
			if (DIG[ch] || frags[ch] !== undefined) {
				cells.push({ t: 'd', segs: frags[ch] !== undefined ? frags[ch] : DIG[ch], x });
				x += DW + GAP;
			} else if (ch === ' ') {
				x += SPW;
			} else if (ch === '?') {
				cells.push({ t: 'q', x });
				x += SYMW + GAP;
			} else {
				cells.push({ t: 's', ch, x });
				x += SYMW + GAP;
			}
		}
		return { cells, w: Math.max(x - GAP, 1) };
	}

	let laid = $derived(lines.map(layout));
	let maxW = $derived(Math.max(...laid.map((l) => l.w), 1));
</script>

<div class="lcd">
	{#each laid as L, li (li)}
		<svg
			class="lrow"
			viewBox="0 0 {L.w} {H}"
			style="width:{((L.w / maxW) * 100).toFixed(2)}%; max-width:{Math.round(L.w * 0.76)}px"
			aria-hidden="true"
		>
			{#each L.cells as c, ci (ci)}
				{#if c.t === 'd'}
					{#each segEntries as [k, p] (k)}
						<rect
							x={c.x + p[0]}
							y={p[1]}
							width={p[2]}
							height={p[3]}
							rx="3"
							fill={c.segs.includes(k) ? '#3aff62' : '#111a12'}
						/>
					{/each}
				{:else if c.t === 'q'}
					<text
						x={c.x + SYMW / 2}
						y="60"
						fill="#ff5a5a"
						font-size="52"
						font-weight="800"
						text-anchor="middle"
						font-family="Arial, sans-serif">?</text
					>
				{:else}
					<text
						x={c.x + SYMW / 2}
						y="58"
						fill="#ffd24a"
						font-size="44"
						font-weight="800"
						text-anchor="middle"
						font-family="Arial, sans-serif">{c.ch}</text
					>
				{/if}
			{/each}
		</svg>
	{/each}
</div>

<style>
	.lcd {
		background: #0a0d0a;
		border-radius: 12px;
		padding: 16px 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}
	.lrow {
		display: block;
		height: auto;
	}
</style>
