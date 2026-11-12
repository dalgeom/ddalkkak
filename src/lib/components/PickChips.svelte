<script lang="ts">
	/**
	 * 「모두 고르시오」 보기를 눌러 고르는 칸(11/12 점검). 고른 번호를 입력칸 값(「1, 3」)으로 넣으니
	 * 판정 · 제출은 원래 입력칸 그대로 쓴다. 직접 쳐도 된다.
	 */
	let {
		options,
		value = $bindable(''),
		disabled = false
	}: { options: string[]; value: string; disabled?: boolean } = $props();

	const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
	let picked = $derived(
		new Set(
			String(value)
				.replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, (m) => String(CIRCLED.indexOf(m) + 1))
				.split(/[,\s·/]+/)
				.map((s) => Number(s))
				.filter((n) => n >= 1 && n <= options.length)
		)
	);

	function toggle(n: number) {
		const s = new Set(picked);
		if (s.has(n)) s.delete(n);
		else s.add(n);
		value = [...s].sort((a, b) => a - b).join(', ');
	}
</script>

<div class="picks" role="group" aria-label="보기 고르기 — 여러 개 고를 수 있어요">
	{#each options as o, i (i)}
		<button
			type="button"
			class="pick"
			class:on={picked.has(i + 1)}
			aria-pressed={picked.has(i + 1)}
			{disabled}
			onclick={() => toggle(i + 1)}
		>
			<span class="n">{CIRCLED[i]}</span>{o}
		</button>
	{/each}
</div>

<style>
	.picks {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-top: 10px;
	}
	.pick {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 8px 12px;
		background: var(--panel);
		border: 1.5px solid var(--border-strong);
		border-radius: 12px;
		color: var(--text);
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		text-align: left;
		word-break: keep-all;
		cursor: pointer;
	}
	.pick.on {
		background: var(--correct-bg);
		border-color: var(--accent);
		color: var(--accent-text);
	}
	.pick:disabled {
		cursor: default;
		opacity: 0.7;
	}
	.n {
		color: var(--muted);
	}
	.pick.on .n {
		color: var(--accent-text);
	}
</style>
