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
		onstick,
		label,
		interactive = true
	}: {
		board: Board;
		picked: PickLoc | null;
		onstick: (loc: PickLoc, lit: boolean) => void;
		/** 스크린리더용 방정식 텍스트(예: '8 + 3 = 5'). 성냥은 SVG뿐이라 텍스트 대체가 필요하다. */
		label?: string;
		/** false면 읽기전용(허브 미리보기·아카이브) — role/tabindex/키보드 핸들러를 렌더하지 않아 죽은 탭 정지점을 없앤다. */
		interactive?: boolean;
	} = $props();

	/** Enter·Space로 세그먼트 활성화(WAI-ARIA button 패턴) */
	function onKey(e: KeyboardEvent, loc: PickLoc, lit: boolean) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onstick(loc, lit);
		}
	}

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
	{#if label}<span class="sr-only">{label}</span>{/if}
	{#each board.glyphs as mask, gi (gi)}
		{#if gi === 1}
			<!-- 연산자 -->
			<svg class="op" width="44" height="95" viewBox="-2 -2 48 99">
				<rect x="4" y="43.5" width="34" height="8" rx="3" class="fixed" />
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<rect
					x="17"
					y="30"
					width="8"
					height="35"
					rx="3"
					class="stick {board.opPlus ? 'lit' : 'ghost'} {isPicked({ kind: 'op' })
						? 'picked'
						: ''}"
					class:ro={!interactive}
					role={interactive ? 'button' : undefined}
					tabindex={interactive ? 0 : undefined}
					aria-label={interactive ? '연산자 세로 성냥' : undefined}
					data-loc="op-v"
					onclick={interactive ? () => onstick({ kind: 'op' }, board.opPlus) : undefined}
					onkeydown={interactive ? (e) => onKey(e, { kind: 'op' }, board.opPlus) : undefined}
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
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<rect
					x={r[0]}
					y={r[1]}
					width={r[2]}
					height={r[3]}
					rx="3"
					class="stick {lit ? 'lit' : 'ghost'} {isPicked({ kind: 'glyph', gi, seg })
						? 'picked'
						: ''}"
					class:ro={!interactive}
					role={interactive ? 'button' : undefined}
					tabindex={interactive ? 0 : undefined}
					aria-label={interactive ? `${gi + 1}번째 자리 성냥` : undefined}
					data-loc="g{gi}-{seg}"
					onclick={interactive ? () => onstick({ kind: 'glyph', gi, seg }, lit) : undefined}
					onkeydown={interactive ? (e) => onKey(e, { kind: 'glyph', gi, seg }, lit) : undefined}
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
	.stick.ro {
		cursor: default;
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
