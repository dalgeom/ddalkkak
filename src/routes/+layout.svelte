<script lang="ts">
	import { onMount } from 'svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Splash from '$lib/components/Splash.svelte';
	import InAppGate from '$lib/components/InAppGate.svelte';
	import { logoClicks } from '$lib/nav';
	import { captureInstallPrompt } from '$lib/pwa';

	let { children, data } = $props();
	const year = new Date().getFullYear();

	// 구주소(pages.dev) 접속을 커스텀 도메인으로 보낸다.
	// 동적 라우트는 hooks.server.ts가 301로 처리하지만, 프리렌더된 정적 페이지는
	// 서버 훅을 타지 않으므로 클라이언트에서 한 번 더 막는다.
	onMount(() => {
		if (location.hostname.endsWith('.pages.dev')) {
			location.replace(`https://ddalkkak.app${location.pathname}${location.search}`);
			return;
		}
		// 설치 가능 이벤트는 한 번만 오고 다시 안 온다 — 앱 시작 시 붙잡아 뒀다가
		// 10문제를 끝낸 순간에 쓴다(InstallPrompt).
		captureInstallPrompt();
	});
</script>

<Splash />
<InAppGate />

<div class="wrap">
	<header>
		<a class="logo" href="/" onclick={() => logoClicks.update((n) => n + 1)}>
			<span class="bulb" aria-hidden="true"></span>
			<span class="name">딸깍</span>
		</a>
		<!-- "연습"만으로는 뭘 하는 곳인지 안 읽힌다. 원하는 만큼 계속 풀 수 있다는 걸 이름으로 알린다 -->
		<nav>
			<a href="/play">무한 연습</a>
			<span class="sep" aria-hidden="true"></span>
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
			<a href="/discover">발견형</a>
			<span aria-hidden="true">·</span>
			<a href="/trivia">상식퀴즈</a>
			<span aria-hidden="true">·</span>
			<a href="/matchstick">성냥개비</a>
			<span aria-hidden="true">·</span>
			<a href="/cubenet">전개도</a>
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
		/* 이 사이트는 라이트 전용이다. 선언하지 않으면 모바일 브라우저의 강제 다크가
		   버튼·본문 색을 임의로 바꿔 글씨가 파랗게 보이는 일이 생긴다. */
		color-scheme: light;
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

		/* ── 타이포·보조 토큰 ──
		   ProblemView·아카이브 상세 등 이전 컴포넌트가 참조하는 토큰. 정의가 없으면
		   var()가 무효 처리돼 h1이 본문 크기로, 배경이 투명으로 무너진다. */
		--fs-2xs: 11.5px;
		--fs-xs: 12.5px;
		--fs-sm: 14px;
		--fs-md: 15.5px;
		--fs-lg: 17px;
		--fs-xl: 21px;
		--fw-body: 500;
		--fw-caption: 600;
		--fw-label: 700;
		--fw-emphasis: 800;
		--fw-number: 800;
		--lh-reading: 1.7;
		--accent-soft: #e7f3ec;
		--seg-on-hud: #3aff62;
		--ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
		--dur-judge: 420ms;

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
		/* 'Pretendard Fallback'은 app.html에서 맑은 고딕에 Pretendard 메트릭을 씌운 것.
		   웹폰트가 도착하기 전/실패해도 글자가 차지하는 자리가 같아 레이아웃이 안 밀린다. */
		font-family:
			'Pretendard Variable', Pretendard, 'Pretendard Fallback', -apple-system,
			BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
		color: var(--text);
		min-height: 100vh;
		-webkit-font-smoothing: antialiased;
		/* 평면 단색이면 콘텐츠가 적을 때 '만들다 만 화면'으로 보인다.
		   위에서 든 빛 + 아래 그림자 + 미세한 종이 결로 바탕에 깊이를 준다(이미지 없이 CSS만). */
		background-color: var(--bg);
		background-image:
			radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255, 253, 247, 0.85), transparent 72%),
			radial-gradient(ellipse 70% 45% at 50% 108%, rgba(206, 190, 162, 0.4), transparent 72%),
			radial-gradient(rgba(44, 40, 34, 0.035) 1px, transparent 1px);
		background-size:
			auto,
			auto,
			22px 22px;
		background-attachment: fixed, fixed, fixed;
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
		align-items: center;
		gap: 11px;
		font-size: 13px;
		font-weight: 600;
	}
	header nav .sep {
		width: 1px;
		height: 12px;
		background: var(--border-strong);
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
	/* 콘텐츠를 화면 세로 중앙에 세운다. 위에 붙여두면 아래가 통째로 비어
	   버려진 페이지처럼 보인다(모바일·데스크톱 공통).
	   화면이 낮으면(가로모드 등) 중앙 정렬이 오히려 답답해서 높이 가드를 둔다.
	   콘텐츠가 길어지면 flex가 알아서 늘어나므로 잘리지 않는다. */
	@media (min-height: 620px) {
		.page {
			justify-content: center;
			padding-bottom: 20px;
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
	/* 광고 승인 전 프로덕션에서 AdSlot이 아무것도 렌더하지 않으므로
	   여백은 슬롯 쪽(.ad-slot)이 갖는다 — 빈 wrapper가 공백만 차지하지 않게 */
	.bottom-ad {
		margin: 0;
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
