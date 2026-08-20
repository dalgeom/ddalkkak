<script lang="ts">
	import { problemAt, FACES, NETS, objectParticle, type CubeNetProblem } from '$lib/cubenet';
	import { CUBE_TOTAL } from '$lib/game';
	import CubeNetFigure from '$lib/components/CubeNetFigure.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import CubeFold from '$lib/components/CubeFold.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import { track } from '$lib/analytics';

	/* 전개도 연습. 다른 유형과 같은 규모(CUBE_TOTAL)로 끊어 돌린다. */

	let started = $state(false);
	let idx = $state(0);
	let picked = $state<number | null>(null);
	let log = $state<boolean[]>([]);

	const p = $derived<CubeNetProblem>(problemAt(idx % CUBE_TOTAL));
	const answered = $derived(picked !== null);
	const correct = $derived(picked === p.answer);
	const solved = $derived(log.filter(Boolean).length);

	let fold = $state(0);
	let rotX = $state(-22);
	let rotY = $state(-38);
	let smooth = $state(true);
	let drag: { x: number; y: number; rx: number; ry: number } | null = null;
	function down(e: PointerEvent) {
		drag = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!drag) return;
		rotY = drag.ry + (e.clientX - drag.x) * 0.6;
		rotX = drag.rx - (e.clientY - drag.y) * 0.6;
	}
	function up() {
		drag = null;
	}

	/** 윗면을 축으로 옆면 넷이 도는 순서 — 거울상이 왜 불가능한지가 여기서 드러난다 */
	const ring = $derived.by(() => {
		const [, left, right] = p.options[p.answer];
		const m = new Map<number, number>();
		for (const [a, b] of p.opposites) {
			m.set(a, b);
			m.set(b, a);
		}
		return [left, right, m.get(left)!, m.get(right)!];
	});

	function start() {
		started = true;
		track('practice_start', { filter: 'cube' });
	}
	function pick(i: number) {
		if (answered) return;
		picked = i;
		log = [...log, i === p.answer];
	}
	function next() {
		idx += 1;
		picked = null;
		fold = 0;
		rotX = -22;
		rotY = -38;
		smooth = true;
	}

	const short = (i: number) => FACES[i].name.split(' ')[1];
</script>

<svelte:head>
	<title>전개도 문제 {CUBE_TOTAL}개 — 접으면 어떤 주사위? | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="정육면체 전개도를 접으면 어떤 주사위가 될까요? 공간 지각 문제 {CUBE_TOTAL}개를 가입 없이 무료로 풉니다. 틀리면 실제로 접히는 과정을 3D로 보여줘요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/cubenet" />
	<meta property="og:title" content="전개도 문제 — 접으면 어떤 주사위? | 딸깍 퍼즐" />
	<meta
		property="og:description"
		content="공간 지각 문제 {CUBE_TOTAL}개. 틀리면 접히는 과정을 3D로 보여줍니다."
	/>
	<meta property="og:url" content="https://ddalkkak.app/cubenet" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">전개도</span>
		<h1>이 전개도를 접으면<br /><b>어떤 주사위가 될까?</b></h1>
		<p class="lead">
			머릿속에서 종이를 접어 보는 문제입니다. 규칙을 외워서 푸는 게 아니라 도형을 실제로 돌려봐야
			풀려요. 틀리면 <b>진짜로 접히는 과정</b>을 보여주니, 몇 번만 해보면 감이 옵니다.
		</p>
		{#if log.length}
			<div class="facts">
				<div class="fact"><b>{solved}/{log.length}</b><span>맞힌 개수</span></div>
				<div class="fact"><b>{Math.round((solved / log.length) * 100)}%</b><span>정답률</span></div>
				<div class="fact"><b>{CUBE_TOTAL}</b><span>전개도 문제</span></div>
			</div>
		{/if}
	</header>

	{#if !started}
		<button class="cta" onclick={start}>연습 시작하기 <span aria-hidden="true">→</span></button>
	{:else}
		<section class="q">
			<p class="ask">이 전개도를 접어 주사위를 만들면, 어떤 모양이 될까요?</p>
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
						<CubeDie view={opt} size={88} />
					</button>
				{/each}
			</div>

			{#if answered}
				<div class="sol" class:ok={correct}>
					<p class="verdict">
						{correct ? '딸깍! 맞았어요' : `아니에요 — 정답은 ${['A', 'B', 'C', 'D'][p.answer]}`}
					</p>
					<p class="opp">
						마주 보는 면:
						{#each p.opposites as [a, b], k (k)}<span class="pair"
								>{FACES[a].name} ↔ {FACES[b].name}</span
							>{k < p.opposites.length - 1 ? ',' : ''}{/each}
					</p>
					<p class="ringline">
						<b>{short(p.options[p.answer][0])}</b>{objectParticle(short(p.options[p.answer][0]))} 위로 두면 옆면은 항상
						<b>{short(ring[0])} → {short(ring[1])} → {short(ring[2])} → {short(ring[3])}</b>
						순서로 돕니다. 이 순서를 거꾸로 그린 그림은 아무리 돌려도 안 나와요.
					</p>
				</div>

				<div class="foldbox">
					<button
						class="foldbtn"
						onclick={() => {
							smooth = true;
							fold = fold > 0.5 ? 0 : 1;
						}}
					>
						{fold > 0.5 ? '다시 펼치기' : '접히는 과정 보기'}
					</button>
					<div
						class="stage"
						onpointerdown={down}
						onpointermove={move}
						onpointerup={up}
						onpointercancel={up}
						role="img"
						aria-label="전개도가 접히는 모습. 끌어서 돌릴 수 있습니다."
					>
						<CubeFold cells={p.net.cells} faceOf={p.net.faceOf} t={fold} {rotX} {rotY} {smooth} />
					</div>
					<p class="hintline">그림을 끌면 돌려볼 수 있어요.</p>
				</div>

				<button class="cta" onclick={next}>다음 문제 <span aria-hidden="true">→</span></button>
			{/if}
		</section>
	{/if}

	<div class="adwrap"><AdSlot label="전개도 연습" /></div>

	<section class="sec">
		<h2>전개도 문제란</h2>
		<p>
			정육면체를 펼쳐 놓은 그림이 전개도입니다. 이걸 다시 접었을 때 어떤 주사위가 되는지 맞히는 게
			전개도 문제예요. 적성검사와 두뇌 퍼즐에서 오래 쓰여 온 유형이고, 머릿속에서 물체를 돌려보는
			능력을 씁니다.
		</p>
		<p>
			종이를 접는 방향은 하나뿐입니다. <b>그림이 바깥으로 오도록</b> 접어요. 반대로 접으면 그림이
			상자 안쪽에 갇혀서 겉에서는 백지 여섯 장만 보이니까요. 그래서 답도 하나뿐입니다.
		</p>
		<p>
			딸깍의 전개도 문제는 사람이 쓰지 않습니다. 여섯 칸짜리 조각을 전부 만들어 실제로 접히는 <b
				>{NETS.length}종</b
			>만 남기고, 오답 셋이 정말 만들 수 없는지 주사위를 돌리는 <b>24가지</b> 방법과 일일이 대조해 확인합니다.
			하나라도 통과 못 하면 그 문제는 버립니다.
		</p>
	</section>

	<section class="sec">
		<h2>빨리 푸는 요령</h2>
		<p class="sub">전개도만 보고 마주 보는 면을 알아내면 보기 절반이 그냥 걸러집니다.</p>
		<ul class="rules">
			<li>
				<b>한 칸 건너뛰면 마주 본다</b>
				<span>일직선으로 세 칸이 붙어 있으면, 양 끝 두 칸은 접었을 때 서로 마주 봅니다.</span>
			</li>
			<li>
				<b>ㄱ자로 꺾이면 이웃이다</b>
				<span>대각선으로 놓인 두 칸이 꺾어져 이어져 있으면 그 둘은 맞닿는 면입니다.</span>
			</li>
			<li>
				<b>마주 본 면은 같이 안 보인다</b>
				<span>보기에 마주 보는 두 면이 함께 그려져 있으면, 그건 무조건 오답입니다.</span>
			</li>
		</ul>
		<a class="glink" href="/cubenet/guide">숫자로 정리한 전체 풀이법 보기 →</a>
	</section>

	<section class="sec ctas">
		<a class="cta ghost" href="/">오늘의 딸깍 풀러 가기</a>
		<a class="cta ghost" href="/matchstick">성냥개비 퍼즐도 풀기</a>
	</section>
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
		color: var(--accent);
		background: var(--correct-bg);
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
	.lead b {
		color: var(--text);
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
		margin-top: 20px;
	}
	.ask {
		margin: 0 0 12px;
		font-size: 15.5px;
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
		margin-top: 12px;
	}
	.opt {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 132px;
		padding: 16px 8px 10px;
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
		margin-top: 12px;
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
	.opp {
		margin: 9px 0 0;
		font-size: 12.5px;
		color: var(--muted-2);
		word-break: keep-all;
	}
	.pair {
		font-weight: 700;
		color: var(--muted);
		white-space: nowrap;
	}
	.ringline {
		margin: 9px 0 0;
		font-size: 13px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.ringline b {
		color: var(--text);
	}

	.foldbox {
		margin-top: 12px;
	}
	.foldbtn {
		width: 100%;
		padding: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		font-family: inherit;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text);
		cursor: pointer;
	}
	.stage {
		margin-top: 8px;
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
	.hintline {
		margin: 6px 0 0;
		text-align: center;
		font-size: 12px;
		color: var(--muted-2);
	}

	.adwrap {
		margin-top: 24px;
	}

	.sec {
		margin-top: 28px;
	}
	.sec h2 {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 8px;
		word-break: keep-all;
	}
	.sec p {
		margin: 0 0 10px;
		font-size: 14px;
		line-height: 1.8;
		color: var(--muted);
		word-break: keep-all;
	}
	.sec p b {
		color: var(--text);
	}
	.sub {
		font-size: 13px !important;
	}
	.rules {
		list-style: none;
		margin: 0 0 12px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.rules li {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 13px 15px;
	}
	.rules b {
		display: block;
		font-size: 14px;
		font-weight: 800;
		margin-bottom: 4px;
		color: var(--accent);
		word-break: keep-all;
	}
	.rules span {
		font-size: 13px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.glink {
		display: inline-block;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--accent);
		text-decoration: none;
	}
	.glink:hover {
		text-decoration: underline;
	}

	.cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		min-height: 54px;
		margin-top: 14px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-family: inherit;
		font-size: 15.5px;
		font-weight: 800;
		text-decoration: none;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.ctas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cta.ghost {
		margin-top: 0;
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border-strong);
		box-shadow: none;
		font-weight: 700;
	}
	.cta.ghost:hover {
		background: var(--panel-2);
	}
</style>
