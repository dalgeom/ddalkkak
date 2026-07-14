<script lang="ts">
	import { SEG_KEYS, bit, type Board, type SegKey } from '$lib/matchstick';

	export interface PickLoc {
		kind: 'glyph' | 'op';
		gi?: number;
		seg?: SegKey;
	}

	let {
		board,
		picked,
		onstick
	}: {
		board: Board;
		picked: PickLoc | null;
		onstick: (loc: PickLoc, lit: boolean) => void;
	} = $props();

	const SEG_RECT: Record<SegKey, [number, number, number, number]> = {
		a: [10, 0, 34, 8],
		b: [46, 9, 8, 34],
		c: [46, 51, 8, 34],
		d: [10, 87, 34, 8],
		e: [0, 51, 8, 34],
		f: [0, 9, 8, 34],
		g: [10, 43.5, 34, 8]
	};

	function isPicked(loc: PickLoc): boolean {
		if (!picked) return false;
		if (picked.kind !== loc.kind) return false;
		if (loc.kind === 'op') return true;
		return picked.gi === loc.gi && picked.seg === loc.seg;
	}

	/** 이 세그먼트가 지금 켜져 있는가 (집힌 성냥은 자리에서 뜬 상태로 표시) */
	function segLit(gi: number, seg: SegKey): boolean {
		return (board.glyphs[gi] & bit(seg)) !== 0;
	}
</script>

<div class="mboard">
	{#each board.glyphs as mask, gi (gi)}
		{#if gi === 1}
			<!-- 연산자 -->
			<svg class="op" width="44" height="95" viewBox="-2 -2 48 99">
				<rect x="4" y="43.5" width="34" height="8" rx="3" class="fixed" />
				<rect
					x="17"
					y="30"
					width="8"
					height="35"
					rx="3"
					class="stick {board.opPlus ? 'lit' : 'ghost'} {isPicked({ kind: 'op' })
						? 'picked'
						: ''}"
					role="button"
					tabindex="0"
					data-loc="op-v"
					onclick={() => onstick({ kind: 'op' }, board.opPlus)}
					onkeydown={(e) => e.key === 'Enter' && onstick({ kind: 'op' }, board.opPlus)}
				/>
			</svg>
		{/if}
		{#if gi === 2}
			<span class="eq">=</span>
		{/if}
		<svg width="60" height="105" viewBox="-3 -3 60 101">
			{#each SEG_KEYS as seg (seg)}
				{@const r = SEG_RECT[seg]}
				{@const lit = segLit(gi, seg)}
				<rect
					x={r[0]}
					y={r[1]}
					width={r[2]}
					height={r[3]}
					rx="3"
					class="stick {lit ? 'lit' : 'ghost'} {isPicked({ kind: 'glyph', gi, seg })
						? 'picked'
						: ''}"
					role="button"
					tabindex="0"
					data-loc="g{gi}-{seg}"
					onclick={() => onstick({ kind: 'glyph', gi, seg }, lit)}
					onkeydown={(e) => e.key === 'Enter' && onstick({ kind: 'glyph', gi, seg }, lit)}
				/>
			{/each}
		</svg>
	{/each}
</div>

<style>
	.mboard {
		background: #0a0d0a;
		border-radius: 12px;
		padding: 18px 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		overflow-x: auto;
	}
	svg {
		flex: none;
	}
	.stick {
		cursor: pointer;
	}
	.stick.lit {
		fill: #3aff62;
		filter: drop-shadow(0 0 5px rgba(58, 255, 98, 0.7));
	}
	.stick.ghost {
		fill: #17231a;
		stroke: #223528;
		stroke-width: 1;
	}
	.stick.picked {
		fill: #ffb020;
		filter: drop-shadow(0 0 8px rgba(255, 176, 32, 0.9));
	}
	.fixed {
		fill: #ffd24a;
	}
	.op {
		margin: 0 2px;
	}
	.eq {
		color: #ffd24a;
		font-size: 34px;
		font-weight: 900;
		margin: 0 4px;
		flex: none;
	}
</style>
