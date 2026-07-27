<script lang="ts">
	import AdSlot from '$lib/components/AdSlot.svelte';

	let { children, data } = $props();
	const year = new Date().getFullYear();
</script>

<div class="wrap">
	<header>
		<a class="logo" href="/">
			<span class="bulb" aria-hidden="true"></span>
			<span class="name">딸깍</span>
		</a>
		<nav>
			<a href="/play">연습</a>
			<a href="/guide">가이드</a>
		</nav>
	</header>

	<main class="page">
		{@render children()}
	</main>

	<div class="bottom-ad"><AdSlot label="하단 배너" /></div>

	<footer>
		<nav class="flinks">
			<a href="/guide">가이드</a>
			<span aria-hidden="true">·</span>
			<a href="/play">연습</a>
			<span aria-hidden="true">·</span>
			<a href="/matchstick">성냥개비</a>
			<span aria-hidden="true">·</span>
			<a href="/about">소개</a>
			<span aria-hidden="true">·</span>
			<a href="/archive">지난 문제</a>
			<span aria-hidden="true">·</span>
			<a href="/terms">이용약관</a>
			<span aria-hidden="true">·</span>
			<a href="/privacy">개인정보</a>
		</nav>
		<p class="copy">© {year} 딸깍 · 문제 {data.totalProblems.toLocaleString()}개</p>
	</footer>
</div>

<style>
	:global(:root) {
		/* ── 색 ── */
		--bg: #efe7d8;
		--panel: #fdfbf6;
		--panel-2: #f6f1e6;
		--border: #e6dcc8;
		--border-strong: #ddd0ba;
		--text: #2c2822;
		--muted: #6b6258;
		--muted-2: #a89f8f;
		--accent: #2f8f5b;
		--accent-press: #23703f;
		--accent-2: #c0632e;
		--gold: #f6d34e;
		--gold-bg: #fdf3cf;
		--gold-text: #8a6d16;
		--danger: #c0392b;
		--danger-bg: #f7e6e2;
		--correct-bg: #e7f3ec;
		/* 전광판·성냥개비 패널 */
		--board-bg: #0a0d0a;
		--led-on: #3aff62;
		--led-off: rgba(58, 255, 98, 0.15);
		--led-lift: #ff9f40;

		/* ── 모션 ── */
		--dur-tap: 120ms;
		--dur-move: 150ms;
		--ease-out: ease-out;

		/* ── 형태 ── */
		--seg-r: 3px;
		--seg-off: rgba(44, 40, 34, 0.12);
		--radius: 18px;
		/* 모바일 우선. 데스크톱도 같은 컴포넌트를 480px 열로 중앙에 세운다. */
		--maxw: 480px;
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
	/* 시각적으로 숨기되 스크린리더에는 읽히는 텍스트(전광판·색블록·성냥 방정식 대체) */
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.wrap {
		max-width: var(--maxw);
		margin: 0 auto;
		padding: 20px 20px 0;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 26px;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--text);
	}
	/* 전구 느낌표 — '딸깍'의 정체성. 원이 전구, 아래 짧은 획이 소켓 겸 느낌표 점. */
	.bulb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--gold);
		border: 2px solid var(--text);
		position: relative;
		flex: none;
	}
	.bulb::after {
		content: '';
		position: absolute;
		bottom: -5px;
		left: 3px;
		width: 6px;
		height: 3px;
		background: var(--text);
	}
	.name {
		font-size: 19px;
		font-weight: 800;
	}
	header nav {
		display: flex;
		gap: 14px;
		font-size: 13px;
		font-weight: 600;
	}
	header nav a {
		color: var(--muted);
		text-decoration: none;
	}
	header nav a:hover {
		color: var(--text);
	}

	.page {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	/* 데스크톱에서는 480px 열이 화면 위쪽에만 붙어 아래가 통째로 비어 보인다.
	   콘텐츠를 세로 중앙에 세워 여백이 위아래로 나뉘게 한다(짧은 화면일수록 효과가 크다). */
	@media (min-width: 768px) and (min-height: 700px) {
		.page {
			justify-content: center;
			padding-bottom: 24px;
		}
	}
	/* 넓은 화면에서 480px은 허전하다. 열을 조금 넓혀 카드가 화면을 감당하게 한다. */
	@media (min-width: 768px) {
		.wrap {
			max-width: 560px;
			padding: 28px 20px 0;
		}
		header {
			margin-bottom: 34px;
		}
	}
	.bottom-ad {
		margin-top: 24px;
	}

	footer {
		margin-top: 22px;
		padding-bottom: 26px;
		text-align: center;
	}
	.flinks {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 6px;
		font-size: 11.5px;
		color: var(--muted-2);
	}
	.flinks a {
		color: var(--muted-2);
		text-decoration: none;
	}
	.flinks a:hover {
		color: var(--muted);
		text-decoration: underline;
	}
	.copy {
		margin-top: 8px;
		font-size: 11.5px;
		color: var(--muted-2);
	}
</style>
