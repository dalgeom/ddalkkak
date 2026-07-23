<script lang="ts">
	/**
	 * 손으로 그린 인라인 SVG 그림 블록. 버스·손가락·주사위처럼 글자로 표현할 수 없는
	 * 그림 규칙 문제를 위한 것. 삽화는 배치 생성이 안 되므로 문제마다 직접 그려 넣는다.
	 *
	 * svg: <svg>…</svg> 마크업 전문. problems.ts에 내가 직접 작성한 것이라 신뢰 대상이다.
	 *      팔레트 토큰(var(--text) 등)을 쓰면 인라인 SVG가 페이지 색을 상속한다.
	 * caption: 그림 아래 짧은 설명(선택).
	 */
	let { svg, caption }: { svg: string; caption?: string } = $props();
</script>

<figure class="fig">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<div class="fig-svg">{@html svg}</div>
	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
	.fig {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
	}
	.fig-svg {
		width: 100%;
		max-width: 420px;
		display: flex;
		justify-content: center;
	}
	.fig-svg :global(svg) {
		width: 100%;
		height: auto;
		max-height: 240px;
	}
	figcaption {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
		text-align: center;
	}
</style>
