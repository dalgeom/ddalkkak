<script lang="ts">
	let { rows }: { rows: string[] } = $props();

	const COL: Record<string, string> = {
		R: '#ff3b30',
		O: '#ff9500',
		Y: '#ffcc00',
		G: '#28a745',
		B: '#1e88ff',
		N: '#232a7c',
		P: '#8e24aa'
	};
</script>

{#each rows as row (row)}
	<div class="crow">
		{#each row.split(' ') as it, i (i)}
			{#if it === '+' || it === '-' || it === '='}
				<div class="cop">{it === '-' ? '−' : it}</div>
			{:else if it === '?'}
				<div class="cunk">?</div>
			{:else}
				<div class="csq" style="background:{COL[it]}"></div>
			{/if}
		{/each}
	</div>
{/each}

<style>
	.crow {
		display: flex;
		align-items: center;
		gap: 5px;
		margin: 10px 0;
	}
	.csq {
		width: 34px;
		height: 34px;
		border-radius: 7px;
		box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.16);
		flex: none;
	}
	.cop {
		font-size: 21px;
		font-weight: 900;
		width: 18px;
		text-align: center;
		flex: none;
	}
	.cunk {
		width: 34px;
		height: 34px;
		border-radius: 7px;
		border: 2px dashed #c4b8a4;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 900;
		color: #d33;
		flex: none;
	}
</style>
