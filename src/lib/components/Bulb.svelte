<script lang="ts">
	/**
	 * 심전도 펄스가 전구를 관통하며 '딸깍' 켜지는 연출.
	 *
	 * 병원 모니터처럼 가로선이 흐르다가, V자·역V자로 튀는 펄스가 왼쪽에서 날아와
	 * 전구를 관통하는 순간 불이 켜지고, 펄스는 그대로 오른쪽으로 빠져나간다.
	 *
	 * 전구 모양은 로고 그대로다 — 원 + 아래 소켓. 필라멘트 같은 건 넣지 않는다.
	 */
	let { size = 40 }: { size?: number } = $props();

	// size = 화면에 보이는 전구 지름. viewBox상 지름이 32이므로 전체 폭은 그 비율로 잡는다.
	const W = 260;
	const H = 66;
	const CX = 130;
	const CY = 26;
</script>

<span class="wrap" style="--w:{Math.round(size * (260 / 32))}px" aria-hidden="true">
	<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
		<defs>
			<!-- 양 끝에서 서서히 사라져 화면 밖으로 이어지는 느낌 -->
			<linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stop-color="white" stop-opacity="0" />
				<stop offset="0.16" stop-color="white" stop-opacity="1" />
				<stop offset="0.84" stop-color="white" stop-opacity="1" />
				<stop offset="1" stop-color="white" stop-opacity="0" />
			</linearGradient>
			<mask id="fadeMask">
				<rect x="0" y="0" width={W} height={H} fill="url(#fade)" />
			</mask>
		</defs>

		<!-- 흐르는 심전도 선: 평평하다가 전구 자리에서 V·역V로 튄다 -->
		<g mask="url(#fadeMask)">
			<g class="wave">
				<path
					class="line"
					d="M-260 {CY} H{CX - 30} L{CX - 18} {CY} L{CX - 9} {CY - 17} L{CX} {CY + 19} L{CX + 9} {CY - 8} L{CX + 18} {CY} H{W + 260}"
				/>
			</g>
		</g>

		<!-- 후광: 관통하는 순간만 -->
		<circle class="halo" cx={CX} cy={CY} r="17" />

		<!-- 로고 그대로: 원 + 소켓 (필라멘트 없음) -->
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

	/* ── 흐르는 펄스 ── */
	.line {
		fill: none;
		stroke: var(--accent-2);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.wave {
		animation: run 3.2s linear infinite;
	}
	/* 펄스가 화면 왼쪽 밖에서 들어와 오른쪽 밖으로 빠져나간다.
	   translate 0일 때 스파이크가 정확히 전구 위에 온다. */
	@keyframes run {
		from {
			transform: translateX(-260px);
		}
		to {
			transform: translateX(260px);
		}
	}

	/* ── 전구: 로고 그대로 늘 금색. 관통 순간에만 흰빛이 터진다 ── */
	.glass {
		fill: var(--gold);
		stroke: var(--text);
		stroke-width: 4;
	}
	/* 순백으로 채우면 로고의 금색이 날아간다 — 따뜻한 흰빛으로 짧게만 */
	.flash {
		fill: #fff8dc;
		opacity: 0;
		animation: flash 3.2s ease-out infinite;
	}
	@keyframes flash {
		0%,
		48.8% {
			opacity: 0;
		}
		50% {
			opacity: 0.85;
		}
		54.5% {
			opacity: 0;
		}
		100% {
			opacity: 0;
		}
	}

	.socket {
		fill: var(--text);
	}

	/* ── 관통 순간의 빛 번짐 ── */
	.halo {
		fill: var(--gold);
		transform-origin: 130px 26px;
		opacity: 0;
		animation: burst 3.2s ease-out infinite;
	}
	@keyframes burst {
		0%,
		49% {
			opacity: 0;
			transform: scale(0.8);
		}
		51% {
			opacity: 0.5;
			transform: scale(1.55);
		}
		60%,
		100% {
			opacity: 0;
			transform: scale(1.9);
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
