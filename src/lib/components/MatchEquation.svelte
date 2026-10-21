<script lang="ts">
	import { SEG_KEYS, bit, type SegKey } from '$lib/matchstick';
	import type { Cell, Slot } from '$lib/matchSolve';

	/**
	 * 길이가 정해지지 않은 식을 읽기 전용 성냥 보드로 그린다(성냥 정답 찾기).
	 * MatchstickBoard는 「한 자리 ± 한 자리 = 한두 자리」 꼴 전용이라, 같은 좌표 · 색으로 칸을 늘어놓기만 한다.
	 * added는 새로 놓은 성냥(주황), removed는 성냥을 뺀 빈자리(주황 점선)다.
	 */
	let {
		cells,
		added = [],
		removed = [],
		label
	}: { cells: Cell[]; added?: Slot[]; removed?: Slot[]; label: string } = $props();

	const SEG_RECT: Record<SegKey, [number, number, number, number]> = {
		a: [10, 0, 34, 8],
		b: [46, 9, 8, 34],
		c: [46, 51, 8, 34],
		d: [10, 87, 34, 8],
		e: [0, 51, 8, 34],
		f: [0, 9, 8, 34],
		g: [10, 43.5, 34, 8]
	};
	const GW = 54;
	const GH = 95;
	const GAP = 14;
	const DIGIT_GAP = 20; // 한 수 안의 숫자끼리 — 붙어 보이지 않게 조금 더 벌린다
	const OPW = 42;
	const EQW = 32;

	let layout = $derived.by(() => {
		const xs: number[] = [];
		let x = 0;
		cells.forEach((c, i) => {
			if (i > 0) x += c.k === 'd' && cells[i - 1].k === 'd' ? DIGIT_GAP : GAP;
			xs.push(x);
			x += c.k === 'd' ? GW : c.k === 'o' ? OPW : EQW;
		});
		return { xs, width: x };
	});

	const has = (list: Slot[], ci: number, seg: SegKey | 'v') => list.some((s) => s.ci === ci && s.seg === seg);
	function cls(ci: number, seg: SegKey | 'v', lit: boolean): string {
		if (has(added, ci, seg)) return 'new';
		if (has(removed, ci, seg)) return 'gone';
		return lit ? 'lit' : 'ghost';
	}
</script>

<div class="meq">
	<span class="sr-only">{label}</span>
	<svg viewBox="-4 -4 {layout.width + 8} {GH + 8}" width={layout.width + 8} height={GH + 8} aria-hidden="true">
		{#each cells as c, ci (ci)}
			<g transform="translate({layout.xs[ci]} 0)">
				{#if c.k === 'd'}
					{#each SEG_KEYS as seg (seg)}
						{@const r = SEG_RECT[seg]}
						<rect x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="3" class={cls(ci, seg, (c.m & bit(seg)) !== 0)} />
					{/each}
				{:else if c.k === 'o'}
					<rect x="4" y="43.5" width="34" height="8" rx="3" class="fixed" />
					{#if c.plus || has(removed, ci, 'v') || has(added, ci, 'v')}
						<rect x="17" y="30" width="8" height="35" rx="3" class={cls(ci, 'v', c.plus)} />
					{/if}
				{:else}
					<rect x="1" y="37" width="30" height="7" rx="3" class="fixed" />
					<rect x="1" y="51" width="30" height="7" rx="3" class="fixed" />
				{/if}
			</g>
		{/each}
	</svg>
</div>

<style>
	.meq {
		background: #0a0d0a;
		border-radius: 12px;
		padding: 16px 12px;
		display: flex;
		justify-content: center;
	}
	svg {
		width: 100%;
		max-width: 340px;
		height: auto;
	}
	.lit {
		fill: #3aff62;
		filter: drop-shadow(0 0 5px rgba(58, 255, 98, 0.7));
	}
	.ghost {
		fill: #17231a;
		stroke: #223528;
		stroke-width: 1;
	}
	/* 고정된 노란 기호(+ 가로 · =) 옆에서도 새로 놓은 성냥이 따로 보이게 흰 테두리를 두른다 */
	.new {
		fill: #ffb020;
		stroke: #fff;
		stroke-width: 1.5;
		filter: drop-shadow(0 0 8px rgba(255, 176, 32, 0.9));
	}
	.gone {
		fill: none;
		stroke: #ffb020;
		stroke-width: 2;
		stroke-dasharray: 4 3;
	}
	.fixed {
		fill: #ffd24a;
	}
</style>
