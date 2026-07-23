<script lang="ts">
	import type { Problem } from '$lib/problems';
	import SevenSeg from '$lib/components/SevenSeg.svelte';
	import ColorBlocks from '$lib/components/ColorBlocks.svelte';
	import Glyph from '$lib/components/Glyph.svelte';
	import Figure from '$lib/components/Figure.svelte';
	import Icon from '$lib/components/Icon.svelte';

	/**
	 * 읽기 전용 문제 뷰. 아카이브(지난 문제 다시 보기)에서 쓴다.
	 * 게임 상태를 쓰지 않으므로 localStorage를 건드리지 않는다 — 데일리 공정성과 완전히 분리된다.
	 * 정답은 기본으로 가려져 있고, 눌러야 열린다.
	 */
	let { problem }: { problem: Problem } = $props();

	let revealed = $state(false);

	let answerText = $derived(
		problem.type === 'choice'
			? (problem.choices?.[problem.answerIndex ?? 0] ?? '')
			: (problem.answers?.[0] ?? '')
	);
</script>

<article class="pv">
	<div class="pv-chip">{problem.chip}</div>
	<div class="pv-q">
		{#each problem.blocks as b, i (i)}
			{#if b.kind === 'text'}
				<div class="qtext">{@html b.html}</div>
			{:else if b.kind === 'pre'}
				<pre class="qblock" style="--maxlen:{Math.max(...b.text.split('\n').map((l) => l.length), 1)}">{b.text}</pre>
			{:else if b.kind === 'lcd'}
				<SevenSeg lines={b.lines} frags={b.frags} />
			{:else if b.kind === 'colors'}
				<ColorBlocks rows={b.rows} />
			{:else if b.kind === 'glyph'}
				<Glyph lines={b.lines} axis={b.axis} />
			{:else if b.kind === 'figure'}
				<Figure svg={b.svg} caption={b.caption} />
			{/if}
		{/each}
	</div>

	{#if problem.type === 'choice' && problem.choices}
		<ul class="pv-choices">
			{#each problem.choices as c, i (i)}
				<li class:answer={revealed && i === problem.answerIndex}>{c}</li>
			{/each}
		</ul>
	{/if}

	{#if revealed}
		<div class="pv-answer">
			<div class="pv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
			<div class="pv-answer-val">{answerText}</div>
			<div class="pv-explain">{@html problem.explain}</div>
		</div>
	{:else}
		<button class="pv-reveal" onclick={() => (revealed = true)}>정답 보기</button>
	{/if}
</article>

<style>
	.pv {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.pv-chip {
		align-self: flex-start;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		color: var(--accent);
		background: var(--accent-soft);
		border-radius: 999px;
		padding: 4px 11px;
	}
	.pv-q {
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.qtext {
		font-size: var(--fs-lg);
		font-weight: var(--fw-body);
		line-height: var(--lh-reading);
		word-break: keep-all;
	}
	.qblock {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px;
		font-size: clamp(13px, calc(90cqi / var(--maxlen)), 20px);
		line-height: 1.6;
		overflow-x: auto;
	}
	.pv-choices {
		list-style: none;
		display: grid;
		gap: 8px;
	}
	.pv-choices li {
		padding: 12px 15px;
		border: 1.5px solid var(--border);
		border-radius: 12px;
		background: var(--panel-2);
		font-size: var(--fs-sm);
		font-weight: var(--fw-label);
	}
	.pv-choices li.answer {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: #1f6b41;
	}
	.pv-reveal {
		align-self: flex-start;
		font-family: inherit;
		font-size: var(--fs-xs);
		font-weight: var(--fw-emphasis);
		color: var(--muted);
		background: var(--panel-2);
		border: 1.5px solid var(--border-strong);
		border-bottom-width: 3px;
		border-radius: 12px;
		padding: 10px 18px;
		cursor: pointer;
		transition:
			color var(--dur-tap) var(--ease-out),
			border-color var(--dur-tap) var(--ease-out);
	}
	.pv-reveal:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.pv-reveal:active {
		border-bottom-width: 1px;
	}
	.pv-answer {
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		border-radius: 12px;
		padding: 15px;
		animation: pv-fade var(--dur-move) var(--ease-out);
	}
	.pv-answer-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		color: #1f6b41;
		margin-bottom: 8px;
	}
	.pv-answer-val {
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
		color: var(--text);
		margin-bottom: 8px;
	}
	.pv-explain {
		font-size: var(--fs-sm);
		font-weight: var(--fw-caption);
		line-height: var(--lh-reading);
		color: #2c4d3b;
		word-break: keep-all;
	}
	.pv-explain :global(b) {
		color: var(--accent);
		font-weight: var(--fw-emphasis);
	}
	@keyframes pv-fade {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
