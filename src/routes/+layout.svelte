<script lang="ts">
	import { page } from '$app/state';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let { children } = $props();
	let path = $derived(page.url.pathname);

	const TABS = [
		{ href: '/', label: '오늘의 딸깍', sub: '매일 새 문제' },
		{ href: '/play', label: '계속 풀기', sub: '무제한 랜덤' },
		{ href: '/matchstick', label: '성냥개비', sub: '하나만 옮기기' }
	];
	const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

	// 활성 탭 아래로 미끄러지는 세그먼트 막대. 측정이 필요하므로 마운트 후에만 보인다.
	let navEl = $state<HTMLElement | null>(null);
	let barX = $state(0);
	let barW = $state(0);
	let barReady = $state(false);

	function measure() {
		if (!navEl) return;
		const el = navEl.querySelector<HTMLElement>('.tab.active');
		if (!el) return;
		barX = el.offsetLeft + 6;
		barW = Math.max(20, el.offsetWidth - 12);
		barReady = true;
	}
	$effect(() => {
		// path가 바뀌면 다시 잰다
		void path;
		measure();
	});
</script>

<svelte:window onresize={measure} />


<div class="wrap">
	<header>
		<Logo />
		<nav bind:this={navEl}>
			{#each TABS as t (t.href)}
				<a href={t.href} class="tab" class:active={isActive(t.href)}>
					<b>{t.label}</b><span>{t.sub}</span>
				</a>
			{/each}
			<span
				class="segbar"
				class:ready={barReady}
				style="width:{barW}px; transform:translateX({barX}px)"
				aria-hidden="true"
			></span>
		</nav>
	</header>

	<main class="page">
		{@render children()}
	</main>

	<div class="bottom-ad"><AdSlot label="하단 배너" /></div>

	<footer>
		<nav class="foot-nav">
			<a href="/about">소개</a>
			<span class="seg-div" aria-hidden="true"></span>
			<a href="/privacy">개인정보처리방침</a>
			<span class="seg-div" aria-hidden="true"></span>
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
		/* 세그먼트 척추 — 7세그먼트 획(34×8, rx3)이 이 사이트의 유일한 조형 문법이다.
		   카드(--radius:20px)·칩(999px)과 반경을 분리해 "이 반경은 세그먼트"라는 신호로 고정한다.
		   적용 범위는 숫자 HUD·탭 인디케이터·구분선까지. 카드마다 뿌리지 않는다. */
		--seg-r: 3px;
		--seg-on-hud: var(--accent-2);
		--seg-off: rgba(44, 40, 34, 0.12);
		--radius: 20px;
		--maxw: 1120px;
		/* 타이포그래피 축 — 이 7단 스케일 밖의 font-size는 쓰지 않는다.
		   무게는 역할별로 5단만 쓴다: 460=보조 캡션 · 500=문제 지문(이 사이트에서 유일하게 "안 굵은" 문장) ·
		   700=구조 라벨(탭·칩·선택지·고스트버튼) · 800=화면당 하나뿐인 강조(주 CTA·배너 타이틀·판정 메시지) ·
		   900=숫자 전용(세그먼트·스코어·타이머)과 로고/랜딩 헤드라인의 정체성 표기, 문장에는 절대 쓰지 않는다.
		   한글 자간: 본문 문장은 0(음절 블록이 라틴처럼 조여지지 않는다) — 자간을 만지는 건 소형 라벨(--ls-label,
		   양수: 뭉친 볼드를 풀어준다)과 38px급 대형 헤드라인(--ls-tight, 음수) 두 자리뿐이다. */
		--fs-2xs: 12px;
		--fs-xs: 13px;
		--fs-sm: 15px;
		--fs-md: 17px;
		--fs-lg: 21px;
		--fs-xl: 28px;
		--fs-2xl: 38px;
		--fw-caption: 460;
		--fw-body: 500;
		--fw-label: 700;
		--fw-emphasis: 800;
		--fw-number: 900;
		--ls-normal: 0em;
		--ls-label: 0.02em;
		--ls-tight: -0.02em;
		--lh-tight: 1.25;
		--lh-normal: 1.5;
		--lh-reading: 1.7;
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
		position: relative;
		display: flex;
		gap: 8px;
		padding-bottom: 10px;
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		line-height: var(--lh-tight);
		font-size: var(--fs-sm);
		font-weight: var(--fw-label);
		letter-spacing: var(--ls-label);
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
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		letter-spacing: var(--ls-normal);
		opacity: 0.72;
	}
	/* 초록 알약 대신 세그먼트 막대가 활성 탭 아래로 미끄러진다 */
	.tab.active {
		color: var(--text);
	}
	.segbar {
		position: absolute;
		left: 0;
		bottom: -2px;
		height: 8px;
		border-radius: var(--seg-r);
		background: var(--accent);
		opacity: 0;
		transition:
			transform var(--dur-move) var(--ease-out),
			width var(--dur-move) var(--ease-out),
			opacity var(--dur-move) var(--ease-out);
	}
	.segbar.ready {
		opacity: 1;
	}
	@media (max-width: 420px) {
		.tab {
			padding: 6px 11px;
			font-size: var(--fs-xs);
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
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
	}
	.foot-nav a {
		color: var(--muted);
		text-decoration: none;
	}
	.foot-nav a:hover {
		color: var(--accent);
	}
	.seg-div {
		display: inline-block;
		width: 5px;
		height: 13px;
		border-radius: var(--seg-r);
		background: var(--border-strong);
		vertical-align: middle;
	}
	.tag {
		margin-top: 8px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: #b3a894;
	}
</style>
