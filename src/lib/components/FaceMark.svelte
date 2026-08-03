<script lang="ts">
	import { FACES } from '$lib/cubenet';

	/**
	 * 면 기호 하나를 0~1 단위 상자 안에 그린다.
	 * 부모가 transform으로 기울여 붙이면 면 위에 얹힌 것처럼 보인다.
	 *
	 * 90도 돌려도 같은 모양만 쓴다 — 접히면서 기호가 돌아가는데
	 * 화살표나 숫자였다면 "이게 6이야 9야" 시비가 붙는다.
	 */
	let { face, opacity = 1 }: { face: number; opacity?: number } = $props();

	const f = $derived(FACES[face] ?? FACES[0]);
	const R = 0.26; // 단위 상자 기준 반지름
</script>

<g {opacity}>
	{#if f.shape === 'disc'}
		<circle cx="0.5" cy="0.5" r={R} fill={f.color} />
	{:else if f.shape === 'ring'}
		<circle cx="0.5" cy="0.5" r={R - 0.045} fill="none" stroke={f.color} stroke-width="0.11" />
	{:else if f.shape === 'square'}
		<rect x={0.5 - R} y={0.5 - R} width={R * 2} height={R * 2} rx="0.04" fill={f.color} />
	{:else if f.shape === 'frame'}
		<rect
			x={0.5 - R + 0.055}
			y={0.5 - R + 0.055}
			width={(R - 0.055) * 2}
			height={(R - 0.055) * 2}
			rx="0.03"
			fill="none"
			stroke={f.color}
			stroke-width="0.11"
		/>
	{:else if f.shape === 'plus'}
		<path
			d="M0.5,{0.5 - R} V{0.5 + R} M{0.5 - R},0.5 H{0.5 + R}"
			stroke={f.color}
			stroke-width="0.15"
			stroke-linecap="round"
			fill="none"
		/>
	{:else}
		{#each [
			[0.5 - R * 0.72, 0.5 - R * 0.72],
			[0.5 + R * 0.72, 0.5 - R * 0.72],
			[0.5 - R * 0.72, 0.5 + R * 0.72],
			[0.5 + R * 0.72, 0.5 + R * 0.72]
		] as [cx, cy], i (i)}
			<circle {cx} {cy} r="0.095" fill={f.color} />
		{/each}
	{/if}
</g>
