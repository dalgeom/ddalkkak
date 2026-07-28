<script lang="ts">
	/**
	 * 심전도 신호가 전구를 관통하며 '딸깍' 켜지는 연출.
	 *
	 * 핵심은 파형이 '살아 있어야' 한다는 것 — 평평한 선에 스파이크 하나만 박아 두고
	 * 통째로 밀면, 고정된 그림이 미끄러질 뿐 신호처럼 보이지 않는다.
	 * 그래서 파형을 계산해서 만든다: 잔물결(세 개의 사인파)이 항상 위아래로 요동치고,
	 * 그 위에 심박(QRS)이 주기적으로 크게 튄다. 선이 흐르면 모든 지점이 계속 흔들린다.
	 *
	 * 이음매가 보이지 않도록 모든 성분의 주기를 W의 정수배로 맞췄다.
	 * 한 주기(W)만큼 밀면 파형이 자기 자신과 정확히 겹친다.
	 */
	let { size = 44 }: { size?: number } = $props();

	const W = 260; // 한 주기 폭
	const H = 66;
	const CX = 130; // 전구 중심 = 화면 중앙
	const CY = 26;

	/** 심박 한 번(QRS): 살짝 내렸다 크게 솟고 깊게 떨어졌다 돌아온다 */
	function beat(u: number): number {
		// u: 0~1 구간에서만 값이 있다
		if (u < 0 || u > 1) return 0;
		if (u < 0.18) return -3 * Math.sin((Math.PI * u) / 0.18); // P파(작은 봉우리)
		if (u < 0.3) return 0;
		if (u < 0.38) return 5 * Math.sin((Math.PI * (u - 0.3)) / 0.08); // Q(살짝 아래)
		if (u < 0.5) return -20 * Math.sin((Math.PI * (u - 0.38)) / 0.12); // R(크게 위)
		if (u < 0.6) return 11 * Math.sin((Math.PI * (u - 0.5)) / 0.1); // S(깊게 아래)
		if (u < 0.72) return 0;
		if (u < 1) return -6.5 * Math.sin((Math.PI * (u - 0.72)) / 0.28); // T파(완만한 봉우리)
		return 0;
	}

	/** 한 주기 안 두 번의 심박 위치(0~1) — 이 지점이 전구를 지날 때 딸깍 */
	const BEATS = [0.28, 0.78];
	const BEAT_W = 0.16; // 심박 하나가 차지하는 폭(주기 대비)

	function yAt(x: number): number {
		const t = x / W;
		// 잔물결 — 정수 배음이라 W마다 정확히 반복된다
		let y =
			2.3 * Math.sin(2 * Math.PI * 3 * t) +
			1.5 * Math.sin(2 * Math.PI * 7 * t + 1.1) +
			1.0 * Math.sin(2 * Math.PI * 11 * t + 2.3);
		// 심박
		for (const b of BEATS) {
			const u = (((t - b) % 1) + 1) % 1;
			if (u < BEAT_W) y += beat(u / BEAT_W);
		}
		return CY + y;
	}

	/** -W ~ 2W(세 주기)를 그려 두면 한 주기 미는 동안 화면이 비지 않는다 */
	const STEP = 3;
	let d = $derived.by(() => {
		const pts: string[] = [];
		for (let x = -W; x <= 2 * W; x += STEP) {
			pts.push(`${x} ${yAt(x).toFixed(1)}`);
		}
		return 'M' + pts.join(' L');
	});

	/**
	 * 심박이 전구를 지나는 시점 = 사이클의 몇 %인가.
	 *   center = beat + BEAT_W*0.44 (R파가 솟는 지점)
	 *   t = ((CX/W - center) mod 1) * 100
	 * BEATS=[0.28, 0.78], BEAT_W=0.16, CX/W=0.5 → 약 15% 와 65%.
	 * CSS 키프레임의 %는 변수로 넣을 수 없어 아래 flash/burst에 그 값을 직접 적었다.
	 * BEATS를 바꾸면 키프레임도 같이 고쳐야 한다.
	 */
</script>

<span
	class="wrap"
	style="--w:{Math.round(size * (W / 32))}px"
	aria-hidden="true"
>
	<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
		<defs>
			<linearGradient id="bulbFade" x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stop-color="white" stop-opacity="0" />
				<stop offset="0.14" stop-color="white" stop-opacity="1" />
				<stop offset="0.86" stop-color="white" stop-opacity="1" />
				<stop offset="1" stop-color="white" stop-opacity="0" />
			</linearGradient>
			<mask id="bulbMask">
				<rect x="0" y="0" width={W} height={H} fill="url(#bulbFade)" />
			</mask>
		</defs>

		<g mask="url(#bulbMask)">
			<g class="wave">
				<path class="line" {d} />
			</g>
		</g>

		<circle class="halo" cx={CX} cy={CY} r="17" />
		<!-- 로고 그대로: 원 + 소켓 -->
		<circle class="glass" cx={CX} cy={CY} r="16" />
		<circle class="flash" cx={CX} cy={CY} r="14" />
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

	.line {
		fill: none;
		stroke: var(--accent-2);
		stroke-width: 2.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	/* 정확히 한 주기만큼 밀어 이음매 없이 흐른다 */
	.wave {
		animation: flow 4s linear infinite;
	}
	@keyframes flow {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(260px);
		}
	}

	/* 전구는 늘 금색(로고 유지). 심박이 관통할 때만 번쩍인다 */
	.glass {
		fill: var(--gold);
		stroke: var(--text);
		stroke-width: 4;
	}
	.socket {
		fill: var(--text);
	}
	.flash {
		fill: #fff8dc;
		opacity: 0;
		animation: flash 4s ease-out infinite;
	}
	/* 심박이 두 번 지나가므로 번쩍임도 두 번(15% · 65%) */
	@keyframes flash {
		0%,
		13.6% {
			opacity: 0;
		}
		15% {
			opacity: 0.85;
		}
		19% {
			opacity: 0;
		}
		63.6% {
			opacity: 0;
		}
		65% {
			opacity: 0.85;
		}
		69% {
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
		animation: burst 4s ease-out infinite;
	}
	@keyframes burst {
		0%,
		13.5% {
			opacity: 0;
			transform: scale(0.85);
		}
		16% {
			opacity: 0.45;
			transform: scale(1.5);
		}
		24% {
			opacity: 0;
			transform: scale(1.85);
		}
		63.5% {
			opacity: 0;
			transform: scale(0.85);
		}
		66% {
			opacity: 0.45;
			transform: scale(1.5);
		}
		74%,
		100% {
			opacity: 0;
			transform: scale(1.85);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wave,
		.flash,
		.halo {
			animation: none;
		}
		.flash,
		.halo {
			opacity: 0;
		}
	}
</style>
