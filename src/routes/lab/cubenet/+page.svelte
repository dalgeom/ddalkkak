<script lang="ts">
	import { problemAt, FACES, type CubeNetProblem, type View } from '$lib/cubenet';
	import CubeNetFigure from '$lib/components/CubeNetFigure.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import CubeFold from '$lib/components/CubeFold.svelte';
	import FaceMark from '$lib/components/FaceMark.svelte';

	/* 판단용 프로토타입. 오늘의 딸깍에는 아직 안 들어간다.
	   형이 직접 풀어보고 난이도·재미·소요 시간을 보고 정하려는 목적이다. */

	let idx = $state(0);
	let picked = $state<number | null>(null);
	let startedAt = $state(Date.now());
	let log = $state<{ ok: boolean; ms: number }[]>([]);

	const p = $derived<CubeNetProblem>(problemAt(idx));
	const answered = $derived(picked !== null);
	const correct = $derived(picked === p.answer);

	const oppOf = $derived.by(() => {
		const m = new Map<number, number>();
		for (const [a, b] of p.opposites) {
			m.set(a, b);
			m.set(b, a);
		}
		return m;
	});

	/** 왜 그 보기가 안 되는지 — 틀린 이유를 짚어줘야 다음 문제에서 는다 */
	function whyWrong(v: View): string {
		for (let i = 0; i < 3; i++) {
			for (let j = i + 1; j < 3; j++) {
				if (oppOf.get(v[i]) === v[j]) {
					return `${FACES[v[i]].name}과 ${FACES[v[j]].name}은 서로 마주 보는 면이에요. 마주 본 두 면은 한 화면에 같이 보일 수 없어요.`;
				}
			}
		}
		const same = [...v].sort().join(',') === [...p.options[p.answer]].sort().join(',');
		if (same) return '세 면은 맞았지만 배치가 거울처럼 뒤집혔어요. 아무리 돌려도 이 모양은 안 나와요.';
		return '이 세 면이 한 꼭짓점에서 만나도록 접히지 않아요.';
	}

	function pick(i: number) {
		if (answered) return;
		picked = i;
		log = [...log, { ok: i === p.answer, ms: Date.now() - startedAt }];
	}

	function next() {
		idx += 1;
		picked = null;
		startedAt = Date.now();
		fold = 0;
		rotX = -22;
		rotY = -38;
	}

	/* ── 접히는 과정 보기 ── */
	let fold = $state(0);
	let rotX = $state(-22);
	let rotY = $state(-38);
	let drag: { x: number; y: number; rx: number; ry: number } | null = null;

	function onDown(e: PointerEvent) {
		drag = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onMove(e: PointerEvent) {
		if (!drag) return;
		rotY = drag.ry + (e.clientX - drag.x) * 0.6;
		rotX = drag.rx - (e.clientY - drag.y) * 0.6;
	}
	function onUp() {
		drag = null;
	}

	/**
	 * 윗면을 축으로 옆면 넷이 도는 순서. 마주 보는 면은 고리에서 항상 두 칸 떨어지므로
	 * 정답의 (왼, 오른)에 각각의 반대편을 붙이면 고리가 완성된다.
	 * 거울상이 왜 불가능한지가 여기서 드러난다 — 이 고리는 한 방향으로만 돈다.
	 */
	const ring = $derived.by(() => {
		const [, left, right] = p.options[p.answer];
		return [left, right, oppOf.get(left)!, oppOf.get(right)!];
	});

	function reset() {
		idx = 0;
		picked = null;
		log = [];
		startedAt = Date.now();
	}

	const solved = $derived(log.filter((x) => x.ok).length);
	const avgSec = $derived(
		log.length ? Math.round(log.reduce((a, b) => a + b.ms, 0) / log.length / 100) / 10 : 0
	);
</script>

<svelte:head>
	<title>전개도 프로토타입 — 딸깍</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="description" content="전개도 문제 유형 시험용 페이지입니다." />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">프로토타입</span>
		<h1>전개도를 접으면<br /><b>어떤 주사위가 될까?</b></h1>
		<p class="lead">
			네 번째 유형 후보입니다. 아직 오늘의 딸깍에는 들어가지 않았어요. 몇 문제 풀어보고 난이도와
			재미를 봐주세요.
		</p>
		{#if log.length}
			<div class="facts">
				<div class="fact"><b>{solved}/{log.length}</b><span>맞힌 개수</span></div>
				<div class="fact"><b>{avgSec}초</b><span>문제당 평균</span></div>
				<div class="fact"><b>{idx + 1}</b><span>현재 번호</span></div>
			</div>
		{/if}
	</header>

	<section class="q">
		<p class="ask">아래 전개도를 접어 주사위를 만들면, 어떤 모양이 될까요?</p>

		<div class="netbox">
			<CubeNetFigure rows={p.net.rows} cells={p.net.cells} faceOf={p.net.faceOf} />
		</div>

		<div class="opts">
			{#each p.options as opt, i (i)}
				<button
					class="opt"
					class:right={answered && i === p.answer}
					class:wrong={answered && picked === i && i !== p.answer}
					class:dim={answered && i !== p.answer && picked !== i}
					onclick={() => pick(i)}
					disabled={answered}
				>
					<span class="tag">{['A', 'B', 'C', 'D'][i]}</span>
					<CubeDie view={opt} />
				</button>
			{/each}
		</div>

		{#if answered}
			<div class="sol" class:ok={correct}>
				<p class="verdict">{correct ? '딸깍! 맞았어요' : `아니에요 — 정답은 ${['A', 'B', 'C', 'D'][p.answer]}`}</p>
				{#if !correct}
					<p class="why">{whyWrong(p.options[picked!])}</p>
				{/if}
				<p class="opp">
					마주 보는 면:
					{#each p.opposites as [a, b], k (k)}
						<span class="pair">{FACES[a].name} ↔ {FACES[b].name}</span>
					{/each}
				</p>
			</div>
			<!-- 말로만 "거울처럼 뒤집혔어요" 하면 아무도 못 알아듣는다. 실제로 접어 보여준다. -->
			<section class="fold">
				<h2>직접 접어보기</h2>
				<p class="fsub">
					접는 방향은 하나뿐이에요. 반대로 접으면 그림이 상자 <b>안쪽</b>에 갇혀서, 겉에서는 백지
					여섯 장만 보입니다.
				</p>

				<div
					class="stage"
					onpointerdown={onDown}
					onpointermove={onMove}
					onpointerup={onUp}
					onpointercancel={onUp}
					role="img"
					aria-label="전개도가 접히는 모습. 끌어서 돌릴 수 있습니다."
				>
					<CubeFold cells={p.net.cells} faceOf={p.net.faceOf} t={fold} {rotX} {rotY} />
				</div>

				<div class="ctrl">
					<label for="foldrange">접기</label>
					<input id="foldrange" type="range" min="0" max="1" step="0.01" bind:value={fold} />
					<button class="mini" onclick={() => (fold = fold > 0.5 ? 0 : 1)}>
						{fold > 0.5 ? '펼치기' : '접기'}
					</button>
				</div>
				<p class="hintline">그림을 손가락으로 끌면 돌려볼 수 있어요.</p>

				<div class="ringbox">
					<p class="ringlead">
						<b>{FACES[p.options[p.answer][0]].name}</b>을 위로 두면, 옆면 넷은 항상 이 순서로만 돕니다.
					</p>
					<div class="ringrow">
						{#each ring as f, i (i)}
							<span class="rf">
								<svg viewBox="0 0 1 1" width="20" height="20" aria-hidden="true">
									<FaceMark face={f} />
								</svg>
								{FACES[f].name.split(' ')[1]}
							</span>
							<span class="arrow" aria-hidden="true">→</span>
						{/each}
						<span class="rf back">처음으로</span>
					</div>
					<p class="ringnote">
						정답은 <b>{FACES[ring[0]].name.split(' ')[1]}</b> 다음이
						<b>{FACES[ring[1]].name.split(' ')[1]}</b>. 이 순서를 거꾸로 그린 그림은 아무리 돌려도
						안 나와요. 오른손을 아무리 돌려도 왼손이 되지 않는 것과 같습니다.
					</p>
				</div>
			</section>

			<button class="nextbtn" onclick={next}>다음 문제 <span aria-hidden="true">→</span></button>
		{/if}
	</section>

	<section class="legend">
		<h2>여섯 면의 기호</h2>
		<p class="sub">
			90도 돌려도 같은 모양만 씁니다. 화살표나 숫자였다면 접히면서 방향이 바뀌어 "6이야 9야" 하고
			다투게 돼요. 색을 못 구분해도 모양으로 알 수 있게 색과 모양을 함께 줬습니다.
		</p>
		<div class="marks">
			{#each FACES as f, i (i)}
				<div class="mark">
					<svg viewBox="0 0 1 1" width="26" height="26" aria-hidden="true">
						<FaceMark face={i} />
					</svg>
					<span>{f.name}</span>
				</div>
			{/each}
		</div>
	</section>

	{#if log.length}
		<button class="reset" onclick={reset}>처음부터 다시</button>
	{/if}
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.kicker {
		display: inline-block;
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.4px;
		color: var(--accent-2);
		background: var(--gold-bg);
		border-radius: 7px;
		padding: 4px 11px;
	}
	h1 {
		margin: 12px 0 10px;
		font-size: 25px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		margin: 0;
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 16px;
	}
	.fact {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 11px 6px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 17px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.fact span {
		font-size: 11.5px;
		color: var(--muted-2);
	}

	.q {
		margin-top: 22px;
	}
	.ask {
		margin: 0 0 14px;
		font-size: 16px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.netbox {
		display: flex;
		justify-content: center;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 18px 12px;
	}

	.opts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 14px;
	}
	.opt {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 132px;
		padding: 14px 8px 10px;
		background: var(--panel);
		border: 2px solid var(--border-strong);
		border-radius: 16px;
		cursor: pointer;
		font-family: inherit;
	}
	.opt:disabled {
		cursor: default;
	}
	.tag {
		position: absolute;
		top: 8px;
		left: 10px;
		font-size: 12px;
		font-weight: 800;
		color: var(--muted-2);
	}
	.opt.right {
		border-color: var(--accent);
		background: var(--correct-bg, var(--panel-2));
	}
	.opt.right .tag {
		color: var(--accent);
	}
	.opt.wrong {
		border-color: var(--accent-2);
	}
	.opt.wrong .tag {
		color: var(--accent-2);
	}
	.opt.dim {
		opacity: 0.45;
	}

	.sol {
		margin-top: 14px;
		padding: 14px 16px;
		background: var(--panel-2);
		border-left: 3px solid var(--accent-2);
		border-radius: 0 12px 12px 0;
	}
	.sol.ok {
		border-left-color: var(--accent);
	}
	.verdict {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		word-break: keep-all;
	}
	.why {
		margin: 7px 0 0;
		font-size: 13.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.opp {
		margin: 10px 0 0;
		font-size: 12.5px;
		color: var(--muted-2);
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		align-items: baseline;
	}
	.pair {
		font-weight: 700;
		color: var(--muted);
	}

	.nextbtn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		min-height: 54px;
		margin-top: 12px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-family: inherit;
		font-size: 15.5px;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.nextbtn:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}

	.fold {
		margin-top: 16px;
		padding: 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
	}
	.fold h2 {
		margin: 0 0 6px;
		font-size: 15.5px;
		font-weight: 800;
	}
	.fsub {
		margin: 0 0 12px;
		font-size: 13px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.fsub b {
		color: var(--text);
	}
	.stage {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		touch-action: none;
		cursor: grab;
		user-select: none;
	}
	.stage:active {
		cursor: grabbing;
	}
	.ctrl {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
	}
	.ctrl label {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--muted);
		flex: none;
	}
	.ctrl input {
		flex: 1;
		accent-color: var(--accent);
	}
	.mini {
		flex: none;
		padding: 7px 12px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		font-family: inherit;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text);
		cursor: pointer;
	}
	.hintline {
		margin: 7px 0 0;
		font-size: 12px;
		color: var(--muted-2);
	}
	.ringbox {
		margin-top: 14px;
		padding: 13px 14px;
		background: var(--panel-2);
		border-left: 3px solid var(--accent);
		border-radius: 0 12px 12px 0;
	}
	.ringlead {
		margin: 0 0 9px;
		font-size: 13.5px;
		line-height: 1.6;
		word-break: keep-all;
	}
	.ringrow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 5px;
	}
	.rf {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px 4px 5px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
	}
	.rf.back {
		color: var(--muted-2);
		font-weight: 600;
	}
	.arrow {
		font-size: 12px;
		color: var(--muted-2);
	}
	.ringnote {
		margin: 10px 0 0;
		font-size: 12.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.ringnote b {
		color: var(--text);
	}

	.legend {
		margin-top: 28px;
	}
	.legend h2 {
		font-size: 16px;
		font-weight: 800;
		margin: 0 0 6px;
	}
	.sub {
		margin: 0 0 12px;
		font-size: 13px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.marks {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.mark {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px 6px 6px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--muted);
	}

	.reset {
		display: block;
		width: 100%;
		margin-top: 20px;
		padding: 12px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
	}
</style>
