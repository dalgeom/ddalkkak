<script lang="ts">
	/**
	 * 심전도 신호가 전구를 관통하며 '딸깍' 켜지는 연출.
	 *
	 * 실제 심전도 모니터처럼: 베이스라인은 평평하고, 박동(P-QRS-T)은 직선으로 꺾인
	 * 날카로운 스파이크다. 사인파로 그리면 둥글둥글해져서 심전도로 안 보인다.
	 * 박동은 한 주기에 4개(높이를 조금씩 다르게), 초당 하나꼴로 전구를 관통한다.
	 */
	let { size = 44 }: { size?: number } = $props();

	const W = 260; // 한 주기 폭
	const H = 66;
	const CX = 130; // 전구 중심
	const CY = 26;

	/** 박동 하나 — 각진 폴리라인(작은 P → 급한 QRS 스파이크 → 완만한 T) */
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
	/** 한 주기 안 박동 위치(균등 간격)와 높이 배율 — 모니터처럼 조금씩 다르게 */
	const BEATS = [0.05, 0.3, 0.55, 0.8];
	const SCALES = [1, 0.7, 0.92, 0.78];

	/** 세 주기(-W~2W)를 이어 그린다. 한 주기 밀면 자기 자신과 겹쳐 이음매가 없다. */
	let d = $derived.by(() => {
		const pts: string[] = [`-${W} ${CY}`];
		for (let k = -1; k <= 2; k++) {
			BEATS.forEach((b, i) => {
				const x0 = (k + b) * W;
				for (const [dx, dy] of BEAT_PTS) {
					pts.push(`${(x0 + dx).toFixed(1)} ${(CY + dy * SCALES[i]).toFixed(1)}`);
				}
			});
		}
		pts.push(`${2 * W} ${CY}`);
		return 'M' + pts.join(' L');
	});

	/**
	 * 번쩍이는 시점: R파(박동 시작 +24px)가 전구(CX)에 오는 순간.
	 *   t = ((CX - (beat*W + 24)) / W) mod 1
	 * BEATS = [0.05, 0.3, 0.55, 0.8] → 약 10.8% · 35.8% · 60.8% · 85.8%.
	 * CSS 키프레임 %에는 변수를 못 넣어 flash/burst에 그 값을 직접 적었다.
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
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		/* 모니터의 네온 발광 — 안쪽 짧은 번짐 + 바깥 넓은 번짐 */
		filter: drop-shadow(0 0 2px rgba(192, 99, 46, 0.9)) drop-shadow(0 0 6px rgba(192, 99, 46, 0.45));
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
	/* 박동 4개가 초당 하나꼴로 관통 — 번쩍임도 4번(10.8 · 35.8 · 60.8 · 85.8%) */
	@keyframes flash {
		0%,
		9.4% {
			opacity: 0;
		}
		10.8% {
			opacity: 0.85;
		}
		14.5% {
			opacity: 0;
		}
		34.4% {
			opacity: 0;
		}
		35.8% {
			opacity: 0.85;
		}
		39.5% {
			opacity: 0;
		}
		59.4% {
			opacity: 0;
		}
		60.8% {
			opacity: 0.85;
		}
		64.5% {
			opacity: 0;
		}
		84.4% {
			opacity: 0;
		}
		85.8% {
			opacity: 0.85;
		}
		89.5% {
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
		9.3% {
			opacity: 0;
			transform: scale(0.85);
		}
		11.5% {
			opacity: 0.4;
			transform: scale(1.45);
		}
		17% {
			opacity: 0;
			transform: scale(1.75);
		}
		34.3% {
			opacity: 0;
			transform: scale(0.85);
		}
		36.5% {
			opacity: 0.4;
			transform: scale(1.45);
		}
		42% {
			opacity: 0;
			transform: scale(1.75);
		}
		59.3% {
			opacity: 0;
			transform: scale(0.85);
		}
		61.5% {
			opacity: 0.4;
			transform: scale(1.45);
		}
		67% {
			opacity: 0;
			transform: scale(1.75);
		}
		84.3% {
			opacity: 0;
			transform: scale(0.85);
		}
		86.5% {
			opacity: 0.4;
			transform: scale(1.45);
		}
		92%,
		100% {
			opacity: 0;
			transform: scale(1.75);
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
