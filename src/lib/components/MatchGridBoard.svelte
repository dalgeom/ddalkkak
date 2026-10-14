<script lang="ts">
	import { gridEdges } from '$lib/matchGrid';

	/**
	 * 그림 성냥 판(matchGrid.ts) — 네모 격자의 변에 성냥이 놓인다.
	 *
	 * v2(10/14): 처음엔 등식 판과 같은 검은 판·초록 막대로 그렸는데, 그러면 그림이 아니라 전광판 숫자로
	 * 읽혔다(강아지가 「ㄱ+ㅓ」로 보였다 — 10/14 점검). 모눈종이 위에 머리가 빨간 나무 성냥으로 그린다.
	 * 빈 자리는 옅은 점선으로만 두고, 성냥은 두께 8이라 손가락용 넓은 누름 영역(26)을 겹친다.
	 */
	let {
		w,
		h,
		lit,
		picked = null,
		onedge = () => {},
		interactive = true,
		label
	}: {
		w: number;
		h: number;
		lit: string[];
		picked?: string | null;
		onedge?: (edge: string, lit: boolean) => void;
		/** false면 목록 미리보기 — 빈 자리를 그리지 않고 누를 수도 없다 */
		interactive?: boolean;
		/** 스크린리더용 설명 */
		label?: string;
	} = $props();

	const U = 44;
	const PAD = 12;
	const T = 7;
	const HIT = 26;
	const HEAD = 5.2;

	let litSet = $derived(new Set(lit));
	let edges = $derived(
		gridEdges(w, h).map((e) => {
			const [k, xs, ys] = e.split(',');
			const x = +xs * U + PAD;
			const y = +ys * U + PAD;
			const horiz = k === 'h';
			// 성냥 몸통은 점과 점 사이를 거의 다 채우고, 머리는 한쪽 끝(가로는 오른쪽, 세로는 위)
			const g = horiz
				? { x: x + 5, y: y - T / 2, w: U - 10, h: T, hx: x + 4, hy: y - HIT / 2, hw: U - 8, hh: HIT, cx: x + U - 7, cy: y }
				: { x: x - T / 2, y: y + 5, w: T, h: U - 10, hx: x - HIT / 2, hy: y + 4, hw: HIT, hh: U - 8, cx: x, cy: y + 7 };
			return { e, horiz, ...g, name: `${horiz ? '가로' : '세로'} ${+xs + 1}-${+ys + 1}` };
		})
	);

	function onKey(ev: KeyboardEvent, e: string, on: boolean) {
		if (ev.key === 'Enter' || ev.key === ' ') {
			ev.preventDefault();
			onedge(e, on);
		}
	}
</script>

<div class="gboard" class:mini={!interactive}>
	{#if label}<span class="sr-only">{label}</span>{/if}
	<svg class="fit" viewBox="0 0 {w * U + PAD * 2} {h * U + PAD * 2}" role="presentation">
		<!-- 모눈 -->
		{#each Array.from({ length: (w + 1) * (h + 1) }, (_, i) => i) as i (i)}
			<circle cx={(i % (w + 1)) * U + PAD} cy={Math.floor(i / (w + 1)) * U + PAD} r="1.8" class="dot" />
		{/each}
		{#each edges as g (g.e)}
			{@const on = litSet.has(g.e)}
			{#if on}
				<g class="match" class:picked={picked === g.e}>
					<rect x={g.x} y={g.y} width={g.w} height={g.h} rx="2.5" class="wood" />
					<circle cx={g.cx} cy={g.cy} r={HEAD} class="head" />
				</g>
			{:else if interactive}
				{#if picked === g.e}
					<rect x={g.x} y={g.y} width={g.w} height={g.h} rx="2.5" class="lifted" />
				{:else}
					<rect x={g.x} y={g.y} width={g.w} height={g.h} rx="2.5" class="slot" />
				{/if}
			{/if}
			{#if interactive}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<rect
					x={g.hx}
					y={g.hy}
					width={g.hw}
					height={g.hh}
					class="hit"
					role="button"
					tabindex="0"
					aria-label="{g.name} — {on ? '성냥 있음' : '빈 자리'}"
					onclick={() => onedge(g.e, on)}
					onkeydown={(ev) => onKey(ev, g.e, on)}
				/>
			{/if}
		{/each}
	</svg>
</div>

<style>
	.gboard {
		background-color: #fffaf0;
		background-image:
			linear-gradient(rgba(120, 150, 200, 0.12) 1px, transparent 1px),
			linear-gradient(90deg, rgba(120, 150, 200, 0.12) 1px, transparent 1px);
		background-size: 11px 11px;
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.gboard.mini {
		padding: 6px;
		border-radius: 10px;
	}
	.fit {
		width: 100%;
		max-width: 320px;
		height: auto;
	}
	.dot {
		fill: rgba(80, 90, 110, 0.28);
	}
	.wood {
		fill: #e3a648;
		stroke: #b57a26;
		stroke-width: 1;
	}
	.head {
		fill: #c8382e;
		stroke: #8f2219;
		stroke-width: 1;
	}
	.match.picked .wood {
		fill: #f3c46f;
	}
	.match.picked {
		filter: drop-shadow(0 4px 5px rgba(140, 90, 20, 0.45));
	}
	.slot {
		fill: transparent;
		stroke: rgba(80, 90, 110, 0.22);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}
	/* 집어 든 성냥의 원래 자리 */
	.lifted {
		fill: rgba(227, 166, 72, 0.18);
		stroke: #e3a648;
		stroke-width: 1.2;
		stroke-dasharray: 3 2;
	}
	.hit {
		fill: transparent;
		cursor: pointer;
	}
	.hit:focus-visible {
		outline: 2px solid #c8382e;
		outline-offset: -2px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
