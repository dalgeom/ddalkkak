<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * 심전도 펄스가 전구를 관통하며 딸깍 — 스마일 필라멘트 버전.
	 * 빛나는 끝점이 왼쪽에서 파형을 그리며 들어와 전구 안에서 입(스마일)을 그리고
	 * 나가는 순간 딸깍! 번쩍이며 눈 두 개가 팝 하고 나타나 전구가 웃는 얼굴이 된다.
	 * 잔상이 스르르 사라지면 처음부터 다시.
	 *
	 * 구현: pathLength=100 + stroke-dashoffset 100→0 으로 선을 그리고, 같은 경로를
	 * offset-path로 따라가는 광점(팁)을 얹는다. 전구 밖 구간은 굵은 초록 파형,
	 * 유리 안 구간(r=13.5)은 마스크로 잘라 얇은 진초록 필라멘트로 보여준다.
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
	/** 전구 좌우로 박동 하나씩 */
	const BEATS = [0.1, 0.64];
	const SCALES = [1, 0.9];

	/** 전구 안 스마일(입) — 좌에서 들어와 호를 그리고 우로 나감 */
	const SMILE: [number, number][] = [
		[116.5, 26],
		[119.5, 25.3],
		[122, 26.3],
		[123.5, 28.5],
		[125.5, 30.5],
		[128, 31.8],
		[130, 32.1],
		[132, 31.8],
		[134.5, 30.5],
		[136.5, 28.5],
		[138, 26.3],
		[140.5, 25.3],
		[143.5, 26]
	];
	/** 눈 — 입을 다 그리는 딸깍 순간에 팝 */
	const EYES = [
		{ x: 125.5, y: 21, r: 1.7 },
		{ x: 134.5, y: 21, r: 1.7 }
	];

	/** 전체 경로: 왼쪽 파형 → 스마일 → 오른쪽 파형 */
	const base: [number, number][] = [[0, CY]];
	for (let i = 0; i < BEATS.length; i++) {
		const x0 = BEATS[i] * W;
		for (const [dx, dy] of BEAT_PTS) base.push([x0 + dx, CY + dy * SCALES[i]]);
	}
	const left = base.filter(([x]) => x <= 114);
	const right = base.filter(([x]) => x >= 146);
	const pts: [number, number][] = [...left, ...SMILE, [146, CY], ...right, [W, CY]];

	const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

	/** 한 사이클 4.5초. 0~86% 그리기, 86~94% 잔상 소멸, 나머지 빈 화면(모니터 리셋). */
	const T = 4500;
	const DRAW = 0.86;

	/** 끝점이 입 가운데(스마일 최저점)에 닿는 순간 = 딸깍 (호 길이 기준) */
	const flashDelay = (() => {
		let total = 0;
		const cum: number[] = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			cum.push(total);
		}
		let best = 0;
		let bestD = Infinity;
		for (let i = 0; i < pts.length; i++) {
			const dd = Math.hypot(pts[i][0] - CX, pts[i][1] - 32.1);
			if (dd < bestD) {
				bestD = dd;
				best = i;
			}
		}
		return Math.round((cum[best] / total) * DRAW * T);
	})();

	/** 눈: 딸깍 시점부터 잔상 소멸까지만 보이게 — 키프레임 %는 변수가 안 돼 문자열로 생성 */
	const eyesEnd = ((0.94 * T - flashDelay) / T) * 100;
	const eyesCss = `@keyframes bulb-eyes-pop{0%{opacity:0;transform:scale(.2)}1.2%{opacity:1;transform:scale(1.35)}2.6%{transform:scale(1)}${(eyesEnd - 5).toFixed(1)}%{opacity:1;transform:scale(1)}${eyesEnd.toFixed(1)}%{opacity:0;transform:scale(1)}100%{opacity:0;transform:scale(.2)}}`;

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

{@html `<style>${eyesCss}</style>`}

<span class="wrap" style="--w:{Math.round(size * (W / 32))}px" aria-hidden="true">
	<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
		<defs>
			<linearGradient id="bulb-fade" x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stop-color="white" stop-opacity="0" />
				<stop offset="0.12" stop-color="white" stop-opacity="1" />
				<stop offset="0.88" stop-color="white" stop-opacity="1" />
				<stop offset="1" stop-color="white" stop-opacity="0" />
			</linearGradient>
			<!-- 전구 밖: 파형만(유리 영역은 가림) -->
			<mask id="bulb-out">
				<rect x="0" y="0" width={W} height={H} fill="url(#bulb-fade)" />
				<circle cx={CX} cy={CY} r="18" fill="black" />
			</mask>
			<!-- 전구 안: 얇은 필라멘트만 -->
			<mask id="bulb-in">
				<circle cx={CX} cy={CY} r="13.5" fill="white" />
			</mask>
		</defs>

		<circle class="halo" cx={CX} cy={CY} r="17" style="animation-delay: {flashDelay}ms" />
		<circle class="glass-fill" cx={CX} cy={CY} r="16" />
		<circle class="flash" cx={CX} cy={CY} r="14" style="animation-delay: {flashDelay}ms" />

		<g mask="url(#bulb-out)">
			<path class="trace" pathLength="100" {d} />
		</g>
		<g mask="url(#bulb-in)">
			<path class="trace fil" pathLength="100" {d} />
		</g>

		{#each EYES as e (e.x)}
			<circle
				class="eye"
				cx={e.x}
				cy={e.y}
				r={e.r}
				style="animation-delay: {flashDelay}ms; transform-origin: {e.x}px {e.y}px;"
			/>
		{/each}

		<!-- 로고 그대로: 원 + 소켓 -->
		<circle class="glass-ring" cx={CX} cy={CY} r="16" />
		<rect class="socket" x={CX - 7} y={CY + 17} width="14" height="6" rx="1.5" />

		{#if tipOk}
			<circle class="tip" r="3.4" style="offset-path: path('{d}')" />
		{/if}
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

	/* ── 파형 자국: 브랜드 그린, 심전도 모니터 느낌 ── */
	.trace {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 100;
		filter: drop-shadow(0 0 2px rgba(47, 143, 91, 0.9)) drop-shadow(0 0 6px rgba(58, 255, 98, 0.35));
		animation:
			draw 4.5s linear infinite,
			trail 4.5s linear infinite;
	}
	/* 유리 안(입)은 검은 라인 — 노란 바탕 + 검은 눈·입의 클래식 스마일리.
	   초록으로 두면 공포영화 이모티콘처럼 보인다. */
	.trace.fil {
		stroke: var(--text);
		stroke-width: 1.6;
		filter: none;
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

	/* ── 눈: 딸깍 순간 팝(키프레임은 위에서 생성해 주입) — 입과 같은 검정 ── */
	.eye {
		fill: var(--text);
		opacity: 0;
		animation: bulb-eyes-pop 4.5s linear infinite;
	}

	/* ── 그리는 끝점(광점) ── */
	.tip {
		fill: #d6ffe2;
		filter: drop-shadow(0 0 3px rgba(58, 255, 98, 0.9)) drop-shadow(0 0 8px rgba(47, 143, 91, 0.8));
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

	/* ── 전구: 로고 그대로 늘 금색, 필라멘트가 다 그려질 때만 번쩍 ── */
	.glass-fill {
		fill: var(--gold);
	}
	.glass-ring {
		fill: none;
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
		.halo,
		.eye {
			animation: none;
		}
		.trace {
			stroke-dashoffset: 0;
			opacity: 1;
		}
		/* 움직임 없이도 웃는 전구로 보이게 눈은 켜 둔다 */
		.eye {
			opacity: 1;
		}
		.tip,
		.flash,
		.halo {
			opacity: 0;
		}
	}
</style>
