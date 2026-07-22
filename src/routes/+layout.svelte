<script lang="ts">
	import { page } from '$app/state';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let { children } = $props();
	let path = $derived(page.url.pathname);
</script>

<div class="wrap">
	<header>
		<Logo />
		<nav>
			<a href="/" class="tab" class:active={path === '/'}>
				<b>오늘의 딸깍</b><span>매일 새 문제</span>
			</a>
			<a href="/play" class="tab" class:active={path.startsWith('/play')}>
				<b>계속 풀기</b><span>무제한 랜덤</span>
			</a>
			<a href="/matchstick" class="tab" class:active={path.startsWith('/matchstick')}>
				<b>성냥개비</b><span>하나만 옮기기</span>
			</a>
		</nav>
	</header>

	<main class="page">
		{@render children()}
	</main>

	<div class="bottom-ad"><AdSlot label="하단 배너" /></div>

	<footer>
		<nav class="foot-nav">
			<a href="/about">소개</a>
			<span>·</span>
			<a href="/privacy">개인정보처리방침</a>
			<span>·</span>
			<a href="/terms">이용약관</a>
		</nav>
		<div class="tag">딸깍 · 규칙을 발견하는 순간의 그 소리</div>
	</footer>
</div>

<style>
	:global(:root) {
		--bg: #efe7d8;
		--bg-2: #e9dfcc;
		--panel: #fdfbf6;
		--panel-2: #f6f1e6;
		--border: #e6dcc8;
		--border-strong: #ddd0ba;
		--text: #2c2822;
		--muted: #9b9184;
		--accent: #2f8f5b;
		--accent-soft: #e5efe8;
		--accent-2: #c0632e;
		--gold: #f6d34e;
		--danger: #c0392b;
		/* 판정 3-state: 정답=accent(초록) / 오답=danger(빨강) / 포기=giveup(앰버).
		   포기를 힌트(--gold 노랑)와 구분하려고 더 어둡고 채도 낮은 브라운-앰버로 잡았다. */
		--danger-soft: #f9e4e1;
		--danger-border: #f0c8c2;
		--giveup: #a9762c;
		--giveup-soft: #f5ecd8;
		--giveup-border: #e8d6ad;
		/* 모션 토큰 3단계 */
		--dur-tap: 130ms;
		--dur-move: 260ms;
		--dur-judge: 480ms;
		--ease-out: cubic-bezier(0.2, 0, 0, 1);
		--ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
		--radius: 20px;
		--maxw: 1120px;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(*) {
			animation-duration: 0.001ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.001ms !important;
			scroll-behavior: auto !important;
		}
	}
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	:global(html) {
		background: var(--bg);
	}
	:global(body) {
		font-family:
			'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI',
			'Malgun Gothic', sans-serif;
		background: var(--bg);
		color: var(--text);
		min-height: 100vh;
		-webkit-font-smoothing: antialiased;
	}
	:global(::selection) {
		background: #cfe6d8;
		color: var(--text);
	}
	.wrap {
		max-width: var(--maxw);
		margin: 0 auto;
		padding: 20px 22px 44px;
	}
	@media (max-width: 640px) {
		.wrap {
			padding: 16px 15px 36px;
		}
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 2px 22px;
		gap: 14px;
		flex-wrap: wrap;
	}
	nav {
		display: flex;
		gap: 8px;
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		line-height: 1.25;
		font-size: 14px;
		font-weight: 800;
		text-decoration: none;
		color: var(--muted);
		padding: 7px 15px;
		border-radius: 14px;
		border: 1px solid transparent;
		transition:
			color var(--dur-tap) var(--ease-out),
			background var(--dur-tap) var(--ease-out),
			border-color var(--dur-tap) var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.tab:hover {
		color: var(--text);
		background: var(--panel-2);
		transform: translateY(-1px);
	}
	.tab:active {
		transform: translateY(1px) scale(0.98);
	}
	.tab span {
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: -0.01em;
		opacity: 0.72;
	}
	.tab.active {
		color: #fff;
		background: var(--accent);
		border-color: var(--accent);
		box-shadow: 0 3px 12px rgba(47, 143, 91, 0.28);
	}
	@media (max-width: 420px) {
		.tab {
			padding: 6px 11px;
			font-size: 13px;
		}
		.tab span {
			font-size: 9.5px;
		}
	}
	.bottom-ad {
		max-width: 728px;
		margin: 0 auto;
	}
	footer {
		margin-top: 30px;
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
		color: var(--accent);
	}
	.foot-nav span {
		color: var(--border-strong);
	}
	.tag {
		margin-top: 8px;
		font-size: 12px;
		color: #b3a894;
	}
</style>
