<script lang="ts">
	import { onMount } from 'svelte';
	import { freshNotices, loadSeen, markSeen, type Notice } from '$lib/notices';
	import { track } from '$lib/analytics';

	/** 아직 안 본 최근 소식 하나를 한 줄로(notices.ts). ✕를 누르거나 들어가면 다시 안 뜬다. */
	let n = $state<Notice | null>(null);

	onMount(() => {
		const seen = new Set(loadSeen());
		n = freshNotices(Date.now()).find((x) => !seen.has(x.id)) ?? null;
	});

	function go() {
		if (!n) return;
		markSeen([n.id]);
		track('news_bar_click', { id: n.id });
	}
	function close() {
		if (!n) return;
		markSeen([n.id]);
		track('news_bar_close', { id: n.id });
		n = null;
	}
</script>

{#if n}
	<div class="nbar">
		<a href={n.href} onclick={go}>
			<span class="tag">새 소식</span>
			<b>{n.title}</b>
			<span class="arr" aria-hidden="true">→</span>
		</a>
		<button onclick={close} aria-label="새 소식 닫기">✕</button>
	</div>
{/if}

<style>
	.nbar {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 14px;
		background: var(--panel);
		border: 1.5px solid var(--accent);
		border-radius: 14px;
		padding: 4px 4px 4px 12px;
	}
	.nbar a {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: var(--text);
		padding: 6px 0;
	}
	.tag {
		flex: none;
		font-size: 11.5px;
		font-weight: 800;
		color: #fff;
		background: var(--accent);
		border-radius: 6px;
		padding: 2px 7px;
	}
	b {
		font-size: 14px;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.arr {
		color: var(--accent-text);
		font-weight: 800;
	}
	button {
		flex: none;
		width: 36px;
		height: 36px;
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 13px;
		cursor: pointer;
		border-radius: 10px;
		font-family: inherit;
	}
</style>
