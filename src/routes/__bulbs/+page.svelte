<script lang="ts">
	/**
	 * 전구 파형 색상 시안 — 배포용 아님.
	 * 공통 수정: 파형이 전구 '뒤로' 지나가며 삐져나오던 것을, 전구 주변을 비워
	 * 선이 전구에 꽂혔다가 반대편에서 다시 나오는 배선 느낌으로 바꿈.
	 * 박동도 전구를 피해 좌·우에 하나씩 배치.
	 */
	const W = 260;
	const H = 66;
	const CX = 130;
	const CY = 26;
	const GAP_R = 22; // 전구 주변에서 선을 숨기는 반경

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
	const BEATS = [0.1, 0.64];
	const SCALES = [1, 0.9];

	const pts: [number, number][] = [[0, CY]];
	for (let i = 0; i < BEATS.length; i++) {
		const x0 = BEATS[i] * W;
		for (const [dx, dy] of BEAT_PTS) pts.push([x0 + dx, CY + dy * SCALES[i]]);
	}
	pts.push([W, CY]);
	const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

	/** 끝점이 전구 왼쪽 가장자리(CX-GAP_R)에 닿는 순간의 호 길이 비율 */
	let fracAtBulb = 0.5;
	{
		let total = 0;
		const cum: number[] = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			cum.push(total);
		}
		const target = CX - GAP_R;
		for (let i = 1; i < pts.length; i++) {
			if (pts[i][0] >= target) {
				const x1 = pts[i - 1][0];
				const seg = cum[i] - cum[i - 1];
				const r = pts[i][0] === x1 ? 0 : (target - x1) / (pts[i][0] - x1);
				fracAtBulb = (cum[i - 1] + seg * Math.max(0, Math.min(1, r))) / total;
				break;
			}
		}
	}
	const T = 4500;
	const DRAW = 0.86;
	const flashDelay = Math.round(fracAtBulb * DRAW * T);

	/** 색상 5안 */
	const VARIANTS = [
		{
			name: 'A. 진주황 (현재)',
			line: '#c0632e',
			g1: 'rgba(192, 99, 46, 0.9)',
			g2: 'rgba(246, 211, 78, 0.5)',
			tip: '#ffe9a0'
		},
		{
			name: 'B. 골드 — 전구와 같은 계열',
			line: '#e8b820',
			g1: 'rgba(246, 211, 78, 0.95)',
			g2: 'rgba(246, 211, 78, 0.55)',
			tip: '#fff3c4'
		},
		{
			name: 'C. 빛 — 흰 코어 + 금빛 발광',
			line: '#fffdf2',
			g1: 'rgba(246, 211, 78, 1)',
			g2: 'rgba(232, 184, 32, 0.75)',
			tip: '#ffffff'
		},
		{
			name: 'D. 딸깍 그린 — 메인 컬러',
			line: '#2f8f5b',
			g1: 'rgba(47, 143, 91, 0.85)',
			g2: 'rgba(47, 143, 91, 0.4)',
			tip: '#c8f5da'
		},
		{
			name: 'E. 그린 선 + 골드 광점 — 투톤',
			line: '#2f8f5b',
			g1: 'rgba(47, 143, 91, 0.75)',
			g2: 'rgba(246, 211, 78, 0.45)',
			tip: '#ffe9a0'
		}
	];
</script>

<div class="page">
	<h1>펄스 색상 시안 (전구 통과 방식 수정판)</h1>
	<p class="note">
		공통 수정: 파형이 전구 뒤로 삐져나오지 않게, 선이 전구에 꽂혔다가 반대편에서 다시
		나오도록 전구 주변을 비웠습니다. 박동도 전구를 피해 좌·우 배치.
	</p>

	{#each VARIANTS as v (v.name)}
		<section>
			<h2>{v.name}</h2>
			<div class="stage">
				<span
					class="wrap"
					style="--ln:{v.line}; --g1:{v.g1}; --g2:{v.g2}; --tip:{v.tip}"
					aria-hidden="true"
				>
					<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
						<defs>
							<linearGradient id="fade-{v.name}" x1="0" x2="1" y1="0" y2="0">
								<stop offset="0" stop-color="white" stop-opacity="0" />
								<stop offset="0.12" stop-color="white" stop-opacity="1" />
								<stop offset="0.88" stop-color="white" stop-opacity="1" />
								<stop offset="1" stop-color="white" stop-opacity="0" />
							</linearGradient>
							<mask id="m-{v.name}">
								<rect x="0" y="0" width={W} height={H} fill="url(#fade-{v.name})" />
								<!-- 전구 자리는 비워 선이 꽂히는 느낌으로 -->
								<circle cx={CX} cy={CY} r={GAP_R} fill="black" />
							</mask>
						</defs>

						<g mask="url(#m-{v.name})">
							<path class="trace" pathLength="100" {d} />
						</g>

						{#if true}
							<circle class="tip" r="3.4" style="offset-path: path('{d}')" />
						{/if}

						<circle class="halo" cx={CX} cy={CY} r="17" style="animation-delay: {flashDelay}ms" />
						<circle class="glass" cx={CX} cy={CY} r="16" />
						<circle class="flash" cx={CX} cy={CY} r="14" style="animation-delay: {flashDelay}ms" />
						<rect class="socket" x={CX - 7} y={CY + 17} width="14" height="6" rx="1.5" />
					</svg>
				</span>
			</div>
		</section>
	{/each}
</div>

<style>
	.page {
		max-width: 560px;
		margin: 0 auto;
		padding: 20px 0 40px;
	}
	h1 {
		font-size: 18px;
		font-weight: 800;
		margin-bottom: 6px;
	}
	.note {
		font-size: 12.5px;
		color: var(--muted);
		margin-bottom: 18px;
		word-break: keep-all;
	}
	section {
		margin-bottom: 18px;
	}
	h2 {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		margin-bottom: 6px;
	}
	.stage {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 14px 8px;
	}

	.wrap {
		display: block;
		width: 100%;
		line-height: 0;
	}
	svg {
		display: block;
		overflow: visible;
	}
	.trace {
		fill: none;
		stroke: var(--ln);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 100;
		filter: drop-shadow(0 0 2px var(--g1)) drop-shadow(0 0 6px var(--g2));
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
	.tip {
		fill: var(--tip);
		filter: drop-shadow(0 0 3px var(--g1)) drop-shadow(0 0 8px var(--g2));
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
</style>
