<script lang="ts">
	import FaceMark from './FaceMark.svelte';
	import { FACES, type View } from '$lib/cubenet';

	/**
	 * 세 면이 보이는 주사위 그림.
	 * view = [윗면, 왼쪽 면, 오른쪽 면]. 이 '순서'가 곧 거울상 여부를 가르므로
	 * 왼쪽·오른쪽을 바꿔 그리면 다른 문제가 된다.
	 *
	 * 기호는 면 중앙에 똑바로 그린다. 면 기울기에 맞춰 눕혀도 봤는데
	 * 윗면의 사각형이 마름모로, 옆면의 십자가 엑스로 뭉개져서 서로 구분이 안 됐다.
	 * 색으로는 갈리지만 색각 이상이 있으면 못 푼다. 입체감보다 정확히 읽히는 쪽을 택했다.
	 */
	let { view, size = 96 }: { view: View; size?: number } = $props();

	// 2:1 아이소메트릭 — W는 가로 절반, H는 윗면 마름모의 세로 절반, D는 옆면 높이
	const W = $derived(size * 0.5);
	const H = $derived(W * 0.5);
	const D = $derived(size * 0.56);
	const pad = 4;

	const top = $derived(`${W},0 ${2 * W},${H} ${W},${2 * H} 0,${H}`);
	const left = $derived(`0,${H} ${W},${2 * H} ${W},${2 * H + D} 0,${H + D}`);
	const right = $derived(`${W},${2 * H} ${2 * W},${H} ${2 * W},${H + D} ${W},${2 * H + D}`);

	/* 면 중앙에 기호를 놓는다. 윗면은 세로로 눌려 있어 조금 작게 잡는다. */
	const place = (cx: number, cy: number, m: number) =>
		`translate(${cx - m / 2},${cy - m / 2}) scale(${m})`;
	const mTop = $derived(place(W, H, W * 0.66));
	const mLeft = $derived(place(W * 0.5, 1.5 * H + D * 0.5, W * 0.74));
	const mRight = $derived(place(W * 1.5, 1.5 * H + D * 0.5, W * 0.74));

	const label = $derived(
		`주사위 — 윗면 ${FACES[view[0]].name}, 왼쪽 ${FACES[view[1]].name}, 오른쪽 ${FACES[view[2]].name}`
	);
</script>

<svg
	viewBox="{-pad} {-pad} {2 * W + pad * 2} {2 * H + D + pad * 2}"
	width={2 * W + pad * 2}
	role="img"
	aria-label={label}
>
	<polygon points={top} fill="var(--panel)" stroke="var(--border-strong)" stroke-width="1.5" />
	<polygon points={left} fill="var(--panel-2)" stroke="var(--border-strong)" stroke-width="1.5" />
	<polygon points={right} fill="var(--panel)" stroke="var(--border-strong)" stroke-width="1.5" />

	<g transform={mTop}><FaceMark face={view[0]} /></g>
	<g transform={mLeft}><FaceMark face={view[1]} /></g>
	<g transform={mRight}><FaceMark face={view[2]} /></g>
</svg>

<style>
	svg {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
