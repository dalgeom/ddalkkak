<script lang="ts">
	import { onMount } from 'svelte';
	import Bulb from '$lib/components/Bulb.svelte';

	/**
	 * 진입 스플래시. 실제 로딩을 기다리는 게 아니라 브랜드를 보여주는 연출이다.
	 * 페이지를 새로 열 때(전체 로드)마다 뜬다 — 앱 안에서 화면을 옮기는 건 재로드가
	 * 아니라 이 컴포넌트가 그대로 살아 있으므로 다시 뜨지 않는다.
	 * (세션당 1회로 막았더니 한 번 본 뒤로는 새로고침해도 영영 안 보여서 없앤 것과 같았다)
	 */
	let show = $state(true);

	onMount(() => {
		const t = setTimeout(() => (show = false), 1200);
		return () => clearTimeout(t);
	});
</script>

{#if show}
	<div class="splash" role="status" aria-label="딸깍 불러오는 중">
		<div class="inner">
			<Bulb size={48} />
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
