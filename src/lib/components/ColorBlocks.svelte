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
	// 색 블록은 배경색으로만 표현되므로 스크린리더용 한글 색이름을 붙인다.
	const NAME: Record<string, string> = {
		R: '빨강',
		O: '주황',
		Y: '노랑',
		G: '초록',
		B: '파랑',
		N: '남색',
		P: '보라'
	};

	/** 폭 가중치 합: 색 블록=1, 연산자/물음표=0.55 */
	function rowUnits(row: string): number {
		let n = 0;
		for (const it of row.split(' ')) {
			if (it === '+' || it === '-' || it === '=' || it === '?') n += 0.55;
			else n += 1;
		}
		return Math.max(1, n);
	}
</script>

{#each rows as row (row)}
	<div class="crow" style="--n:{rowUnits(row)}">
		{#each row.split(' ') as it, i (i)}
			{#if it === '+' || it === '-' || it === '='}
				<div class="cop">{it === '-' ? '−' : it}</div>
			{:else if it === '?'}
				<div class="cunk">?</div>
			{:else}
				<div class="csq" style="background:{COL[it]}" role="img" aria-label={NAME[it] ?? it}></div>
			{/if}
		{/each}
	</div>
{/each}

<style>
	.crow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 5px;
		row-gap: 8px;
		margin: 10px 0;
	}
	/* Layer 0 — flex-shrink 기반 절대 안전망 */
	.csq {
		flex: 1 1 0;
		min-width: 0;
		max-width: 34px;
		aspect-ratio: 1;
		height: auto;
		border-radius: 7px;
		box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.16);
	}
	.cop {
		font-size: clamp(14px, 5cqi, 21px);
		font-weight: 900;
		text-align: center;
		flex: none;
		color: var(--text);
	}
	.cunk {
		flex: 1 1 0;
		min-width: 0;
		max-width: 34px;
		aspect-ratio: 1;
		height: auto;
		border-radius: 7px;
		border: 2px dashed #b7a98f;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(13px, 4cqi, 18px);
		font-weight: 900;
		color: #c0392b;
	}
	/* Layer 1 — 컨테이너 폭 기준 정밀 축소 */
	@supports (container-type: inline-size) {
		.csq,
		.cunk {
			flex: none;
			width: clamp(14px, calc(100cqi / var(--n, 1) * 0.9), 34px);
		}
		.cop {
			font-size: clamp(14px, calc(100cqi / var(--n, 1) * 0.55), 21px);
			width: auto;
		}
	}
</style>
