<script lang="ts">
	import AdSlot from '$lib/components/AdSlot.svelte';

	let { children } = $props();
</script>

<div class="wrap">
	<header>
		<a class="logo" href="/">딸깍<span class="spark">!</span></a>
		<nav>
			<a href="/about">소개</a>
			<a href="/privacy">개인정보</a>
		</nav>
	</header>

	{@render children()}

	<AdSlot label="하단 배너" />

	<footer>딸깍 · 규칙을 발견하는 순간의 그 소리</footer>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
		background: #f7f5f0;
		color: #26221c;
	}
	.wrap {
		max-width: 560px;
		margin: 0 auto;
		padding: 16px 14px 30px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 2px 12px;
	}
	.logo {
		font-size: 26px;
		font-weight: 900;
		letter-spacing: 1px;
		text-decoration: none;
		color: #26221c;
	}
	.spark {
		color: #e8590c;
	}
	nav {
		display: flex;
		gap: 12px;
	}
	nav a {
		font-size: 13px;
		color: #8d8478;
		text-decoration: none;
		font-weight: 700;
	}
	footer {
		margin-top: 18px;
		text-align: center;
		font-size: 12px;
		color: #b8ae9e;
	}
</style>
