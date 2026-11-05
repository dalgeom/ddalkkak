<!--
  완주 축하 종이 조각(2026-11-05) — 10문제 중 8개 이상 맞힌 날, 완주 순간에 한 번만 1.2초.
  왜: 완주 88명 중 공유 13명(14.8%) — 결과 화면에 「잘했다」는 순간이 없어 공유를 누를 기분이 안 난다는 가설.
  라이브러리 없이 canvas 하나. 누름을 막지 않고(pointer-events: none), 모션 줄이기면 그리지 않는다.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	let { delay = 0 }: { delay?: number } = $props();
	let canvas: HTMLCanvasElement;
	let done = $state(false);

	const COLORS = ['#ff5a5f', '#ffb400', '#00a699', '#3d8bfd', '#a259ff', '#ff7ab6'];
	const LIFE = 1200;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || !ctx) {
			done = true;
			return;
		}
		const dpr = Math.min(2, devicePixelRatio || 1);
		const w = innerWidth;
		const h = innerHeight;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		ctx.scale(dpr, dpr);

		// 화면 위쪽 가운데(점수 자리)에서 위로 터져 떨어진다
		const parts = Array.from({ length: 70 }, () => {
			const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
			const v = 6 + Math.random() * 7;
			return {
				x: w / 2,
				y: h * 0.22,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				r: Math.random() * Math.PI,
				vr: (Math.random() - 0.5) * 0.4,
				s: 5 + Math.random() * 5,
				c: COLORS[(Math.random() * COLORS.length) | 0]
			};
		});

		let raf = 0;
		let t0 = 0;
		const step = (t: number) => {
			if (!t0) t0 = t;
			const k = (t - t0) / LIFE;
			ctx.clearRect(0, 0, w, h);
			if (k >= 1) {
				done = true;
				return;
			}
			ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
			for (const p of parts) {
				p.vy += 0.35;
				p.vx *= 0.985;
				p.x += p.vx;
				p.y += p.vy;
				p.r += p.vr;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.r);
				ctx.fillStyle = p.c;
				ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
				ctx.restore();
			}
			raf = requestAnimationFrame(step);
		};
		const timer = setTimeout(() => (raf = requestAnimationFrame(step)), delay);
		return () => {
			clearTimeout(timer);
			cancelAnimationFrame(raf);
		};
	});
</script>

{#if !done}
	<canvas bind:this={canvas} class="confetti" aria-hidden="true"></canvas>
{/if}

<style>
	.confetti {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 50;
	}
</style>
