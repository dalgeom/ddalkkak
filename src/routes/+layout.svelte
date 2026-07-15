<script lang="ts">
	import { page } from '$app/state';
	import AdSlot from '$lib/components/AdSlot.svelte';

	let { children } = $props();
	let path = $derived(page.url.pathname);
</script>

<div class="wrap">
	<header>
		<a class="logo" href="/">딸깍<span class="spark">!</span></a>
		<nav>
			<a href="/" class="tab" class:active={path === '/'}>오늘의 퍼즐</a>
			<a href="/matchstick" class="tab" class:active={path.startsWith('/matchstick')}>성냥개비</a>
		</nav>
	</header>

	{@render children()}

	<AdSlot label="하단 배너" />

	<footer>
		<nav class="foot-nav">
			<a href="/about">소개</a>
			<span>·</span>
			<a href="/privacy">개인정보처리방침</a>
		</nav>
		<div class="tag">딸깍 · 규칙을 발견하는 순간의 그 소리</div>
	</footer>
</div>

<style>
	:global(:root) {
		--bg: #080b12;
		--bg-grad: radial-gradient(1200px 600px at 50% -10%, #101a2e 0%, #080b12 60%);
		--panel: #121a28;
		--panel-2: #0e1521;
		--border: #223049;
		--border-glow: #2c66ff33;
		--text: #e8eff9;
		--muted: #8695ac;
		--accent: #35ffa3;
		--accent-2: #38bdf8;
		--accent-glow: rgba(53, 255, 163, 0.4);
		--danger: #ff5d73;
		--warn: #ffd24a;
		--radius: 18px;
	}
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
		background: var(--bg);
		background-image: var(--bg-grad);
		background-attachment: fixed;
		color: var(--text);
		min-height: 100vh;
	}
	:global(::selection) {
		background: var(--accent-glow);
		color: #fff;
	}
	.wrap {
		max-width: 640px;
		margin: 0 auto;
		padding: 18px 16px 40px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 2px 18px;
		gap: 12px;
		flex-wrap: wrap;
	}
	.logo {
		font-size: 30px;
		font-weight: 900;
		letter-spacing: 1px;
		text-decoration: none;
		color: var(--text);
	}
	.spark {
		color: var(--accent);
		text-shadow: 0 0 14px var(--accent-glow);
	}
	nav {
		display: flex;
		gap: 8px;
	}
	.tab {
		font-size: 14px;
		font-weight: 800;
		text-decoration: none;
		color: var(--muted);
		padding: 7px 14px;
		border-radius: 999px;
		border: 1px solid transparent;
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
	}
	.tab:hover {
		color: var(--text);
	}
	.tab.active {
		color: var(--accent);
		border-color: var(--accent);
		background: var(--accent-glow);
		box-shadow: 0 0 16px var(--accent-glow);
	}
	footer {
		margin-top: 26px;
		text-align: center;
	}
	.foot-nav {
		justify-content: center;
		gap: 8px;
		font-size: 12px;
	}
	.foot-nav a {
		color: var(--muted);
		text-decoration: none;
	}
	.foot-nav a:hover {
		color: var(--accent-2);
	}
	.foot-nav span {
		color: var(--border);
	}
	.tag {
		margin-top: 8px;
		font-size: 12px;
		color: #4d5b73;
	}
</style>
