<script lang="ts">
	/**
	 * '딸깍' 순간을 재생하는 전구.
	 *
	 * 만화에서 아이디어가 번뜩일 때처럼 — 전기 스파크가 쉭 하고 지나가고,
	 * 그게 전구에 닿는 순간 번쩍이며 광선이 튄다. 그리고 딸 / 깍 두 번.
	 * 한 사이클 3.6초, 모든 요소가 같은 duration을 공유해 타이밍이 어긋나지 않는다.
	 *
	 * 타임라인
	 *   0~14%  꺼짐
	 *  14~24%  스파크가 전구를 가로질러 달린다 (쉭)
	 *  24~28%  번쩍 — 유리가 켜지고 후광이 퍼지며 광선이 튄다 (딸)
	 *  28~34%  광선 사라지고 후광 수축
	 *  34~37%  깜빡 꺼짐
	 *  37~41%  작게 한 번 더 (깍)
	 *  41~100% 켜진 채로 유지
	 */
	let { size = 34 }: { size?: number } = $props();
</script>

<span class="bulb" style="--s:{size}px" aria-hidden="true">
	<svg viewBox="0 0 64 64" width={size} height={size * 1.18}>
		<!-- 번뜩이는 순간 튀는 광선 -->
		<g class="rays">
			<line x1="32" y1="3" x2="32" y2="10" />
			<line x1="12" y1="11" x2="17" y2="16" />
			<line x1="52" y1="11" x2="47" y2="16" />
			<line x1="4" y1="30" x2="11" y2="30" />
			<line x1="60" y1="30" x2="53" y2="30" />
			<line x1="12" y1="49" x2="17" y2="44" />
			<line x1="52" y1="49" x2="47" y2="44" />
		</g>

		<!-- 후광 -->
		<circle class="halo" cx="32" cy="30" r="16" />

		<!-- 유리구 -->
		<circle class="glass" cx="32" cy="30" r="15" />

		<!-- 필라멘트 — 켜질 때 같이 살아난다 -->
		<path class="fil" d="M26 33 L29 26 L32 33 L35 26 L38 33" />

		<!-- 소켓(느낌표의 점) -->
		<rect class="socket" x="26" y="49" width="12" height="6" rx="1.5" />

		<!-- 가로지르는 전기 스파크 -->
		<path class="spark" d="M2 47 L22 33 L16 28 L40 12 L62 6" />
	</svg>
</span>

<style>
	.bulb {
		display: inline-flex;
		line-height: 0;
	}
	svg {
		overflow: visible;
	}

	/* ── 유리구 ── */
	.glass {
		fill: var(--panel-2);
		stroke: var(--text);
		stroke-width: 3.4;
		animation: glass 3.6s steps(1, end) infinite;
	}
	@keyframes glass {
		0%,
		23.9% {
			fill: var(--panel-2);
		}
		24%,
		33.9% {
			fill: var(--gold);
		}
		34%,
		36.9% {
			fill: var(--panel-2);
		}
		37%,
		100% {
			fill: var(--gold);
		}
	}

	/* ── 필라멘트 ── */
	.fil {
		fill: none;
		stroke: var(--text);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.25;
		animation: fil 3.6s steps(1, end) infinite;
	}
	@keyframes fil {
		0%,
		23.9% {
			opacity: 0.22;
		}
		24%,
		33.9% {
			opacity: 0.85;
		}
		34%,
		36.9% {
			opacity: 0.22;
		}
		37%,
		100% {
			opacity: 0.7;
		}
	}

	.socket {
		fill: var(--text);
	}

	/* ── 후광: 번쩍이는 순간 확 퍼졌다 수축 ── */
	.halo {
		fill: var(--gold);
		transform-origin: 32px 30px;
		opacity: 0;
		animation: halo 3.6s ease-out infinite;
	}
	@keyframes halo {
		0%,
		23% {
			opacity: 0;
			transform: scale(0.7);
		}
		25% {
			opacity: 0.55;
			transform: scale(1.75);
		}
		32% {
			opacity: 0;
			transform: scale(2.1);
		}
		37% {
			opacity: 0.3;
			transform: scale(1.35);
		}
		42%,
		100% {
			opacity: 0;
			transform: scale(1.6);
		}
	}

	/* ── 광선: 번쩍이는 순간에만 튄다 ── */
	.rays line {
		stroke: var(--gold);
		stroke-width: 3;
		stroke-linecap: round;
	}
	.rays {
		transform-origin: 32px 30px;
		opacity: 0;
		animation: rays 3.6s ease-out infinite;
	}
	@keyframes rays {
		0%,
		23% {
			opacity: 0;
			transform: scale(0.55);
		}
		25.5% {
			opacity: 1;
			transform: scale(1);
		}
		31% {
			opacity: 0;
			transform: scale(1.2);
		}
		100% {
			opacity: 0;
			transform: scale(1.2);
		}
	}

	/* ── 스파크: 짧은 조각이 경로를 타고 달려와 전구에 꽂힌다 ── */
	.spark {
		fill: none;
		stroke: var(--accent-2);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
		/* 짧은 dash 하나만 남기고 offset을 밀어 경로를 타고 달리게 한다.
		   경로 길이가 약 84이므로 offset을 14(시작 직전) → -84(끝 통과)로 움직여야
		   대시가 실제로 화면을 가로지른다. */
		stroke-dasharray: 16 300;
		stroke-dashoffset: 16;
		opacity: 0;
		animation: spark 3.6s linear infinite;
	}
	@keyframes spark {
		0%,
		13.9% {
			stroke-dashoffset: 16;
			opacity: 0;
		}
		14% {
			stroke-dashoffset: 16;
			opacity: 1;
		}
		23% {
			stroke-dashoffset: -70;
			opacity: 1;
		}
		24.5% {
			stroke-dashoffset: -90;
			opacity: 0;
		}
		100% {
			stroke-dashoffset: -90;
			opacity: 0;
		}
	}

	/* 모션을 줄이려는 사용자에겐 켜진 상태로 고정 */
	@media (prefers-reduced-motion: reduce) {
		.glass,
		.fil,
		.halo,
		.rays,
		.spark {
			animation: none;
		}
		.glass {
			fill: var(--gold);
		}
		.fil {
			opacity: 0.7;
		}
		.halo,
		.rays,
		.spark {
			opacity: 0;
		}
	}
</style>
