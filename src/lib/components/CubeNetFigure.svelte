<script lang="ts">
	import FaceMark from './FaceMark.svelte';
	import { FACES, type Cell } from '$lib/cubenet';

	let {
		rows,
		cells,
		faceOf,
		size = 46
	}: { rows: string[]; cells: Cell[]; faceOf: number[]; size?: number } = $props();

	const cols = $derived(Math.max(...rows.map((r) => r.length)));
	const pad = 6;
	const w = $derived(cols * size + pad * 2);
	const h = $derived(rows.length * size + pad * 2);

	const label = $derived(
		`전개도 — ${cells.map((c, i) => `${c.r + 1}행 ${c.c + 1}열 ${FACES[faceOf[i]].name}`).join(', ')}`
	);
</script>

<svg viewBox="0 0 {w} {h}" width={w} height={h} role="img" aria-label={label}>
	{#each cells as cell, i (i)}
		<g
			transform="translate({pad + cell.c * size},{pad + cell.r * size})"
			data-face={faceOf[i]}
			data-r={cell.r}
			data-c={cell.c}
		>
			<rect
				width={size}
				height={size}
				fill="var(--panel)"
				stroke="var(--border-strong)"
				stroke-width="1.5"
			/>
			<g transform="scale({size})">
				<FaceMark face={faceOf[i]} />
			</g>
		</g>
	{/each}
</svg>

<style>
	svg {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
