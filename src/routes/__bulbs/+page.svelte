<script lang="ts">
	/**
	 * 전구×파형 '통과 방식' 시안 4종 + 색상 5안 — 배포용 아님, 선택 후 제거.
	 */
	const W = 260;
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

	function beatsAt(cy: number, beats: number[], scales: number[]): [number, number][] {
		const pts: [number, number][] = [[0, cy]];
		for (let i = 0; i < beats.length; i++) {
			const x0 = beats[i] * W;
			for (const [dx, dy] of BEAT_PTS) pts.push([x0 + dx, cy + dy * scales[i]]);
		}
		return pts;
	}

	function toPath(pts: [number, number][]): string {
		return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
	}

	/** targetX에 도달하는 호 길이 비율 → 번쩍임 지연(ms) */
	function delayAt(pts: [number, number][], targetX: number): number {
		let total = 0;
		const cum = [0];
		for (let i = 1; i < pts.length; i++) {
			total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			cum.push(total);
		}
		let frac = 1;
		for (let i = 1; i < pts.length; i++) {
			if (pts[i][0] >= targetX) {
				const x1 = pts[i - 1][0];
				const seg = cum[i] - cum[i - 1];
				const r = pts[i][0] === x1 ? 0 : (targetX - x1) / (pts[i][0] - x1);
				frac = (cum[i - 1] + seg * Math.max(0, Math.min(1, r))) / total;
				break;
			}
		}
		return Math.round(frac * DRAW * T);
	}

	type Layout = {
		key: string;
		name: string;
		desc: string;
		H: number;
		bulb: { x: number; y: number };
		d: string;
		delay: number;
		gap: { r: number } | null;
	};

	const LAYOUTS: Layout[] = [];

	/* L1. 관통(현재 시안) — 전구 자리를 비워 선이 꽂혔다 나오는 방식 */
	{
		const cy = 26;
		const pts = beatsAt(cy, [0.1, 0.64], [1, 0.9]);
		pts.push([W, cy]);
		LAYOUTS.push({
			key: 'L1',
			name: 'L1. 관통 — 전구에 꽂혔다 반대편으로',
			desc: '전구 주변을 비워 배선에 전구가 끼워진 느낌. (앞서 보여준 방식)',
			H: 66,
			bulb: { x: 130, y: 26 },
			d: toPath(pts),
			delay: delayAt(pts, 130 - 22),
			gap: { r: 22 }
		});
	}

	/* L2. 아래서 딸깍 — 전구는 선 위에 떠 있고, 스파이크 하나가 소켓을 건드린다 */
	{
		const cy = 62;
		const pts = beatsAt(cy, [0.08, 0.7], [0.85, 0.8]);
		// 중앙: 소켓을 건드리는 트리거 스파이크
		pts.push([118, cy], [124, cy], [130, 49], [136, cy], [142, cy]);
		pts.sort((a, b) => a[0] - b[0]);
		pts.push([W, cy]);
		LAYOUTS.push({
			key: 'L2',
			name: 'L2. 아래서 딸깍 — 스파이크가 전구를 친다',
			desc: '전구가 선 위에 떠 있고, 그 자리의 스파이크가 소켓에 닿는 순간 켜진다.',
			H: 84,
			bulb: { x: 130, y: 20 },
			d: toPath(pts),
			delay: delayAt(pts, 129),
			gap: null
		});
	}

	/* L3. 종착지 — 선이 전구로 들어가며 끝난다 */
	{
		const cy = 26;
		const pts = beatsAt(cy, [0.14, 0.52], [0.9, 1]);
		pts.push([214, cy]); // 전구 왼쪽에서 끝
		LAYOUTS.push({
			key: 'L3',
			name: 'L3. 종착지 — 신호가 전구에 도착하며 끝',
			desc: '선이 전구를 지나치지 않는다. 신호가 도착해 켜지고, 잔상이 사라진 뒤 다시.',
			H: 66,
			bulb: { x: 234, y: 26 },
			d: toPath(pts),
			delay: Math.round(0.995 * DRAW * T) - 120,
			gap: null
		});
	}

	/* L4. 타넘기 — 회로도처럼 전구 위로 폴짝 넘어간다 */
	{
		const cy = 34;
		const pts = beatsAt(cy, [0.08, 0.7], [0.9, 0.85]);
		// 중앙: 전구를 타넘는 반원 점프(회로도 관용 표기)
		pts.push([104, cy]);
		pts.sort((a, b) => a[0] - b[0]);
		const before = pts.filter(([x]) => x <= 104);
		const after = beatsAt(cy, [0.7], [0.85]).slice(1).filter(([x]) => x >= 156);
		const dd =
			toPath(before) +
			` A 26 26 0 0 1 156 ${cy}` +
			' L' +
			after.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') +
			` L${W} ${cy}`;
		LAYOUTS.push({
			key: 'L4',
			name: 'L4. 타넘기 — 전구 위로 폴짝',
			desc: '회로도에서 선이 겹칠 때 쓰는 점프 표기. 선이 전구 위로 넘어가며 정수리를 스칠 때 켜진다.',
			H: 74,
			bulb: { x: 130, y: 40 },
			d: dd,
			delay: delayAt(before, 104) + 260,
			gap: null
		});
	}

	/** 색상 5안(레이아웃은 시안 편의상 L1 고정 — 색은 어느 레이아웃에도 적용 가능) */
	const VARIANTS = [
		{ name: 'A. 진주황 (현재)', line: '#c0632e', g1: 'rgba(192,99,46,0.9)', g2: 'rgba(246,211,78,0.5)', tip: '#ffe9a0' },
		{ name: 'B. 골드 — 전구와 같은 계열', line: '#e8b820', g1: 'rgba(246,211,78,0.95)', g2: 'rgba(246,211,78,0.55)', tip: '#fff3c4' },
		{ name: 'C. 빛 — 흰 코어 + 금빛 발광', line: '#fffdf2', g1: 'rgba(246,211,78,1)', g2: 'rgba(232,184,32,0.75)', tip: '#ffffff' },
		{ name: 'D. 딸깍 그린 — 메인 컬러', line: '#2f8f5b', g1: 'rgba(47,143,91,0.85)', g2: 'rgba(47,143,91,0.4)', tip: '#c8f5da' },
		{ name: 'E. 그린 선 + 골드 광점 — 투톤', line: '#2f8f5b', g1: 'rgba(47,143,91,0.75)', g2: 'rgba(246,211,78,0.45)', tip: '#ffe9a0' }
	];
	const GOLD = VARIANTS[1];
</script>

<div class="page">
	<h1>① 전구 통과 방식 시안 (4종 · 색은 골드 고정)</h1>
	<p class="note">먼저 방식을 골라주세요. 색은 아래 ②에서 따로 고르면 됩니다.</p>

	{#each LAYOUTS as L (L.key)}
		<section>
			<h2>{L.name}</h2>
			<p class="desc">{L.desc}</p>
			<div class="stage">
				<span class="wrap" style="--ln:{GOLD.line}; --g1:{GOLD.g1}; --g2:{GOLD.g2}; --tip:{GOLD.tip}">
					<svg viewBox="0 0 {W} {L.H}" width="100%" height="100%">
						<defs>
							<linearGradient id="f-{L.key}" x1="0" x2="1" y1="0" y2="0">
								<stop offset="0" stop-color="white" stop-opacity="0" />
								<stop offset="0.12" stop-color="white" stop-opacity="1" />
								<stop offset="0.88" stop-color="white" stop-opacity="1" />
								<stop offset="1" stop-color="white" stop-opacity="0" />
							</linearGradient>
							<mask id="m-{L.key}">
								<rect x="0" y="0" width={W} height={L.H} fill="url(#f-{L.key})" />
								{#if L.gap}
									<circle cx={L.bulb.x} cy={L.bulb.y} r={L.gap.r} fill="black" />
								{/if}
							</mask>
						</defs>

						<g mask="url(#m-{L.key})">
							<path class="trace" pathLength="100" d={L.d} />
						</g>
						<circle class="tip" r="3.4" style="offset-path: path('{L.d}')" />

						<circle class="halo" cx={L.bulb.x} cy={L.bulb.y} r="17" style="animation-delay: {L.delay}ms; transform-origin: {L.bulb.x}px {L.bulb.y}px" />
						<circle class="glass" cx={L.bulb.x} cy={L.bulb.y} r="16" />
						<circle class="flash" cx={L.bulb.x} cy={L.bulb.y} r="14" style="animation-delay: {L.delay}ms" />
						<rect class="socket" x={L.bulb.x - 7} y={L.bulb.y + 17} width="14" height="6" rx="1.5" />
					</svg>
				</span>
			</div>
		</section>
	{/each}

	<h1 class="second">② 색상 시안 (5종 · 방식은 L1 고정)</h1>
	{#each VARIANTS as v (v.name)}
		<section>
			<h2>{v.name}</h2>
			<div class="stage">
				<span class="wrap" style="--ln:{v.line}; --g1:{v.g1}; --g2:{v.g2}; --tip:{v.tip}">
					<svg viewBox="0 0 {W} {LAYOUTS[0].H}" width="100%" height="100%">
						<defs>
							<mask id="mc-{v.name}">
								<rect x="0" y="0" width={W} height={LAYOUTS[0].H} fill="white" />
								<circle cx="130" cy="26" r="22" fill="black" />
							</mask>
						</defs>
						<g mask="url(#mc-{v.name})">
							<path class="trace" pathLength="100" d={LAYOUTS[0].d} />
						</g>
						<circle class="tip" r="3.4" style="offset-path: path('{LAYOUTS[0].d}')" />
						<circle class="halo" cx="130" cy="26" r="17" style="animation-delay: {LAYOUTS[0].delay}ms; transform-origin: 130px 26px" />
						<circle class="glass" cx="130" cy="26" r="16" />
						<circle class="flash" cx="130" cy="26" r="14" style="animation-delay: {LAYOUTS[0].delay}ms" />
						<rect class="socket" x="123" y="43" width="14" height="6" rx="1.5" />
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
	h1.second {
		margin-top: 34px;
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
