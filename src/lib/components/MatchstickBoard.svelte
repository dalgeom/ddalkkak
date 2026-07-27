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

	/**
	 * 보드 전체를 하나의 viewBox로 묶어 폭에 맞춰 통째로 축소한다.
	 * 자리마다 고정폭 svg를 나열하면 두 자리 답(글리프 5개)에서 좁은 화면을 넘쳐
	 * 획이 잘려 누를 수 없게 되므로, 전광판(SevenSeg)과 같은 fit-to-width 방식을 쓴다.
	 */
	const GW = 54; // 글리프 폭(세그먼트 좌표계 0~54)
	const GH = 95; // 글리프 높이
	const GAP = 14; // 기호와 숫자 사이 간격
	const DIGIT_GAP = 22; // 두 자리 답에서 숫자끼리 붙어 보이지 않도록 더 벌린다
	const OPW = 42; // 연산자 칸
	const EQW = 36; // 등호 칸

	/** 각 글리프의 x 위치와 전체 폭을 한 번에 계산 */
	let layout = $derived.by(() => {
		const xs: number[] = [];
		let x = 0;
		for (let gi = 0; gi < board.glyphs.length; gi++) {
			if (gi === 1) x += OPW + GAP;
			if (gi === 2) x += EQW + GAP;
			// 답이 두 자리일 때 셋째·넷째 글리프 사이(gi===3)만 넓게
			if (gi === 3) x += DIGIT_GAP - GAP;
			xs.push(x);
			x += GW + GAP;
		}
		return { xs, width: x - GAP, opX: xs[0] + GW + GAP, eqX: xs[1] + GW + GAP };
	});
</script>

<div class="mboard">
	{#if label}<span class="sr-only">{label}</span>{/if}
	<svg
		class="fit"
		viewBox="-4 -4 {layout.width + 8} {GH + 8}"
		width={layout.width + 8}
		height={GH + 8}
		role="presentation"
	>
		{#each board.glyphs as mask, gi (gi)}
			{#if gi === 1}
				<!-- 연산자: 가로획은 고정, 세로획만 옮길 수 있다 -->
				<g transform="translate({layout.opX} 0)">
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
				</g>
			{/if}
			{#if gi === 2}
				<g transform="translate({layout.eqX} 0)" class="eq">
					<rect x="1" y="37" width="30" height="7" rx="3" />
					<rect x="1" y="51" width="30" height="7" rx="3" />
				</g>
			{/if}
			<g transform="translate({layout.xs[gi]} 0)">
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
			</g>
		{/each}
	</svg>
</div>

<style>
	.mboard {
		background: #0a0d0a;
		border-radius: 12px;
		padding: 18px 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* 자리 수가 늘어도(두 자리 답) 폭에 맞춰 통째로 줄어든다 — 잘림·가로스크롤 없음 */
	.fit {
		width: 100%;
		max-width: 340px;
		height: auto;
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
	.eq rect {
		fill: #ffd24a;
	}
</style>
