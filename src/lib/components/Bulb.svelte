<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * 심전도 모니터 연출 — 레퍼런스 영상 그대로:
	 * 선이 통째로 흘러가는 게 아니라, 빛나는 끝점이 왼쪽에서 오른쪽으로
	 * 파형을 '그려 나간다'. 그려진 자국은 남고, 그리는 지점이 가장 밝다.
	 * 끝점이 전구를 통과하는 순간 딸깍 켜진다. 끝까지 그리면 잔상이 스르르
	 * 사라지고 처음부터 다시 그린다.
	 *
	 * 구현: pathLength=100 + stroke-dashoffset 100→0 으로 선을 그리고,
	 * 같은 경로를 offset-path로 따라가는 광점(팁)을 얹는다. 둘 다 호 길이
	 * 기준이라 정확히 붙어 다닌다.
	 */
	let { size = 44 }: { size?: number } = $props();

	const W = 260;
	const H = 66;
	const CX = 130; // 전구 중심
	const CY = 26;

	/** 박동 하나 — 각진 폴리라인(작은 P → 급한 QRS → 완만한 T) */
	const BEAT_PTS: [number, number][] = [
		[0, 0],
		[5, 0],
		[8, -5],
		[11, 0],
		[18, 0],
		[20, 3],
		[24, -24],
		[28, 16],
		[31, 0],
		[40, 0],
		[45, -8],
		[50, 0],
		[56, 0]
	];
	/** 화면 폭 안에 박동 3개 — 레퍼런스와 같은 밀도. 높이는 조금씩 다르게. */
	const BEATS = [0.1, 0.42, 0.74];
	const SCALES = [0.85, 1, 0.8];

	/** 파형 점 목록(한 화면 분량) */
	const pts: [number, number][] = [[0, CY]];
	for (let i = 0; i < BEATS.length; i++) {
		const x0 = BEATS[i] * W;
		for (const [dx, dy] of BEAT_PTS) pts.push([x0 + dx, CY + dy * SCALES[i]]);
	}
	pts.push([W, CY]);

	const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

	/** 끝점이 전구(CX)에 닿는 순간 = 전체 호 길이 대비 몇 %인가 (그리기 속도는 호 길이 기준) */
	let fracAtBulb = 0.5;
	{
		let total = 0;
		const cum: number[] = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			cum.push(total);
		}
		for (let i = 1; i < pts.length; i++) {
			if (pts[i][0] >= CX) {
				const x1 = pts[i - 1][0];
				const seg = cum[i] - cum[i - 1];
				const r = pts[i][0] === x1 ? 0 : (CX - x1) / (pts[i][0] - x1);
				fracAtBulb = (cum[i - 1] + seg * Math.max(0, Math.min(1, r))) / total;
				break;
			}
		}
	}

	/** 한 사이클 4.5초. 0~86% 그리기, 86~94% 잔상 소멸, 나머지 빈 화면(모니터 리셋). */
	const T = 4500;
	const DRAW = 0.86;
	const flashDelay = Math.round(fracAtBulb * DRAW * T);

	/** offset-path 미지원 브라우저에서는 팁이 (0,0)에 박혀 보이므로 숨긴다 */
	let tipOk = $state(false);
	onMount(() => {
		try {
			tipOk = CSS.supports('offset-path', "path('M0 0 L1 1')");
		} catch {
			tipOk = false;
		}
	});
</script>

<span class="wrap" style="--w:{Math.round(size * (W / 32))}px" aria-hidden="true">
	<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
		<!-- 그려지는 파형(자국) -->
		<path class="trace" pathLength="100" {d} />

		<!-- 그리는 끝점 — 가장 밝은 광점 -->
		{#if tipOk}
			<circle class="tip" r="3.4" style="offset-path: path('{d}')" />
		{/if}

		<circle class="halo" cx={CX} cy={CY} r="17" style="animation-delay: {flashDelay}ms" />
		<!-- 로고 그대로: 원 + 소켓 -->
		<circle class="glass" cx={CX} cy={CY} r="16" />
		<circle class="flash" cx={CX} cy={CY} r="14" style="animation-delay: {flashDelay}ms" />
		<rect class="socket" x={CX - 7} y={CY + 17} width="14" height="6" rx="1.5" />
	</svg>
</span>

<style>
	.wrap {
		display: block;
		width: var(--w);
		max-width: 100%;
		margin: 0 auto;
		line-height: 0;
	}
	svg {
		display: block;
		overflow: visible;
	}

	/* ── 파형 자국 ── */
	.trace {
		fill: none;
		stroke: var(--accent-2);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 100;
		filter: drop-shadow(0 0 2px rgba(192, 99, 46, 0.9)) drop-shadow(0 0 6px rgba(246, 211, 78, 0.5));
		animation:
			draw 4.5s linear infinite,
			trail 4.5s linear infinite;
	}
	@keyframes draw {
		0% {
			stroke-dashoffset: 100;
		}
		86% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}
	/* 다 그린 뒤 잔상이 스르르 사라지고, 빈 화면에서 다시 시작 */
	@keyframes trail {
		0%,
		86% {
			opacity: 1;
		}
		94%,
		100% {
			opacity: 0;
		}
	}

	/* ── 그리는 끝점(광점) ── */
	.tip {
		fill: #ffe9a0;
		filter: drop-shadow(0 0 3px rgba(246, 211, 78, 1)) drop-shadow(0 0 8px rgba(246, 211, 78, 0.8));
		animation:
			tip-move 4.5s linear infinite,
			tip-vis 4.5s linear infinite;
	}
	@keyframes tip-move {
		0% {
			offset-distance: 0%;
		}
		86% {
			offset-distance: 100%;
		}
		100% {
			offset-distance: 100%;
		}
	}
	@keyframes tip-vis {
		0%,
		85% {
			opacity: 1;
		}
		87%,
		100% {
			opacity: 0;
		}
	}

	/* ── 전구: 로고 그대로 늘 금색, 끝점이 통과할 때만 번쩍 ── */
	.glass {
		fill: var(--gold);
		stroke: var(--text);
		stroke-width: 4;
	}
	.socket {
		fill: var(--text);
	}
	/* 번쩍임 시점은 호 길이로 계산해 인라인 animation-delay로 넣는다(키프레임 %는 변수 불가) */
	.flash {
		fill: #fff8dc;
		opacity: 0;
		animation: blink 4.5s ease-out infinite;
	}
	@keyframes blink {
		0% {
			opacity: 0;
		}
		1% {
			opacity: 0.85;
		}
		6% {
			opacity: 0;
		}
		100% {
			opacity: 0;
		}
	}
	.halo {
		fill: var(--gold);
		transform-origin: 130px 26px;
		opacity: 0;
		animation: pulse-halo 4.5s ease-out infinite;
	}
	@keyframes pulse-halo {
		0% {
			opacity: 0;
			transform: scale(0.85);
		}
		2% {
			opacity: 0.45;
			transform: scale(1.5);
		}
		8% {
			opacity: 0;
			transform: scale(1.8);
		}
		100% {
			opacity: 0;
			transform: scale(1.8);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trace,
		.tip,
		.flash,
		.halo {
			animation: none;
		}
		.trace {
			stroke-dashoffset: 0;
			opacity: 1;
		}
		.tip,
		.flash,
		.halo {
			opacity: 0;
		}
	}
</style>
