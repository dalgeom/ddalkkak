<script lang="ts">
	import { gridEdges } from '$lib/matchGrid';

	/**
	 * 그림 성냥 판(matchGrid.ts) — 네모 격자의 변에 성냥이 놓인다. 등식 판(MatchstickBoard)과 같은 색을 쓴다:
	 * 켜진 성냥 초록, 빈 자리 어두운 칸, 집은 성냥 주황.
	 * 성냥은 두께 8이라 손가락으로 누르기 어렵다 — 그 위에 두께 26짜리 투명한 누름 영역을 겹친다.
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
	const PAD = 10;
	const T = 8;
	const HIT = 26;

	let litSet = $derived(new Set(lit));
	let edges = $derived(
		gridEdges(w, h).map((e) => {
			const [k, xs, ys] = e.split(',');
			const x = +xs * U + PAD;
			const y = +ys * U + PAD;
			const g =
				k === 'h'
					? { x: x + 4, y: y - T / 2, w: U - 8, h: T, hx: x + 4, hy: y - HIT / 2, hw: U - 8, hh: HIT }
					: { x: x - T / 2, y: y + 4, w: T, h: U - 8, hx: x - HIT / 2, hy: y + 4, hw: HIT, hh: U - 8 };
			return { e, ...g, name: `${k === 'h' ? '가로' : '세로'} ${+xs + 1}-${+ys + 1}` };
		})
	);

	function onKey(ev: KeyboardEvent, e: string, on: boolean) {
		if (ev.key === 'Enter' || ev.key === ' ') {
			ev.preventDefault();
			onedge(e, on);
		}
	}
</script>

<div class="gboard">
	{#if label}<span class="sr-only">{label}</span>{/if}
	<svg class="fit" viewBox="0 0 {w * U + PAD * 2} {h * U + PAD * 2}" role="presentation">
		{#each Array.from({ length: (w + 1) * (h + 1) }, (_, i) => i) as i (i)}
			<circle cx={(i % (w + 1)) * U + PAD} cy={Math.floor(i / (w + 1)) * U + PAD} r="1.6" class="dot" />
		{/each}
		{#each edges as g (g.e)}
			{@const on = litSet.has(g.e)}
			{#if on || interactive}
				<rect
					x={g.x}
					y={g.y}
					width={g.w}
					height={g.h}
					rx="3"
					class="stick {picked === g.e ? 'picked' : on ? 'lit' : 'ghost'}"
				/>
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
		background: #0a0d0a;
		border-radius: 12px;
		padding: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.fit {
		width: 100%;
		max-width: 320px;
		height: auto;
	}
	.dot {
		fill: #2a3a2e;
	}
	.stick.lit {
		fill: #3aff62;
		filter: drop-shadow(0 0 5px rgba(58, 255, 98, 0.7));
	}
	.stick.ghost {
		fill: #121a14;
		stroke: #1f2f23;
		stroke-width: 1;
	}
	.stick.picked {
		fill: #ffb020;
		filter: drop-shadow(0 0 8px rgba(255, 176, 32, 0.9));
	}
	.hit {
		fill: transparent;
		cursor: pointer;
	}
	.hit:focus-visible {
		outline: 2px solid #ffd24a;
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
