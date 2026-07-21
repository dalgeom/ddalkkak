<script lang="ts">
	let { size = 27 }: { size?: number } = $props();
</script>

<a class="logo" href="/" aria-label="딸깍 홈">
	<span class="word" style="font-size:{size}px">딸깍</span>
	<svg
		class="excl"
		style="height:{Math.round(size * 1.34)}px"
		viewBox="0 0 22 52"
		aria-hidden="true"
	>
		<path
			d="M11 2c5 0 8.5 3.7 8.5 8.4 0 2.9-1.4 4.8-2.8 6.5-1.1 1.3-2 2.5-2.3 4.3l-.9 5.6a1.4 1.4 0 0 1-1.4 1.2H8.9a1.4 1.4 0 0 1-1.4-1.2l-.9-5.6c-.3-1.8-1.2-3-2.3-4.3C2.9 15.2 1.5 13.3 1.5 10.4 1.5 5.7 5 2 11 2z"
			fill="#f6d34e"
			stroke="#d8ab34"
			stroke-width=".7"
		/>
		<path
			d="M8 10.5l3 3 3-3"
			fill="none"
			stroke="#2c2822"
			stroke-width="1.7"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<circle cx="11" cy="46.5" r="3.4" fill="currentColor" />
	</svg>
</a>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		text-decoration: none;
		color: var(--text);
	}
	.word {
		font-family: Georgia, 'Nanum Myeongjo', 'Batang', serif;
		font-weight: 900;
		letter-spacing: -1px;
		color: var(--text);
		line-height: 1;
	}
	.excl {
		display: block;
		margin-left: 1px;
		transform: translateY(-2px);
	}
</style>
