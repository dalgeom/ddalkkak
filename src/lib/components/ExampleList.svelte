<script lang="ts">
	/**
	 * 발견형 문제의 예시 줄(pre 블록)을 표로 세워 보여준다.
	 * 그냥 <pre>로 흘리면 "5+3=28" 같은 줄이 본문에 섞여 디자인되지 않은 텍스트로 보인다.
	 * 물음표가 든 줄은 '지금 맞혀야 할 줄'이므로 색과 무게로 분리한다.
	 */
	let { text }: { text: string } = $props();

	let rows = $derived(text.split('\n').map((l) => l.replace(/\s+$/, '')));
	/** 한 줄짜리(수열 등)는 표가 아니라 한 덩어리로 보여주는 게 자연스럽다 */
	let single = $derived(rows.filter((l) => l.trim()).length <= 1);
</script>

<div class="ex" class:single>
	{#each rows as line, i (i)}
		{#if line.trim() === ''}
			<div class="gap" aria-hidden="true"></div>
		{:else}
			<div class="row" class:ask={line.includes('?')}>{line}</div>
		{/if}
	{/each}
</div>

<style>
	.ex {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
		/* 자릿수가 흔들리면 예시끼리 비교가 안 된다 */
		font-variant-numeric: tabular-nums;
		overflow-x: auto;
	}
	.row {
		font-size: 16.5px;
		font-weight: 600;
		line-height: 1.45;
		color: var(--text);
		white-space: pre;
		letter-spacing: 0.2px;
	}
	.row.ask {
		color: var(--accent-2);
		font-weight: 800;
	}
	.gap {
		height: 6px;
	}
	/* 한 줄짜리(수열)는 크게 한 덩어리로 */
	.ex.single .row {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.4px;
	}
	.ex.single {
		padding: 16px 12px;
	}

	@media (max-width: 380px) {
		.row {
			font-size: 15px;
		}
		.ex.single .row {
			font-size: 16.5px;
		}
	}
</style>
