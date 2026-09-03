<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * 검색으로 낱개 페이지에 떨어진 사람에게 데일리로 가는 길을 한 줄로 알린다.
	 *
	 * #243이 같은 이유로 /trivia/[slug]에 넣었던 것인데 거기서 멈춰 있었다. 8/30에
	 * 네이버 검색 21세션 중 14가 /matchstick·/cubenet에 내렸고 그 두 곳에는 본문에
	 * 데일리로 가는 길이 없거나(성냥개비) 맨 아래 보조 버튼뿐이었다(전개도).
	 *
	 * 콘텐츠를 다 읽고 나서는 늦다 — 들어가기 전에 세운다.
	 */
	let { children }: { children: Snippet } = $props();
</script>

<a class="daily-band" href="/">
	<span class="t">{@render children()}</span>
	<span class="go">오늘 문제 풀기 →</span>
</a>

<style>
	.daily-band {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 18px;
		padding: 14px 16px;
		background: var(--correct-bg);
		border: 1px solid var(--accent);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text);
	}
	.t {
		font-size: 14px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	/* 강조는 쓰는 쪽 마크업에 있어서 스코프가 다르다 */
	.t :global(b) {
		color: var(--accent-text);
	}
	.go {
		flex: none;
		font-size: 13px;
		font-weight: 800;
		color: var(--accent-text);
	}
</style>
