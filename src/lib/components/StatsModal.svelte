<script lang="ts">
	import { onMount } from 'svelte';
	import type { SolveStats } from '$lib/game';

	let {
		stats,
		solveStats,
		onclose
	}: {
		stats: { dayStreak: number; maxStreak: number; played: number };
		solveStats: SolveStats;
		onclose: () => void;
	} = $props();

	let closeBtn = $state<HTMLButtonElement | null>(null);
	let maxHint = $derived(Math.max(...solveStats.hintDist, 1));

	onMount(() => closeBtn?.focus());

	const HINT_LABELS = ['힌트 없이', '힌트 1개', '힌트 2개', '힌트 3개'];
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events (배경 클릭은 보조수단, ESC·닫기 버튼이 주 경로) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose}>
	<div
		class="modal"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="stats-title"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="m-head">
			<h2 id="stats-title">내 기록</h2>
			<button class="m-close" bind:this={closeBtn} onclick={onclose} aria-label="닫기">✕</button>
		</div>

		<div class="m-nums">
			<div><b>{solveStats.solved}</b><span>맞힌 문제</span></div>
			<div><b>{stats.dayStreak}</b><span>현재 연속</span></div>
			<div><b>{stats.maxStreak}</b><span>최고 연속</span></div>
			<div><b>{stats.played}</b><span>완주한 날</span></div>
		</div>

		<div class="m-hist">
			<div class="m-hist-title">힌트 사용 분포</div>
			{#if solveStats.solved === 0}
				<p class="m-empty">아직 맞힌 문제가 없어요.<br />오늘의 딸깍을 풀면 여기에 쌓여요.</p>
			{:else}
				{#each solveStats.hintDist as count, i (i)}
					<div class="hbar">
						<span class="hbar-label">{HINT_LABELS[i]}</span>
						<div class="hbar-track">
							<div class="hbar-fill" style="width:{(count / maxHint) * 100}%"></div>
						</div>
						<span class="hbar-n">{count}</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(44, 40, 34, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 100;
		animation: fade var(--dur-move) var(--ease-out);
	}
	.modal {
		width: 100%;
		max-width: 380px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 22px;
		box-shadow: 0 18px 50px rgba(44, 40, 34, 0.28);
		animation: pop var(--dur-move) var(--ease-pop);
	}
	.m-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 18px;
	}
	.m-head h2 {
		font-size: var(--fs-lg);
		font-weight: var(--fw-emphasis);
	}
	.m-close {
		width: 32px;
		height: 32px;
		border-radius: 9px;
		border: 1px solid var(--border);
		background: var(--panel-2);
		color: var(--muted);
		font-size: 15px;
		cursor: pointer;
		font-family: inherit;
	}
	.m-close:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.m-nums {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
		margin-bottom: 20px;
	}
	.m-nums div {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}
	.m-nums b {
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	.m-nums span {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		text-align: center;
	}
	.m-hist-title {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		color: var(--muted);
		margin-bottom: 10px;
	}
	.hbar {
		display: grid;
		grid-template-columns: 56px 1fr 24px;
		align-items: center;
		gap: 8px;
		margin-bottom: 7px;
	}
	.hbar-label {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--text);
	}
	.hbar-track {
		height: 16px;
		background: var(--panel-2);
		border-radius: var(--seg-r);
		overflow: hidden;
	}
	.hbar-fill {
		height: 100%;
		min-width: 3px;
		background: var(--accent);
		border-radius: var(--seg-r);
		transition: width var(--dur-judge) var(--ease-out);
	}
	.hbar-n {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-number);
		font-variant-numeric: tabular-nums;
		color: var(--muted);
		text-align: right;
	}
	.m-empty {
		font-size: var(--fs-xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		line-height: var(--lh-reading);
		text-align: center;
		padding: 12px 0;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.94) translateY(8px);
		}
	}
</style>
