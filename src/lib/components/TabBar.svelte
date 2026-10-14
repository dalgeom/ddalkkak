<script lang="ts">
	import { page } from '$app/state';

	/**
	 * 오늘 · 놀이 · 기록 (v2, 2026-10-14). 휴대폰(68%)에서는 화면 아래에 붙고, 넓은 화면에서는
	 * 헤더 오른쪽 메뉴로 쓴다(variant). 놀이가 헤더 링크 3개로는 다 안 보여 성냥 새 놀이가
	 * 푸터에만 걸려 있었다(10/14 점검).
	 */
	let { variant = 'bottom' }: { variant?: 'bottom' | 'top' } = $props();

	const PLAY = ['/games', '/play', '/matchstick', '/chosung', '/trivia', '/cubenet', '/discover', '/guide'];
	let path = $derived(page.url.pathname);
	let tab = $derived(
		path === '/' || path.startsWith('/today')
			? 'today'
			: PLAY.some((p) => path === p || path.startsWith(p + '/'))
				? 'games'
				: path.startsWith('/record') || path.startsWith('/archive')
					? 'record'
					: ''
	);
</script>

<nav class="tabs {variant}" aria-label="주요 메뉴">
	<a href="/" class:on={tab === 'today'} aria-current={tab === 'today' ? 'page' : undefined}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
		<span>오늘</span>
	</a>
	<a href="/games" class:on={tab === 'games'} aria-current={tab === 'games' ? 'page' : undefined}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>
		<span>놀이</span>
	</a>
	<a href="/record" class:on={tab === 'record'} aria-current={tab === 'record' ? 'page' : undefined}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14.5l2.3 2.3L16 13" /></svg>
		<span>기록</span>
	</a>
</nav>

<style>
	.tabs a {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: var(--muted);
		font-weight: 700;
	}
	.tabs svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.tabs a.on {
		color: var(--accent-text);
	}
	.tabs a.on svg {
		stroke-width: 2.2;
	}

	/* 휴대폰 — 화면 아래 */
	.bottom {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		/* 불투명 배경. 흐림(backdrop-filter)은 아이폰 사파리에서 다른 층이 움직일 때 검게 번쩍인다 */
		background: var(--panel);
		border-top: 1px solid var(--border);
		/* 아이폰 홈 바(쓸어 올리기) 위로 띄운다 — viewport-fit=cover라 env()가 홈 바 높이를 준다.
		   홈 바가 없는 화면(사파리 아래 도구 막대 · 안드로이드)에서도 바닥에서 14px는 띄운다 */
		padding: 6px max(8px, env(safe-area-inset-right)) max(14px, calc(env(safe-area-inset-bottom) + 6px))
			max(8px, env(safe-area-inset-left));
	}
	.bottom a {
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		min-height: 50px;
		font-size: 11.5px;
	}
	@media (min-width: 768px) {
		.bottom {
			display: none;
		}
	}

	/* 넓은 화면 — 헤더 오른쪽 */
	.top {
		display: none;
		gap: 6px;
	}
	.top a {
		gap: 6px;
		padding: 7px 11px;
		border-radius: 10px;
		font-size: 14px;
	}
	.top a.on {
		background: var(--panel);
		border: 1px solid var(--border);
	}
	.top svg {
		width: 18px;
		height: 18px;
	}
	@media (min-width: 768px) {
		.top {
			display: flex;
		}
	}
</style>
