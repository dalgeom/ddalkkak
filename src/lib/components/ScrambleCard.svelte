<script lang="ts">
	import { scrambleCorrect, type Scramble } from '$lib/scramble';

	/** 글자 섞기 한 문제(오늘의 10문제 1번 칸, 11/24부터) — 음절을 섞은 낱말을 바로 놓는다 */
	let {
		data,
		judged,
		onwrong,
		onsolve
	}: { data: Scramble; judged: boolean; onwrong: () => void; onsolve: () => void } = $props();

	let value = $state('');

	function submit() {
		if (judged || !value.trim()) return;
		if (scrambleCorrect(data, value)) onsolve();
		else onwrong();
	}
</script>

<div class="qtext">음절을 섞어 놓았어요. 바로 놓으면 어떤 낱말일까요?</div>
<p class="cat">분야 · {data.category}</p>
<div class="chips" aria-label="섞인 음절">
	{#each data.letters as l, i (i)}<span class="chip">{l}</span>{/each}
</div>
{#if !judged}
	<div class="row">
		<input
			class="in"
			bind:value
			placeholder="낱말을 적어 주세요"
			autocomplete="off"
			onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submit()}
		/>
		<button class="go" disabled={!value.trim()} onclick={submit}>확인</button>
	</div>
{/if}

<style>
	.qtext {
		margin-top: 14px;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.cat {
		margin: 6px 0 0;
		font-size: 14px;
		color: var(--muted);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin: 18px 0;
	}
	.chip {
		min-width: 48px;
		padding: 10px 12px;
		border-radius: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		color: var(--text);
		font-size: 24px;
		font-weight: 800;
		text-align: center;
	}
	.row {
		display: flex;
		gap: 8px;
	}
	.in {
		flex: 1;
		min-width: 0;
		padding: 12px;
		font-size: 17px;
		font-family: inherit;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
	}
	.go {
		padding: 0 20px;
		min-height: 48px;
		border-radius: 12px;
		border: 0;
		font-family: inherit;
		font-weight: 800;
		font-size: 16px;
		background: var(--accent);
		color: #fff;
		cursor: pointer;
	}
	.go:disabled {
		opacity: 0.5;
	}
</style>
