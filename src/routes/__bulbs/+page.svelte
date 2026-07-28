<script lang="ts">
	/**
	 * L1(관통) + 필라멘트 디테일 시안 — 배포용 아님, 선택 후 제거.
	 *
	 * 선이 전구 안에서 끊기지 않는다: 유리 안에서는 같은 경로가 '얇은 필라멘트'로
	 * 이어지고, 광점이 그 필라멘트를 지나는 찰나에 전구가 번쩍인다.
	 * 구현: 같은 경로를 두 번 그린다 — 바깥은 굵게(전구 영역 마스크로 숨김),
	 * 안쪽은 가늘게(전구 영역만 보이게). 같은 경로라 드로잉이 정확히 이어진다.
	 */
	const W = 260;
	const H = 66;
	const CX = 130;
	const CY = 26;
	const T = 4500;
	const DRAW = 0.86;

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
	// 전구 유리 안 — 얇은 필라멘트 지그재그(W자)
	const FIL: [number, number][] = [
		[114, CY],
		[119, CY],
		[122, CY - 5.5],
		[126, CY + 5.5],
		[130, CY - 5.5],
		[134, CY + 5.5],
		[138, CY - 5.5],
		[141, CY],
		[146, CY]
	];
	for (const p of FIL) pts.push(p);
	pts.sort((a, b) => a[0] - b[0]);
	pts.push([W, CY]);

	const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

	/** 광점이 필라멘트 중앙(x=130)을 지나는 순간의 지연(ms) */
	let flashDelay = 0;
	{
		let total = 0;
		const cum = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			cum.push(total);
		}
		let frac = 0.5;
		for (let i = 1; i < pts.length; i++) {
			if (pts[i][0] >= CX) {
				const x1 = pts[i - 1][0];
				const seg = cum[i] - cum[i - 1];
				const r = pts[i][0] === x1 ? 0 : (CX - x1) / (pts[i][0] - x1);
				frac = (cum[i - 1] + seg * Math.max(0, Math.min(1, r))) / total;
				break;
			}
		}
		flashDelay = Math.round(frac * DRAW * T);
	}

	const VARIANTS = [
		{ name: 'A. 진주황 (현재)', line: '#c0632e', g1: 'rgba(192,99,46,0.9)', g2: 'rgba(246,211,78,0.5)', tip: '#ffe9a0', fil: '#8a4a24' },
		{ name: 'B. 골드 — 전구와 같은 계열', line: '#e8b820', g1: 'rgba(246,211,78,0.95)', g2: 'rgba(246,211,78,0.55)', tip: '#fff3c4', fil: '#a97f12' },
		{ name: 'C. 빛 — 흰 코어 + 금빛 발광', line: '#fffdf2', g1: 'rgba(246,211,78,1)', g2: 'rgba(232,184,32,0.75)', tip: '#ffffff', fil: '#c9a83c' },
		{ name: 'D. 딸깍 그린 — 메인 컬러', line: '#2f8f5b', g1: 'rgba(47,143,91,0.85)', g2: 'rgba(47,143,91,0.4)', tip: '#c8f5da', fil: '#1f5e3c' },
		{ name: 'E. 그린 선 + 골드 광점 — 투톤', line: '#2f8f5b', g1: 'rgba(47,143,91,0.75)', g2: 'rgba(246,211,78,0.45)', tip: '#ffe9a0', fil: '#1f5e3c' }
	];
</script>

<div class="page">
	<h1>L1 관통 + 필라멘트 시안 (5색)</h1>
	<p class="note">
		선이 전구 안에서 끊기지 않습니다 — 유리 안에서는 얇은 필라멘트로 이어지고, 광점이
		필라멘트를 지나는 찰나에 번쩍입니다.
	</p>

	{#each VARIANTS as v, vi (v.name)}
		<section>
			<h2>{v.name}</h2>
			<div class="stage">
				<span class="wrap" style="--ln:{v.line}; --g1:{v.g1}; --g2:{v.g2}; --tip:{v.tip}; --fil:{v.fil}">
					<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
						<defs>
							<linearGradient id="f{vi}" x1="0" x2="1" y1="0" y2="0">
								<stop offset="0" stop-color="white" stop-opacity="0" />
								<stop offset="0.12" stop-color="white" stop-opacity="1" />
								<stop offset="0.88" stop-color="white" stop-opacity="1" />
								<stop offset="1" stop-color="white" stop-opacity="0" />
							</linearGradient>
							<!-- 바깥 선: 전구(링 포함) 영역은 숨김 -->
							<mask id="out{vi}">
								<rect x="0" y="0" width={W} height={H} fill="url(#f{vi})" />
								<circle cx={CX} cy={CY} r="18" fill="black" />
							</mask>
							<!-- 필라멘트: 유리 안쪽만 보임 -->
							<mask id="in{vi}">
								<circle cx={CX} cy={CY} r="13.5" fill="white" />
							</mask>
						</defs>

						<circle class="halo" cx={CX} cy={CY} r="17" style="animation-delay: {flashDelay}ms" />
						<!-- 유리(채움) → 번쩍(필라멘트가 실루엣으로 남게 아래) → 필라멘트 → 링 → 소켓 -->
						<circle class="glass-fill" cx={CX} cy={CY} r="16" />
						<circle class="flash" cx={CX} cy={CY} r="14" style="animation-delay: {flashDelay}ms" />

						<g mask="url(#out{vi})">
							<path class="trace" pathLength="100" {d} />
						</g>
						<g mask="url(#in{vi})">
							<path class="trace fil" pathLength="100" {d} />
						</g>

						<circle class="glass-ring" cx={CX} cy={CY} r="16" />
						<rect class="socket" x={CX - 7} y={CY + 17} width="14" height="6" rx="1.5" />

						<circle class="tip" r="3.2" style="offset-path: path('{d}')" />
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
		font-size: 13.5px;
		font-weight: 800;
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
	/* 유리 안 필라멘트 — 가늘고 발광 약하게 */
	.trace.fil {
		stroke: var(--fil);
		stroke-width: 1.3;
		filter: drop-shadow(0 0 1.5px var(--g1));
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
			opacity: 0.9;
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
			opacity: 0.5;
			transform: scale(1.55);
		}
		8% {
			opacity: 0;
			transform: scale(1.85);
		}
		100% {
			opacity: 0;
			transform: scale(1.85);
		}
	}
</style>
