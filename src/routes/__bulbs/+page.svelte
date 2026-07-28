<script lang="ts">
	/**
	 * 필라멘트 아이콘 시안 — 배포용 아님, 선택 후 제거.
	 * 광점이 파형을 그리며 들어와 전구 안에서 아이콘 모양 필라멘트를 그리고 나간다.
	 * 선으로 이을 수 없는 점(느낌표 점, 스마일 눈)은 딸깍 번쩍이는 순간 팝 하고 나타난다.
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

	type Dot = { x: number; y: number; r: number };
	type Ver = { key: string; name: string; desc: string; d: string; delay: number; dots: Dot[] };

	/** 바깥 파형 + 전구 안 아이콘(inner)을 이어 붙이고, flashAt에 가장 가까운 지점에서 번쩍 */
	function build(
		key: string,
		name: string,
		desc: string,
		inner: [number, number][],
		flashAt: [number, number],
		dots: Dot[] = []
	): Ver {
		const left = basePts().filter(([x]) => x <= 114);
		const right = basePts().filter(([x]) => x >= 146);
		const seq: [number, number][] = [...left, ...inner, [146, CY], ...right, [W, CY]];
		let total = 0;
		const cum = [0];
		for (let i = 1; i < seq.length; i++) {
			total += Math.hypot(seq[i][0] - seq[i - 1][0], seq[i][1] - seq[i - 1][1]);
			cum.push(total);
		}
		let best = 0;
		let bestD = Infinity;
		for (let i = 0; i < inner.length; i++) {
			const dd = Math.hypot(inner[i][0] - flashAt[0], inner[i][1] - flashAt[1]);
			if (dd < bestD) {
				bestD = dd;
				best = i;
			}
		}
		return {
			key,
			name,
			desc,
			dots,
			d: 'M' + seq.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L'),
			delay: Math.round((cum[left.length + best] / total) * DRAW * T)
		};
	}

	const VERS: Ver[] = [];

	/* V1 — 클래식 컬: 전구 아이콘의 그 필라멘트. 스파이럴 컬 2개 + 소켓으로 사라지는 다리.
	   왼쪽 절반을 만들고 x=130 기준 미러+역순으로 오른쪽 절반을 얻는다(진행 방향이 맞아떨어짐). */
	{
		const leftSeq: [number, number][] = [
			[116.5, 26],
			[118.6, 24.2]
		];
		const SC = [126.8, 21.8]; // 왼쪽 컬 중심
		const STEPS = 20;
		for (let i = 0; i <= STEPS; i++) {
			const t = i / STEPS;
			const th = ((180 + 576 * t) * Math.PI) / 180; // 1.6바퀴 감김
			const r = 3.8 - 2.1 * t;
			leftSeq.push([SC[0] + r * Math.cos(th), SC[1] + r * Math.sin(th)]);
		}
		const last = leftSeq[leftSeq.length - 1];
		leftSeq.push([last[0], 39.3], [129.2, 39.7]); // 다리가 소켓 쪽으로 내려가 마스크 밖으로 사라짐
		const rightSeq = leftSeq.map(([x, y]) => [260 - x, y] as [number, number]).reverse();
		const inner: [number, number][] = [...leftSeq, ...rightSeq];
		VERS.push(build('v1', 'V1. 클래식 컬', '전구 아이콘의 그 필라멘트 — 양쪽 컬을 감고 다리가 소켓 속으로 사라짐.', inner, [129.2, 39.7]));
	}

	/* V2 — 느낌표(!): 세로 획을 긋고, 점은 딸깍 순간 팝 */
	{
		const inner: [number, number][] = [
			[116.5, 26],
			[121, 26.7],
			[126, 27.4],
			[129.4, 28.2],
			[130, 28.6],
			[130, 16.6],
			// 획을 되밟아 내려와 옆으로 빠져나감(광점이 긋고 내려찍는 느낌)
			[130, 24.2],
			[133.5, 25],
			[138.5, 25.6],
			[143.5, 26]
		];
		VERS.push(
			build('v2', 'V2. 느낌표 (!)', "'아!' — 획을 위로 긋고 같은 선을 타고 내려와 나감. 점은 팝 하고 찍힘.", inner, [130, 16.6], [
				{ x: 130, y: 33.4, r: 2 }
			])
		);
	}

	/* V3 — 하트(♥): 아래 꼭짓점에서 시작해 한 획으로 */
	{
		const inner: [number, number][] = [
			[116.5, 26],
			[120, 29.5],
			[125, 32.3],
			[130, 33.8],
			[126.5, 30.5],
			[123.5, 27.5],
			[122.3, 24],
			[123.3, 21.3],
			[125.8, 20],
			[128.2, 20.8],
			[130, 23],
			[131.8, 20.8],
			[134.2, 20],
			[136.7, 21.3],
			[137.7, 24],
			[136.5, 27.5],
			[133.5, 30.5],
			[130, 33.8],
			[134.5, 31.5],
			[139, 28.7],
			[143.5, 26]
		];
		VERS.push(build('v3', 'V3. 하트 (♥)', '아래 꼭짓점에서 시작해 한 획으로 하트를 그리고 나감.', inner, [130, 23]));
	}

	/* V4 — 스마일(☺): 입꼬리를 그리면 눈 두 개가 딸깍 순간 팝 */
	{
		const inner: [number, number][] = [
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
		VERS.push(
			build('v4', 'V4. 스마일 (☺)', '입을 그리고 나가는 순간 눈 두 개가 팝 — 전구가 웃는 얼굴이 됨.', inner, [130, 32.1], [
				{ x: 125.5, y: 21, r: 1.7 },
				{ x: 134.5, y: 21, r: 1.7 }
			])
		);
	}

	/* V5 — 무한대(∞): 8자를 그리고 같은 선을 따라 나감 */
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
		VERS.push(build('v5', 'V5. 무한대 (∞)', '가운데에 8자를 그리고 같은 선을 따라 나감.', inner, [133, 29.5]));
	}

	/* V6 — 클로버(♣): 동그란 잎 3개를 가운데서 차례로 감고 줄기로 나감 */
	{
		const leaf = (cx: number, cy: number, deg: number): [number, number][] => {
			const a = (deg * Math.PI) / 180;
			const LC: [number, number] = [cx + 6.5 * Math.cos(a), cy + 6.5 * Math.sin(a)];
			const pts: [number, number][] = [[cx, cy]];
			// 잎 = 원형 고리: 중심 반대편에서 시작해 320° 감고 돌아옴 — 잎끼리 안 겹치게 간격 확보
			for (let i = 0; i <= 12; i++) {
				const th = a + Math.PI + ((-160 + 320 * (i / 12)) * Math.PI) / 180;
				pts.push([LC[0] + 2.9 * Math.cos(th), LC[1] + 2.9 * Math.sin(th)]);
			}
			pts.push([cx, cy]);
			return pts;
		};
		const inner: [number, number][] = [
			[116.5, 26],
			[120.5, 27.8],
			[126, 28.6],
			...leaf(130, 28, 205),
			...leaf(130, 28, 270),
			...leaf(130, 28, 335),
			[130.5, 32.5],
			[134, 31],
			[139, 28.4],
			[143.5, 26]
		];
		VERS.push(build('v6', 'V6. 클로버 (♣)', '동그란 잎 세 개를 가운데서 차례로 감고 줄기로 나감.', inner, [130, 18.6]));
	}

	/* 색은 골드 고정(색 선택은 별도) */
	const C = {
		line: '#e8b820',
		g1: 'rgba(246,211,78,0.95)',
		g2: 'rgba(246,211,78,0.55)',
		tip: '#fff3c4',
		fil: '#a97f12'
	};

	/* 팝 점(느낌표 점, 스마일 눈): 각자 딸깍 시점부터 잔상 소멸까지만 보이게 키프레임 생성 */
	const popCss = VERS.filter((v) => v.dots.length)
		.map((v) => {
			const end = ((0.94 * T - v.delay) / T) * 100;
			const hold = (end - 5).toFixed(1);
			return `@keyframes pop-${v.key}{0%{opacity:0;transform:scale(.2)}1.2%{opacity:1;transform:scale(1.35)}2.6%{transform:scale(1)}${hold}%{opacity:1;transform:scale(1)}${end.toFixed(1)}%{opacity:0;transform:scale(1)}100%{opacity:0;transform:scale(.2)}}`;
		})
		.join('');
</script>

{@html `<style>${popCss}</style>`}

<div class="page">
	<h1>필라멘트 아이콘 시안 (색은 골드 고정)</h1>
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

						{#each v.dots as dt (dt.x)}
							<circle
								class="pop"
								cx={dt.x}
								cy={dt.y}
								r={dt.r}
								style="animation: pop-{v.key} 4.5s linear {v.delay}ms infinite; transform-origin: {dt.x}px {dt.y}px;"
							/>
						{/each}

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
		stroke-width: 1.3;
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
	.pop {
		fill: var(--fil);
		opacity: 0;
		filter: drop-shadow(0 0 1.5px var(--g1));
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
