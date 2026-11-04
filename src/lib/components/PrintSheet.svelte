<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * 인쇄용 학습지(2026-11-04) — 화면에는 안 보이고, 인쇄할 때만 이것만 종이에 나온다.
	 * body 맨 끝으로 옮겨 두고 인쇄 때 body의 다른 자식을 모두 숨긴다. 앱 안에 두면 헤더 · 탭 · 광고까지 같이 찍히고
	 * visibility로 숨기면 빈 쪽이 생긴다. 성냥 그림은 잉크를 덜 쓰게 흰 바탕 · 검은 성냥으로 바꾼다.
	 */
	let { children }: { children: Snippet } = $props();

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}
</script>

<div class="print-sheet" use:portal>{@render children()}</div>

<style>
	.print-sheet {
		display: none;
	}
	@media print {
		:global(body > *:not(.print-sheet)) {
			display: none !important;
		}
		:global(html),
		:global(body) {
			background: #fff !important;
		}
		.print-sheet {
			display: block;
			color: #000;
			font-size: 11pt;
		}
		.print-sheet :global(.meq) {
			background: #fff !important;
			border: 1px solid #999;
			padding: 6px !important;
		}
		.print-sheet :global(svg) {
			max-width: 300px !important;
		}
		.print-sheet :global(.lit) {
			fill: #222 !important;
			filter: none !important;
		}
		.print-sheet :global(.ghost) {
			fill: #f1f1f1 !important;
			stroke: #ddd !important;
		}
		.print-sheet :global(.fixed) {
			fill: #222 !important;
		}
		.print-sheet :global(.new) {
			fill: #e07000 !important;
			stroke: #000 !important;
			filter: none !important;
		}
		.print-sheet :global(.gone) {
			stroke: #e07000 !important;
		}
	}
	@page {
		size: A4;
		margin: 14mm;
	}
</style>
