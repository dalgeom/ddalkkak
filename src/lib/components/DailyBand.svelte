<script lang="ts">
	import { onMount } from 'svelte';
	import { ctaTrack } from '$lib/analytics';
	import type { Teaser } from '$lib/teaser';
	import type { Snippet } from 'svelte';

	/**
	 * 검색으로 낱개 페이지에 떨어진 사람에게 데일리로 가는 길을 한 줄로 알린다.
	 *
	 * #243이 같은 이유로 /trivia/[slug]에 넣었던 것인데 거기서 멈춰 있었다. 8/30에
	 * 네이버 검색 21세션 중 14가 /matchstick·/cubenet에 내렸고 그 두 곳에는 본문에
	 * 데일리로 가는 길이 없거나(성냥개비) 맨 아래 보조 버튼뿐이었다(전개도).
	 *
	 * 콘텐츠를 다 읽고 나서는 늦다 — 들어가기 전에 세운다.
	 *
	 * 9/16에 오늘 문제 한 줄을 얹었다. 9/02~15에 이 띠는 **110명이 봤는데 8명이 눌렀고**
	 * (7%) 같은 기간 맨 아래 버튼은 75명이 봐서 22명이 눌렀다(29%). 아래까지 읽은 사람은
	 * 이미 걸러진 사람이라 둘을 그대로 견줄 수는 없지만, 도달이 제일 큰 자리가 「매일
	 * 10문제씩 새로 나와요」라는 **아무 그림도 안 그려지는 문구**를 달고 있었던 것은 맞다.
	 * 「12 + 13 = 56」한 줄이 붙으면 궁금해서 눌린다는 것이 알림 카드에서 쓰던 예고와 같은 가설이다.
	 * 8/31 홈 맛보기(197명 중 1명 클릭)와 다른 점은 문제를 통째로 보여주지 않는다는 것이다.
	 * 2주 뒤 cta_band_click / cta_band_seen을 7%와 견준다.
	 */
	let { children }: { children: Snippet } = $props();

	let peek = $state<Teaser | null>(null);

	onMount(async () => {
		// 이 페이지들은 프리렌더라 오늘을 모른다. 실패하면 원래 문구 그대로 둔다.
		try {
			const r = await fetch('/api/teaser');
			if (!r.ok) return;
			const t = (await r.json()) as Teaser;
			if (t?.line) peek = t;
		} catch {
			/* 띠는 부가 정보다 — 못 받아도 링크는 그대로 선다 */
		}
	});
</script>

<a class="daily-band" href="/" use:ctaTrack={'band'}>
	{#if peek}
		<span class="t">
			<span class="chip">오늘의 {peek.chip}</span>
			<b class="line">{peek.line}</b>
		</span>
	{:else}
		<span class="t">{@render children()}</span>
	{/if}
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
		min-width: 0;
	}
	/* 강조는 쓰는 쪽 마크업에 있어서 스코프가 다르다 */
	.t :global(b) {
		color: var(--accent-text);
	}
	.chip {
		display: block;
		font-size: 12px;
		font-weight: 700;
		color: var(--accent-2);
	}
	/* 예시 줄은 문제 화면과 같은 모양으로 — 숫자 폭을 고정하고 줄바꿈하지 않는다.
	   위의 :global(b)보다 세게 걸어 본문 색을 지킨다(강조색이 둘이면 칩이 안 보인다) */
	.t .line {
		color: var(--text);
		display: block;
		font-size: 16px;
		font-weight: 800;
		white-space: pre;
		overflow: hidden;
		text-overflow: ellipsis;
		font-variant-numeric: tabular-nums;
	}
	.go {
		flex: none;
		font-size: 13px;
		font-weight: 800;
		color: var(--accent-text);
	}
</style>
