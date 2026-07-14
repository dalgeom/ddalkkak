<script lang="ts">
	let { lines, frags = {} }: { lines: string[]; frags?: Record<string, string> } = $props();

	const SEG: Record<string, [number, number, number, number]> = {
		a: [10, 0, 34, 7],
		b: [46, 8, 7, 34],
		c: [46, 50, 7, 34],
		d: [10, 86, 34, 7],
		e: [1, 50, 7, 34],
		f: [1, 8, 7, 34],
		g: [10, 43, 34, 7]
	};
	const DIG: Record<string, string> = {
		'0': 'abcdef',
		'1': 'bc',
		'2': 'abdeg',
		'3': 'abcdg',
		'4': 'bcfg',
		'5': 'acdfg',
		'6': 'acdefg',
		'7': 'abc',
		'8': 'abcdefg',
		'9': 'abcdfg'
	};
	const segEntries = Object.entries(SEG);
</script>

<div class="lcd">
	{#each lines as line (line)}
		<div class="lrow">
			{#each line.split('') as ch, i (i)}
				{#if DIG[ch] || frags[ch] !== undefined}
					<svg width="42" height="72" viewBox="-2 -2 58 97">
						{#each segEntries as [k, p] (k)}
							<rect
								x={p[0]}
								y={p[1]}
								width={p[2]}
								height={p[3]}
								rx="3"
								fill={(frags[ch] !== undefined ? frags[ch] : DIG[ch]).includes(k)
									? '#3aff62'
									: '#111a12'}
							/>
						{/each}
					</svg>
				{:else if ch === '?'}
					<span class="lq">?</span>
				{:else if ch === ' '}
					<span class="sp"></span>
				{:else}
					<span class="lsym">{ch}</span>
				{/if}
			{/each}
		</div>
	{/each}
</div>

<style>
	.lcd {
		background: #0a0d0a;
		border-radius: 10px;
		padding: 14px 12px;
		margin: 10px 0;
		overflow-x: auto;
	}
	.lrow {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 8px 0;
		white-space: nowrap;
	}
	svg {
		flex: none;
	}
	.lsym {
		color: #ffd24a;
		font-size: 26px;
		font-weight: 800;
	}
	.lq {
		color: #ff5a5a;
		font-size: 30px;
		font-weight: 800;
	}
	.sp {
		width: 6px;
		flex: none;
	}
</style>
