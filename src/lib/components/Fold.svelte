<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * 긴 목록 접기(v2, 2026-10-14). 처음엔 위쪽 일부만 보이고 「모두 보기」로 펼친다.
	 * 내용은 처음부터 페이지 안에 다 있다(검색엔진이 읽는 글은 그대로) — 화면 길이만 줄인다.
	 * 상식 홈이 견본 20문제 때문에 8,700px였다(10/14 점검).
	 */
	let { height = 900, label, children }: { height?: number; label: string; children: Snippet } = $props();
	let open = $state(false);
</script>

<div class="fold" class:open style:max-height={open ? null : `${height}px`}>
	{@render children()}
	{#if !open}<div class="fade" aria-hidden="true"></div>{/if}
</div>
{#if !open}
	<button class="more" onclick={() => (open = true)}>{label} <span aria-hidden="true">↓</span></button>
{/if}

<style>
	.fold {
		position: relative;
		overflow: hidden;
	}
	.fold.open {
		overflow: visible;
	}
	.fade {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 90px;
		background: linear-gradient(to bottom, transparent, var(--panel));
		pointer-events: none;
	}
	.more {
		display: block;
		width: 100%;
		margin-top: 8px;
		padding: 12px;
		border-radius: 14px;
		border: 1px solid var(--border-strong);
		background: var(--panel-2);
		color: var(--text);
		font-size: 14.5px;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
	}
</style>
