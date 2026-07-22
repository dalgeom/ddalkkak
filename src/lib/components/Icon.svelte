<script lang="ts">
	/**
	 * 인라인 SVG 아이콘. 이모지로 의미를 전달하던 자리를 대체한다.
	 * currentColor를 쓰므로 부모의 color로 색이 결정된다.
	 * judge 계열(correct/wrong/giveup)은 원형 배경이 있어 판정 배너에서 눈에 걸린다.
	 */
	export type IconName =
		| 'correct'
		| 'wrong'
		| 'giveup'
		| 'hint'
		| 'streak'
		| 'arrow'
		| 'search'
		| 'book'
		| 'match'
		| 'share'
		| 'dice'
		| 'trophy'
		| 'timer';

	let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
	class="icon"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'correct'}
		<circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.16" stroke="none" />
		<path d="M7 12.5l3.2 3.2L17 9" stroke-width="2.4" />
	{:else if name === 'wrong'}
		<circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.16" stroke="none" />
		<path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke-width="2.4" />
	{:else if name === 'giveup'}
		<circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.16" stroke="none" />
		<path d="M12 7v6" stroke-width="2.4" />
		<circle cx="12" cy="16.6" r="1.3" fill="currentColor" stroke="none" />
	{:else if name === 'hint'}
		<path d="M9.5 18h5M10.5 21h3" />
		<path d="M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z" />
	{:else if name === 'streak'}
		<path d="M4 15l5-5 4 4 7-7" />
		<path d="M20 7h-4M20 7v4" />
	{:else if name === 'arrow'}
		<path d="M5 12h14M13 6l6 6-6 6" />
	{:else if name === 'search'}
		<circle cx="10.5" cy="10.5" r="6.5" />
		<path d="M15.5 15.5L21 21" />
	{:else if name === 'book'}
		<path d="M4 4.5h6a2.5 2.5 0 012.5 2.5v12A2 2 0 0010.5 17H4z" />
		<path d="M20 4.5h-6A2.5 2.5 0 0011.5 7v12A2 2 0 0113.5 17H20z" />
	{:else if name === 'match'}
		<path d="M6 20L14 6" />
		<circle cx="15.5" cy="4.2" r="2.4" fill="currentColor" stroke="none" />
		<path d="M11 20h9" />
	{:else if name === 'share'}
		<path d="M12 15V4M12 4L8 8M12 4l4 4" />
		<path d="M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13" />
	{:else if name === 'dice'}
		<rect x="3.5" y="3.5" width="17" height="17" rx="4" />
		<circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
		<circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
		<circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
	{:else if name === 'trophy'}
		<path d="M8 4h8v5a4 4 0 01-8 0z" />
		<path d="M8 5.5H5.5v1A3.5 3.5 0 009 10M16 5.5h2.5v1A3.5 3.5 0 0115 10" />
		<path d="M12 13v4M9 20h6" />
	{:else if name === 'timer'}
		<circle cx="12" cy="13.5" r="7.5" />
		<path d="M12 9.5v4l2.5 2M9.5 2.5h5" />
	{/if}
</svg>

<style>
	.icon {
		flex: none;
		display: block;
	}
</style>
