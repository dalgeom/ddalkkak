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
		interactive = true,
		animateFrom = null
	}: {
		board: Board;
		picked: PickLoc | null;
		onstick: (loc: PickLoc, lit: boolean) => void;
		/** 스크린리더용 방정식 텍스트(예: '8 + 3 = 5'). 성냥은 SVG뿐이라 텍스트 대체가 필요하다. */
		label?: string;
		/** false면 읽기전용(허브 미리보기·아카이브) — role/tabindex/키보드 핸들러를 렌더하지 않아 죽은 탭 정지점을 없앤다. */
		interactive?: boolean;
		/**
		 * 정답 공개 연출: 이 배치(원래 문제)에서 현재 board(정답)로 바뀔 때,
		 * 옮겨진 성냥이 집혔다가 새 자리로 날아가 안착하는 애니메이션을 재생한다.
		 * 정답 화면만 남으면 그 전 상태가 뭐였는지 알 수 없어서 넣은 연출이다.
		 */
		animateFrom?: Board | null;
	} = $props();

	/** Enter·Space로 세그먼트 활성화(WAI-ARIA button 패턴) */
	function onKey(e: KeyboardEvent, loc: PickLoc, lit: boolean) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onstick(loc, lit);
		}
	}

	/** 스크린리더용 세그먼트 위치 이름 — 35개가 전부 "N번째 자리 성냥"이면 구분이 안 된다 */
	const SEG_NAME: Record<SegKey, string> = {
		a: '위',
		b: '오른쪽 위',
		c: '오른쪽 아래',
		d: '아래',
		e: '왼쪽 아래',
		f: '왼쪽 위',
		g: '가운데'
	};

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

	/* ── 정답 공개 애니메이션 ── */

	type Geo = { x: number; y: number; w: number; h: number };

	function locGeo(kind: 'op' | 'glyph', gi?: number, seg?: SegKey): Geo {
		if (kind === 'op') return { x: layout.opX + 17, y: 30, w: 8, h: 35 };
		const r = SEG_RECT[seg!];
		return { x: layout.xs[gi!] + r[0], y: r[1], w: r[2], h: r[3] };
	}

	let animPhase = $state<'idle' | 'lift' | 'fly' | 'land'>('idle');
	/** 떠 있는 성냥들의 현재 지오메트리 — lift 때 출발 자리, fly 때 도착 자리(CSS transition이 사이를 메움) */
	let flyGeos = $state<Geo[]>([]);
	let animKeys = $state<Set<string>>(new Set());
	let lastAnim: Board | null = null;
	let animT1: ReturnType<typeof setTimeout>;
	let animT2: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (animateFrom === lastAnim) return;
		lastAnim = animateFrom;
		clearTimeout(animT1);
		clearTimeout(animT2);
		if (!animateFrom) {
			animPhase = 'idle';
			return;
		}
		// 원래 배치와 정답 배치의 차이 = 옮겨진 성냥(빠진 자리 → 새로 켜진 자리)
		const removed: { key: string; geo: Geo }[] = [];
		const added: { key: string; geo: Geo }[] = [];
		for (let gi = 0; gi < board.glyphs.length; gi++) {
			for (const seg of SEG_KEYS) {
				const was = (animateFrom.glyphs[gi] & bit(seg)) !== 0;
				const now = (board.glyphs[gi] & bit(seg)) !== 0;
				if (was === now) continue;
				(was ? removed : added).push({ key: `g${gi}-${seg}`, geo: locGeo('glyph', gi, seg) });
			}
		}
		if (animateFrom.opPlus !== board.opPlus) {
			(animateFrom.opPlus ? removed : added).push({ key: 'op', geo: locGeo('op') });
		}
		const pairs = removed.map((r, i) => ({ from: r, to: added[i] ?? r }));
		if (!pairs.length) {
			animPhase = 'idle';
			return;
		}
		animKeys = new Set(pairs.flatMap((p) => [p.from.key, p.to.key]));
		flyGeos = pairs.map((p) => p.from.geo);
		animPhase = 'lift'; // 출발 자리에서 집힌 색으로 잠깐 떠 있고
		animT1 = setTimeout(() => {
			animPhase = 'fly'; // 도착 자리로 스르륵
			flyGeos = pairs.map((p) => p.to.geo);
		}, 500);
		animT2 = setTimeout(() => {
			animPhase = 'land'; // 안착 — 이후는 정답 보드 그대로
		}, 500 + 900);
		return () => {
			clearTimeout(animT1);
			clearTimeout(animT2);
		};
	});

	/** 애니메이션 중에는 옮겨지는 성냥의 출발·도착 자리를 비워 두고 떠 있는 성냥이 대신 보인다 */
	function shownLit(key: string, lit: boolean): boolean {
		if ((animPhase === 'lift' || animPhase === 'fly') && animKeys.has(key)) return false;
		return lit;
	}
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
						class="stick {shownLit('op', board.opPlus) ? 'lit' : 'ghost'} {isPicked({ kind: 'op' })
							? 'picked'
							: ''}"
						class:ro={!interactive}
						role={interactive ? 'button' : undefined}
						tabindex={interactive ? 0 : undefined}
						aria-label={interactive
							? `연산자 세로 획 — ${board.opPlus ? '성냥 있음(+)' : '빈 자리(−)'}`
							: undefined}
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
						class="stick {shownLit(`g${gi}-${seg}`, lit) ? 'lit' : 'ghost'} {isPicked({
							kind: 'glyph',
							gi,
							seg
						})
							? 'picked'
							: ''}"
						class:ro={!interactive}
						role={interactive ? 'button' : undefined}
						tabindex={interactive ? 0 : undefined}
						aria-label={interactive
							? `${gi + 1}번째 글자 ${SEG_NAME[seg]} 획 — ${lit ? '성냥 있음' : '빈 자리'}`
							: undefined}
						data-loc="g{gi}-{seg}"
						onclick={interactive ? () => onstick({ kind: 'glyph', gi, seg }, lit) : undefined}
						onkeydown={interactive ? (e) => onKey(e, { kind: 'glyph', gi, seg }, lit) : undefined}
					/>
				{/each}
			</g>
		{/each}

		<!-- 정답 공개: 옮겨지는 성냥이 집힌 색으로 떠서 새 자리로 날아간다 -->
		{#if animPhase === 'lift' || animPhase === 'fly'}
			{#each flyGeos as g, i (i)}
				<rect
					class="stick flying"
					rx="3"
					style="x:{g.x}px; y:{g.y}px; width:{g.w}px; height:{g.h}px"
				/>
			{/each}
		{/if}
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
	/* 키보드 포커스가 검은 보드 위에서 보이게 */
	.stick:focus-visible {
		outline: 2px solid #ffd24a;
		outline-offset: 2px;
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
	/* 날아가는 성냥 — 집힌 성냥과 같은 주황. 지오메트리를 style로 줘야 x·y·width·height에
	   CSS transition이 걸린다(속성으로 주면 브라우저에 따라 전환이 안 붙는다). */
	.stick.flying {
		fill: #ffb020;
		filter: drop-shadow(0 0 8px rgba(255, 176, 32, 0.9));
		pointer-events: none;
		transition:
			x 900ms cubic-bezier(0.25, 0.8, 0.3, 1),
			y 900ms cubic-bezier(0.25, 0.8, 0.3, 1),
			width 900ms cubic-bezier(0.25, 0.8, 0.3, 1),
			height 900ms cubic-bezier(0.25, 0.8, 0.3, 1);
	}
	.fixed {
		fill: #ffd24a;
	}
	.eq rect {
		fill: #ffd24a;
	}
</style>
