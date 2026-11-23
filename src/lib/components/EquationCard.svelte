<script lang="ts">
	import type { Equation } from '$lib/equation';

	/** 그림 방정식 한 문제(오늘의 10문제 4번 칸, 11/24부터) — 그림마다 숨은 수를 찾아 마지막 식을 계산한다 */
	let {
		data,
		judged,
		onwrong,
		onsolve
	}: { data: Equation; judged: boolean; onwrong: () => void; onsolve: () => void } = $props();

	let value = $state('');

	function submit() {
		if (judged || !value.trim()) return;
		if (Number(value.trim()) === data.answer) onsolve();
		else onwrong();
	}
</script>

<div class="qtext">그림마다 1~9 가운데 수가 하나씩 숨어 있어요. 마지막 식은 얼마일까요?</div>
<p class="note">곱셈(×)이 있으면 곱셈을 먼저 해요.</p>
<div class="lines">
	{#each data.lines as l, i (i)}
		<div class="line"><span class="ex">{l.expr}</span><span class="eq">=</span><b>{l.total}</b></div>
	{/each}
	<div class="line q"><span class="ex">{data.question}</span><span class="eq">=</span><b>{judged ? data.answer : '?'}</b></div>
</div>
{#if !judged}
	<div class="row">
		<input
			class="in"
			bind:value
			inputmode="numeric"
			placeholder="답(숫자)"
			autocomplete="off"
			onkeydown={(e) => e.key === 'Enter' && submit()}
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
	.note {
		margin: 6px 0 0;
		font-size: 13.5px;
		color: var(--muted);
	}
	.lines {
		margin: 16px 0;
		display: grid;
		gap: 8px;
	}
	.line {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		font-size: 22px;
		color: var(--text);
	}
	.line.q {
		border-color: var(--accent);
	}
	.ex {
		letter-spacing: 1px;
	}
	.eq {
		color: var(--muted);
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
