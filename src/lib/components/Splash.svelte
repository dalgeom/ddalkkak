<script lang="ts" module>
	/** 이 탭에서 사이트가 이미 떠 있다 — 레이아웃이 첫 화면을 띄우면 켠다. 그 뒤 메인으로 돌아와도 스플래시는 없다 */
	let booted = false;
	export function markBooted() {
		booted = true;
	}
	/** 이 탭에서 스플래시를 이미 봤다는 표시. app.html이 새로고침 순간에도 먼저 읽어 숨긴다 */
	export const SPLASH_KEY = 'ddal.splash';
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * 진입 스플래시. 실제 로딩을 기다리는 게 아니라 브랜드를 보여주는 연출이다.
	 * 사이트를 처음 열 때 한 번만 뜬다(2026-10-14 사용자 요청 「처음에 딱 한 번만」).
	 *   - 로고 · 「오늘」 탭으로 메인에 돌아올 때 — 안 뜬다. 예전에는 레이아웃이 메인에서만 이 컴포넌트를
	 *     그려서, 다른 화면에 갔다 오면 새로 만들어지며 매번 다시 떴다(주석과 달랐다)
	 *   - 같은 탭에서 새로고침 — 안 뜬다(sessionStorage). 깜빡임은 app.html이 html.nosplash로 먼저 막는다
	 *   - 다른 화면으로 들어와 나중에 메인으로 올 때 — 안 뜬다(이미 사이트 안이다)
	 *   - 새 탭 · 다음 방문 — 다시 한 번
	 */
	let show = $state(!booted);

	onMount(() => {
		if (!show) return;
		let seen = false;
		try {
			seen = !!sessionStorage.getItem(SPLASH_KEY);
			sessionStorage.setItem(SPLASH_KEY, '1');
		} catch {
			/* 사생활 보호 창 — 이번 한 번은 그냥 보여 준다 */
		}
		if (seen) {
			show = false;
			return;
		}
		const t = setTimeout(() => (show = false), 1200);
		return () => clearTimeout(t);
	});
</script>

{#if show}
	<div class="splash" role="status" aria-label="딸깍 불러오는 중">
		<div class="inner">
			<span class="bulb" aria-hidden="true"></span>
			<span class="name">딸깍</span>
			<div class="bar" aria-hidden="true"><span></span></div>
		</div>
	</div>
{/if}

<noscript>
	<style>
		.splash {
			display: none !important;
		}
	</style>
</noscript>

<style>
	.splash {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fade-out 260ms ease 940ms both;
	}
	:global(html.nosplash) .splash {
		display: none;
	}
	@keyframes fade-out {
		to {
			opacity: 0;
			visibility: hidden;
		}
	}
	.inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}
	/* 전구가 켜지면서 '딸깍' — 로고를 한 번 재생한다.
	   스플래시는 1.2초짜리 인트로라 랜딩의 심전도 연출(3.2초 주기)을 쓰지 않는다. */
	.bulb {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--panel-2);
		border: 3px solid var(--text);
		position: relative;
		animation: bulb 900ms var(--ease-out) both;
	}
	.bulb::after {
		content: '';
		position: absolute;
		bottom: -10px;
		left: 9px;
		width: 12px;
		height: 5px;
		border-radius: 1px;
		background: var(--text);
	}
	@keyframes bulb {
		0%,
		34% {
			background: var(--panel-2);
			box-shadow: none;
			transform: scale(0.92);
		}
		48% {
			background: var(--gold);
			box-shadow: 0 0 0 10px rgba(246, 211, 78, 0.5);
			transform: scale(1.08);
		}
		100% {
			background: var(--gold);
			box-shadow: 0 0 0 0 rgba(246, 211, 78, 0);
			transform: scale(1);
		}
	}
	.name {
		margin-top: 6px;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 0.5px;
		animation: in 400ms ease 300ms both;
	}
	@keyframes in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}
	.bar {
		width: 120px;
		height: 5px;
		border-radius: 999px;
		background: var(--border);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		width: 100%;
		border-radius: 999px;
		background: var(--accent);
		transform-origin: left;
		animation: fill 1000ms var(--ease-out) both;
	}
	@keyframes fill {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.splash {
			animation-delay: 0ms;
		}
	}
</style>
