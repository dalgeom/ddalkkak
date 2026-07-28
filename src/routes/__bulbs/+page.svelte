<script lang="ts">
	/**
	 * 필라멘트 2버전 시안 — 배포용 아님, 선택 후 제거.
	 * V1 미세 지글: 거의 평평한 아주 얇은 선이 살짝만 지글거리며 관통.
	 * V2 세로 코일: 파동이 전구로 들어와 코일을 타고 올라갔다 내려와 빠져나감.
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

	function basePts(): [number, number][] {
		const pts: [number, number][] = [[0, CY]];
		for (let i = 0; i < BEATS.length; i++) {
			const x0 = BEATS[i] * W;
			for (const [dx, dy] of BEAT_PTS) pts.push([x0 + dx, CY + dy * SCALES[i]]);
		}
		return pts;
	}

	type Ver = { key: string; name: string; desc: string; d: string; delay: number; filW: number };
	const VERS: Ver[] = [];

	/* V1 — 미세 지글: 진폭 ±1.2px, 3px 간격, 아주 얇게 */
	{
		const pts = basePts();
		for (let x = 115, i = 0; x <= 145; x += 3, i++) {
			pts.push([x, CY + (i % 2 === 0 ? -1.2 : 1.2)]);
		}
		pts.sort((a, b) => a[0] - b[0]);
		pts.push([W, CY]);
		// 광점이 필라멘트 중앙(x=130)을 지나는 시점
		let total = 0;
		const cum = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			cum.push(total);
		}
		let frac = 0.5;
		for (let i = 1; i < pts.length; i++) {
			if (pts[i][0] >= CX) {
				frac = cum[i] / total;
				break;
			}
		}
		VERS.push({
			key: 'v1',
			name: 'V1. 미세 지글 — 거의 평평한 얇은 필라멘트',
			desc: '위아래 변동 ±1px 수준의 아주 얇은 선이 지글거리며 그대로 관통합니다.',
			d: 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'),
			delay: Math.round(frac * DRAW * T),
			filW: 1.0
		});
	}

	/* V2 — 세로 코일: 들어와서 코일을 타고 위로 감아 올라갔다 내려와 빠져나감 */
	{
		const pts = basePts();
		const coil: [number, number][] = [];
		// 진입: 왼쪽에서 코일 바닥으로
		coil.push([116.5, CY], [121, CY + 5], [126, CY + 8]);
		// 코일 본체: 아래(34)에서 위(17)로 감아 올라간다 — x가 사인으로 좌우 왕복
		const NSEG = 36;
		for (let i = 0; i <= NSEG; i++) {
			const s = i / NSEG;
			const y = CY + 8 - 16 * s;
			const x = 130 + 6.5 * Math.sin(s * Math.PI * 4.5);
			coil.push([x, y]);
		}
		// 하강: 꼭대기에서 오른쪽 벽을 타고 내려와 출구로
		coil.push([137, CY - 5], [141, CY - 1], [143.5, CY]);
		for (const p of coil) pts.push(p);
		// 코일 구간은 x 정렬하면 안 된다(위아래로 감기므로) — 진입 전 구간만 정렬
		const before = pts.filter((p) => !coil.includes(p) && p[0] < 116.5);
		const after: [number, number][] = [[W, CY]];
		before.sort((a, b) => a[0] - b[0]);
		// 베이스 파형에서 코일 오른쪽(>143.5) 부분
		const rightBase = basePts().filter(([x]) => x > 143.5);
		const seq = [...before, ...coil, ...rightBase, ...after];
		// 광점이 코일 중간(s=0.5 지점)에 오는 시점
		let total = 0;
		const cum = [0];
		for (let i = 1; i < seq.length; i++) {
			total += Math.hypot(seq[i][0] - seq[i - 1][0], seq[i][1] - seq[i - 1][1]);
			cum.push(total);
		}
		const midIdx = before.length + 3 + Math.floor(NSEG / 2);
		const frac = cum[Math.min(midIdx, cum.length - 1)] / total;
		VERS.push({
			key: 'v2',
			name: 'V2. 세로 코일 — 소용돌이치며 올라갔다 내려온다',
			desc: '파동이 전구로 들어와 코일을 감아 올라갔다 내려온 뒤 반대편으로 빠져나갑니다.',
			d: 'M' + seq.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'),
			delay: Math.round(frac * DRAW * T),
			filW: 1.1
		});
	}

	/* 색은 골드 고정(색 선택은 별도) */
	const C = {
		line: '#e8b820',
		g1: 'rgba(246,211,78,0.95)',
		g2: 'rgba(246,211,78,0.55)',
		tip: '#fff3c4',
		fil: '#a97f12'
	};
</script>

<div class="page">
	<h1>필라멘트 2버전 시안 (색은 골드 고정)</h1>
	<p class="note">버전을 골라주세요. 색(A~E)은 이전 시안에서 고른 걸 그대로 적용합니다.</p>

	{#each VERS as v (v.key)}
		<section>
			<h2>{v.name}</h2>
			<p class="desc">{v.desc}</p>
			<div class="stage">
				<span class="wrap" style="--ln:{C.line}; --g1:{C.g1}; --g2:{C.g2}; --tip:{C.tip}; --fil:{C.fil}; --filw:{v.filW}">
					<svg viewBox="0 0 {W} {H}" width="100%" height="100%">
						<defs>
							<linearGradient id="f-{v.key}" x1="0" x2="1" y1="0" y2="0">
								<stop offset="0" stop-color="white" stop-opacity="0" />
								<stop offset="0.12" stop-color="white" stop-opacity="1" />
								<stop offset="0.88" stop-color="white" stop-opacity="1" />
								<stop offset="1" stop-color="white" stop-opacity="0" />
							</linearGradient>
							<mask id="out-{v.key}">
								<rect x="0" y="0" width={W} height={H} fill="url(#f-{v.key})" />
								<circle cx={CX} cy={CY} r="18" fill="black" />
							</mask>
							<mask id="in-{v.key}">
								<circle cx={CX} cy={CY} r="13.5" fill="white" />
							</mask>
						</defs>

						<circle class="halo" cx={CX} cy={CY} r="17" style="animation-delay: {v.delay}ms" />
						<circle class="glass-fill" cx={CX} cy={CY} r="16" />
						<circle class="flash" cx={CX} cy={CY} r="14" style="animation-delay: {v.delay}ms" />

						<g mask="url(#out-{v.key})">
							<path class="trace" pathLength="100" d={v.d} />
						</g>
						<g mask="url(#in-{v.key})">
							<path class="trace fil" pathLength="100" d={v.d} />
						</g>

						<circle class="glass-ring" cx={CX} cy={CY} r="16" />
						<rect class="socket" x={CX - 7} y={CY + 17} width="14" height="6" rx="1.5" />
						<circle class="tip" r="3.2" style="offset-path: path('{v.d}')" />
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
		margin-bottom: 3px;
	}
	.desc {
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 6px;
		word-break: keep-all;
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
	.trace.fil {
		stroke: var(--fil);
		stroke-width: calc(var(--filw) * 1px);
		filter: drop-shadow(0 0 1.2px var(--g1));
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
