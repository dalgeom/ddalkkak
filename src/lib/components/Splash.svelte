<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * 첫 진입 스플래시. 실제 로딩을 기다리는 게 아니라 브랜드를 한 번 보여주는 연출이다.
	 * 한 세션에 한 번만 뜬다 — 페이지를 옮길 때마다 나오면 방해가 된다.
	 */
	let show = $state(true);

	onMount(() => {
		let already = false;
		try {
			already = sessionStorage.getItem('ddal.splash') === '1';
			sessionStorage.setItem('ddal.splash', '1');
		} catch {
			/* 프라이빗 모드 등에서 막히면 그냥 한 번 보여준다 */
		}
		if (already) {
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
	/* 전구가 켜지면서 '딸깍' — 로고를 한 번 재생한다 */
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
