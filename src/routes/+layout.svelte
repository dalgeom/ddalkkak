<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/styles/v2.css';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Splash, { markBooted } from '$lib/components/Splash.svelte';
	import InAppGate from '$lib/components/InAppGate.svelte';
	import { logoClicks, focusMode } from '$lib/nav';
	import TabBar from '$lib/components/TabBar.svelte';
	import FeedbackSheet from '$lib/components/FeedbackSheet.svelte';
	import { freshNotices, loadSeen, seenTick } from '$lib/notices';
	import { captureInstallPrompt } from '$lib/pwa';
	import { page } from '$app/state';

	let { children, data } = $props();
	const year = new Date().getFullYear();
	/** 안 본 새 소식이 있으면 헤더 종에 점 */
	let newsDot = $state(false);
	// 다른 화면으로 옮기면 집중 화면은 끝난다(랜딩이 다시 켠다)
	$effect(() => {
		page.url.pathname;
		if (page.url.pathname !== '/') focusMode.set(false);
	});

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
		// 첫 화면이 떴다 — 이 뒤로 메인에 와도 스플래시는 없다
		markBooted();
	});
	// 안 본 소식이 남았는지 — 시트 · 띠에서 보면(seenTick) 점이 바로 꺼진다
	$effect(() => {
		$seenTick;
		const seen = new Set(loadSeen());
		newsDot = freshNotices(Date.now()).some((n) => !seen.has(n.id));
	});
</script>

<!-- 검색으로 낱개 페이지에 떨어진 사람에게 1.2초 브랜드 인트로는 이탈 요인일 뿐이다.
     세션당 1회로 막았다가 되돌린 적이 있는데(Splash.svelte 주석), 그건 횟수 조건이라
     새로고침해도 안 보이는 게 문제였다. 이건 경로 조건이라 홈에서는 늘 뜬다. -->
{#if page.url.pathname === '/'}
	<Splash />
{/if}
<InAppGate />

<div class="wrap" class:focus={$focusMode}>
	<header>
		<a class="logo" href="/" onclick={() => logoClicks.update((n) => n + 1)}>
			<span class="bulb" aria-hidden="true"></span>
			<span class="name">딸깍</span>
		</a>
		<!-- v2(10/14): 오늘 · 놀이 · 기록. 휴대폰은 화면 아래 탭(TabBar), 넓은 화면은 여기 헤더에 같은 셋을 둔다.
		     예전 헤더(무한 연습 · 초성 퀴즈 · 가이드)로는 성냥 새 놀이·상식·전개도가 안 보였다. -->
		{#if !$focusMode}
			<div class="hright">
				<TabBar variant="top" />
				<FeedbackSheet />
				<a class="bell" href="/news" aria-label={newsDot ? '새 소식(안 본 소식 있음)' : '새 소식'}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>
					{#if newsDot}<span class="dot"></span>{/if}
				</a>
			</div>
		{/if}
	</header>

	<main class="page">
		{@render children()}
	</main>

	{#if !$focusMode}
		<div class="bottom-ad"><AdSlot label="하단 배너" /></div>

		<!-- v2(10/14): 링크 13개가 한 줄로 이어져 있던 것을 놀이 · 읽을거리 · 사이트 세 줄로 묶는다 -->
		<footer>
			<nav class="flinks" aria-label="놀이">
				<a href="/matchstick">성냥개비</a><a href="/chosung">초성 퀴즈</a><a href="/trivia">상식 퀴즈</a><a href="/discover">발견형</a><a href="/cubenet">전개도</a><a href="/play">무한 연습</a>
			</nav>
			<nav class="flinks" aria-label="읽을거리">
				<a href="/read">읽을거리</a><a href="/guide">발견형 푸는 법</a><a href="/matchstick/guide">성냥개비 푸는 법</a><a href="/cubenet/guide">전개도 푸는 법</a><a href="/archive">지난 문제</a><a href="/news">새 소식</a>
			</nav>
			<nav class="flinks" aria-label="사이트">
				<a href="/about">소개</a><a href="/record">내 기록</a><a href="/terms">이용약관</a><a href="/privacy">개인정보</a>
			</nav>
			<p class="copy">© {year} 딸깍 · 문제 {data.totalProblems.toLocaleString()}개</p>
		</footer>
	{/if}
</div>
{#if !$focusMode}
	<TabBar />
{/if}

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
		/* 2.13:1이라 WCAG AA(4.5)에 한참 못 미쳤다. 66곳에서 작은 글자에 쓰고 있었고
		   가장 밝은 AA 통과값이 이것이다 — --muted와 가까워졌지만 읽히는 쪽을 택한다. */
		--muted-2: #706757;
		--accent: #2f8f5b;
		--accent-press: #23703f;
		/* 글자용 초록. --accent는 3.29:1이라 18px 미만 글자에 못 쓴다(41곳에서 쓰고 있었다).
		   버튼 배경은 --accent 그대로 두고 글자만 이걸 쓴다 — 4.94:1. */
		--accent-text: #23703f;
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
		/* 가로로 눕힌 아이폰 — 노치 · 둥근 모서리에 걸리지 않게 */
		padding-left: max(20px, env(safe-area-inset-left));
		padding-right: max(20px, env(safe-area-inset-right));
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
	.hright {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.bell {
		position: relative;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
	}
	.bell svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.bell .dot {
		position: absolute;
		top: 8px;
		right: 9px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent-2);
		border: 2px solid var(--bg);
	}

	.page {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	/* v2(10/14): 세로 가운데 정렬을 걷었다. 콘텐츠 높이가 바뀔 때마다 시작 위치가 달라져
	   데일리 문제를 넘길 때마다 화면이 위아래로 뛰었다(「나가기」 높이 150 → 142 → 185px). */
	.page {
		padding-bottom: 20px;
	}
	/* 휴대폰 — 하단 탭 높이(TabBar: 위 6 + 버튼 50 + 아래 여백). 토스트 등 화면 아래 것은 이 위에 띄운다 */
	@media (max-width: 767px) {
		:global(:root) {
			--tab-h: calc(56px + max(14px, calc(env(safe-area-inset-bottom) + 6px)));
		}
		.wrap {
			padding-bottom: calc(var(--tab-h) + 14px);
		}
		.wrap.focus {
			padding-bottom: 0;
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
		padding: 16px 0 26px;
		text-align: center;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.flinks {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 4px 12px;
		font-size: 12px;
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
