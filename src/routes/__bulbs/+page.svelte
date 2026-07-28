<script lang="ts">
	/**
	 * 필라멘트 5버전 시안 — 배포용 아님, 선택 후 제거.
	 * 코일·스프링은 나선의 측면도를 파라메트릭으로 계산해 실제 코일처럼 보이게 그린다.
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

	type Ver = { key: string; name: string; desc: string; d: string; delay: number };

	/** 바깥 파형 + 전구 안 모양(inner)을 이어 붙이고, inner의 midIdx 지점에서 번쩍이게 계산 */
	function build(key: string, name: string, desc: string, inner: [number, number][], midIdx: number): Ver {
		const left = basePts().filter(([x]) => x <= 114);
		const right = basePts().filter(([x]) => x >= 146);
		const seq: [number, number][] = [...left, ...inner, [146, CY], ...right, [W, CY]];
		let total = 0;
		const cum = [0];
		for (let i = 1; i < seq.length; i++) {
			total += Math.hypot(seq[i][0] - seq[i - 1][0], seq[i][1] - seq[i - 1][1]);
			cum.push(total);
		}
		const idx = Math.min(left.length + midIdx, cum.length - 1);
		return {
			key,
			name,
			desc,
			d: 'M' + seq.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'),
			delay: Math.round((cum[idx] / total) * DRAW * T)
		};
	}

	const VERS: Ver[] = [];

	/* V1 — 미세 지글: 거의 평평, ±1.2px */
	{
		const inner: [number, number][] = [[116.5, CY]];
		for (let x = 119, i = 0; x <= 141; x += 3, i++) inner.push([x, CY + (i % 2 === 0 ? -1.2 : 1.2)]);
		inner.push([143.5, CY]);
		VERS.push(build('v1', 'V1. 미세 지글', '거의 평평한 아주 얇은 선이 살짝만 지글거리며 관통.', inner, Math.floor(inner.length / 2)));
	}

	/* V2 — 세로 코일(CFL): 나선 측면도. 루프가 살짝만 겹치게(loop 높이 4.8 > pitch 3.6) */
	{
		const inner: [number, number][] = [[116.5, CY], [119.5, 29.5], [123.2, 32.5]];
		const TURNS = 4.5, STEP = 24, A = 6.8, B = 2.4, PITCH = 3.6, Y0 = 32.5;
		for (let i = 0; i <= TURNS * STEP; i++) {
			const t = i / STEP;
			inner.push([130 + A * Math.cos(2 * Math.PI * t + Math.PI), Y0 - PITCH * t + B * Math.sin(2 * Math.PI * t + Math.PI)]);
		}
		inner.push([140, 19], [142.5, 22.5], [143.5, CY]);
		VERS.push(build('v2', 'V2. 세로 코일 (CFL)', '촘촘한 나선을 아래에서 위로 감아 올라갔다가 오른쪽으로 내려와 빠져나감.', inner, 3 + Math.floor((TURNS * STEP) / 2)));
	}

	/* V3 — 무한대(∞): 가운데서 8자를 그리고, 위쪽 절반을 되밟아 빠져나감 */
	{
		const inner: [number, number][] = [
			[116.5, CY],
			[118, 26],
			[119.5, 22],
			[123, 20.2],
			[127, 22.5],
			[130, 26],
			[133, 29.5],
			[137, 31.8],
			[140.5, 30],
			[142, 26],
			[140.5, 22],
			[137, 20.2],
			[133, 22.5],
			[130, 26],
			[127, 29.5],
			[123, 31.8],
			[119.5, 30],
			[118, 26],
			// 되밟기(같은 선 위) — 왼쪽 위→중앙→오른쪽 아래→오른끝 → 탈출
			[119.5, 22],
			[123, 20.2],
			[127, 22.5],
			[130, 26],
			[133, 29.5],
			[137, 31.8],
			[140.5, 30],
			[142, 26],
			[143.5, CY]
		];
		VERS.push(build('v3', 'V3. 무한대 (∞)', '가운데에 무한대를 그리고 같은 선을 따라 빠져나감. 광점이 8자를 도는 게 보임.', inner, 9));
	}

	/* V4 — 세로 스프링(루즈): 느슨한 나선 2.5바퀴, 루프 사이가 떨어져 있음(pitch 6.6 > loop 높이 6.4) */
	{
		const inner: [number, number][] = [[116.5, CY], [119.5, 29.5], [123, 32.5]];
		const TURNS = 2.5, STEP = 24, A = 7, B = 3.2, PITCH = 6.6, Y0 = 32.5;
		for (let i = 0; i <= TURNS * STEP; i++) {
			const t = i / STEP;
			inner.push([130 + A * Math.cos(2 * Math.PI * t + Math.PI), Y0 - PITCH * t + B * Math.sin(2 * Math.PI * t + Math.PI)]);
		}
		inner.push([140, 19], [142.5, 22.5], [143.5, CY]);
		VERS.push(build('v4', 'V4. 세로 스프링 (루즈)', '느슨한 스프링을 감아 올라갔다가 내려와 빠져나감.', inner, 3 + Math.floor((TURNS * STEP) / 2)));
	}

	/* V5 — 가로 스프링: 눕힌 나선을 코르크따개처럼 뚫고 지나감. 유리 원 안에 맞게 중앙 배치 */
	{
		const inner: [number, number][] = [[116.5, CY], [118, 30], [120.5, 33]];
		const TURNS = 2.75, STEP = 24, A = 7, B = 3, PITCH = 7.3, X0 = 120.5;
		for (let i = 0; i <= TURNS * STEP; i++) {
			const t = i / STEP;
			inner.push([X0 + PITCH * t + B * Math.sin(2 * Math.PI * t), 26 + A * Math.cos(2 * Math.PI * t)]);
		}
		inner.push([143.5, CY]);
		VERS.push(build('v5', 'V5. 가로 스프링', '눕힌 스프링을 코르크따개처럼 감으며 그대로 통과.', inner, 3 + Math.floor((TURNS * STEP) / 2)));
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
	<h1>필라멘트 5버전 시안 (색은 골드 고정)</h1>
	<p class="note">버전을 골라주세요. 색(A~E)은 따로 골라주면 그대로 적용합니다.</p>

	{#each VERS as v (v.key)}
		<section>
			<h2>{v.name}</h2>
			<p class="desc">{v.desc}</p>
			<div class="stage">
				<span class="wrap" style="--ln:{C.line}; --g1:{C.g1}; --g2:{C.g2}; --tip:{C.tip}; --fil:{C.fil}">
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
						<circle class="tip" r="3" style="offset-path: path('{v.d}')" />
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
		stroke-width: 1.1;
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
