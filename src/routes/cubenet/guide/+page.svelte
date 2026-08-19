<script lang="ts">
	import { NETS, parseNet, problemAt, FACES } from '$lib/cubenet';
	import CubeNetFigure from '$lib/components/CubeNetFigure.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import CubeFold from '$lib/components/CubeFold.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';

	/* 전개도 푸는 법. 여기 적은 규칙은 전개도 64종 전부에서 반례가 없는지 테스트로 확인한 것들이다
	   (cubenet.test.ts의 '전개도 읽는 요령'). 어림짐작을 요령이라고 가르치면 안 된다. */

	// 규칙 설명용 작은 전개도 — 실제로 접히는 모양만 쓴다
	const straightCells = parseNet(['###', '.#.', '.#.']);
	const elbowCells = parseNet(['##..', '.###']);

	// 직접 접어보는 예제
	const demo = problemAt(3);
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

	const short = (i: number) => FACES[i].name.split(' ')[1];
	const oppOf = (() => {
		const m = new Map<number, number>();
		for (const [a, b] of demo.opposites) {
			m.set(a, b);
			m.set(b, a);
		}
		return m;
	})();
	const demoRing = (() => {
		const [, left, right] = demo.options[demo.answer];
		return [left, right, oppOf.get(left)!, oppOf.get(right)!];
	})();
</script>

<svelte:head>
	<title>전개도 문제 푸는 법 — 마주 보는 면과 거울상 가리기 | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="정육면체 전개도를 접으면 어떤 주사위가 되는지 알아내는 법. 한 칸 건너뛰면 마주 본다는 규칙부터 거울상을 가려내는 방법까지, 전개도 64종에서 검증한 요령을 정리했습니다."
	/>
	<link rel="canonical" href="https://ddalkkak.app/cubenet/guide" />
	<meta property="og:title" content="전개도 문제 푸는 법 | 딸깍 퍼즐" />
	<meta
		property="og:description"
		content="마주 보는 면 찾는 법과 거울상 가려내는 법. 직접 접어볼 수 있습니다."
	/>
	<meta property="og:url" content="https://ddalkkak.app/cubenet/guide" />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/cubenet">전개도</a><span aria-hidden="true">›</span><span>푸는 법</span>
		</nav>
		<h1>전개도 문제,<br /><b>이렇게 풀면 됩니다</b></h1>
		<p class="lead">
			머릿속에서 종이를 접는 게 어려운 이유는, 접는 과정을 한 번에 상상하려 하기 때문입니다. 그럴
			필요가 없어요. <b>전개도만 보고 마주 보는 면을 먼저 찾으면</b> 보기 절반이 그냥 걸러집니다.
		</p>
	</header>

	<section class="sec">
		<h2>먼저 — 접는 방향은 하나뿐입니다</h2>
		<p>
			전개도는 종이 한 장이고, 그림은 한쪽 면에만 그려져 있습니다. 주사위는 눈이 바깥에 있어야
			주사위니까, <b>그림이 바깥으로 오도록</b> 접습니다.
		</p>
		<p>
			반대로 접으면 그림이 상자 안쪽에 갇혀서 겉에서는 백지 여섯 장만 보여요. 그리고 면마다 다른
			방향으로 접을 수도 없습니다 — 일부는 위로, 일부는 아래로 접으면 상자가 닫히지 않거든요.
			그래서 <b>답은 언제나 하나</b>입니다.
		</p>
	</section>

	<section class="sec">
		<h2>규칙 1 — 한 칸 건너뛰면 마주 본다</h2>
		<p>
			일직선으로 세 칸이 붙어 있으면, <b>양 끝 두 칸은 접었을 때 서로 마주 봅니다.</b> 가운데 칸을
			바닥으로 두고 양쪽을 세워 보면 당연한 얘기예요.
		</p>
		<div class="figrow">
			<div class="fig">
				<CubeNetFigure
					rows={['###', '.#.', '.#.']}
					cells={straightCells}
					faceOf={[0, 4, 1, 2, 3]}
					size={40}
				/>
				<span class="cap">가로 양 끝(원 ↔ 고리)이 마주 본다</span>
			</div>
		</div>
		<p class="note">
			세로도 똑같습니다. 그리고 <b>네 칸이 일직선</b>이면 그건 상자를 한 바퀴 감는 띠라서, 양 끝 두
			칸은 마주 보는 게 아니라 <b>맞닿는 이웃</b>이 됩니다.
		</p>
	</section>

	<section class="sec">
		<h2>규칙 2 — ㄱ자로 꺾이면 이웃이다</h2>
		<p>
			대각선에 놓인 두 칸이 ㄱ자로 이어져 있으면, 그 둘은 접었을 때 <b>모서리에서 맞닿는 이웃</b>입니다.
			절대 마주 보지 않아요.
		</p>
		<div class="figrow">
			<div class="fig">
				<CubeNetFigure rows={['##..', '.###']} cells={elbowCells} faceOf={[0, 1, 2, 3, 4, 5]} size={40} />
				<span class="cap">ㄱ자로 꺾인 칸끼리는 서로 이웃</span>
			</div>
		</div>
		<p class="note">
			이 두 규칙이면 여섯 면을 <b>세 쌍</b>으로 다 묶을 수 있습니다. 묶고 나면 보기 중에 마주 보는
			두 면이 함께 그려진 것은 바로 지울 수 있어요. 한 화면에 같이 보일 수가 없으니까요.
		</p>
	</section>

	<section class="sec">
		<h2>규칙 3 — 남은 둘은 거울상으로 갈린다</h2>
		<p>
			마주 보는 면으로 걸러내고 나면 보통 <b>두 개가 남습니다.</b> 세 면은 똑같은데 좌우 배치만 다른
			것들이에요. 여기서부터가 이 문제의 진짜 승부입니다.
		</p>
		<p>
			어떤 면을 위에 두면, 그 둘레를 도는 옆면 넷의 <b>순서가 주사위에 새겨져 있습니다.</b> 아무리
			돌려도 이 순서는 거꾸로 되지 않아요. <b>오른손을 아무리 돌려도 왼손이 되지 않는 것</b>과
			같습니다.
		</p>
		<div class="ringbox">
			<p class="ringlead">
				아래 예제에서 <b>{short(demo.options[demo.answer][0])}</b>을 위로 두면, 옆면 넷은 항상 이
				순서로만 돕니다.
			</p>
			<div class="ringrow">
				{#each demoRing as f, i (i)}
					<span class="rf">{short(f)}</span>
					<span class="arrow" aria-hidden="true">→</span>
				{/each}
				<span class="rf back">처음으로</span>
			</div>
			<p class="note">
				정답은 <b>{short(demoRing[0])}</b> 다음이 <b>{short(demoRing[1])}</b>. 이 순서를 거꾸로 그린
				그림은 만들 수 없습니다.
			</p>
		</div>
	</section>

	<div class="adwrap"><AdSlot label="전개도 가이드" /></div>

	<section class="sec">
		<h2>직접 접어보기</h2>
		<p class="sub">
			말로 읽는 것보다 한 번 접어보는 게 빠릅니다. 슬라이더를 천천히 움직여 보고, 그림을 끌어서
			돌려보세요.
		</p>
		<div class="netbox">
			<CubeNetFigure rows={demo.net.rows} cells={demo.net.cells} faceOf={demo.net.faceOf} />
		</div>
		<div class="answer-row">
			<span>접으면 이렇게 됩니다 →</span>
			<CubeDie view={demo.options[demo.answer]} size={72} />
		</div>
		<div
			class="stage"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointercancel={up}
			role="img"
			aria-label="전개도가 접히는 모습. 끌어서 돌릴 수 있습니다."
		>
			<CubeFold cells={demo.net.cells} faceOf={demo.net.faceOf} t={fold} {rotX} {rotY} {smooth} />
		</div>
		<div class="ctrl">
			<label for="g-fold">접기</label>
			<input
				id="g-fold"
				type="range"
				min="0"
				max="1"
				step="0.01"
				bind:value={fold}
				oninput={() => (smooth = false)}
			/>
			<button
				class="mini"
				onclick={() => {
					smooth = true;
					fold = fold > 0.5 ? 0 : 1;
				}}
			>
				{fold > 0.5 ? '펼치기' : '접기'}
			</button>
		</div>
	</section>

	<section class="sec">
		<h2>순서대로 정리하면</h2>
		<ol class="steps">
			<li><b>마주 보는 면 세 쌍을 먼저 묶는다.</b> 한 칸 건너뛴 칸끼리, ㄱ자는 이웃.</li>
			<li><b>마주 본 면이 같이 그려진 보기를 지운다.</b> 보통 여기서 둘이 남는다.</li>
			<li><b>남은 둘 중 하나는 거울상이다.</b> 윗면 둘레의 순서를 확인한다.</li>
			<li><b>그래도 헷갈리면 실제로 접어본다.</b> 딸깍은 틀리면 접히는 과정을 보여준다.</li>
		</ol>
	</section>

	<section class="sec">
		<h2>딸깍의 전개도 문제는 이렇게 만듭니다</h2>
		<p>
			사람이 문제를 쓰지 않습니다. 여섯 칸짜리 조각을 <b>216가지</b> 전부 만들어 실제로 접히는
			<b>{NETS.length}종</b>만 남깁니다. 손으로 적으면 반드시 몇 개는 틀리거든요 — 처음 24개를 적었을
			때 그중 6개가 접히지 않는 가짜였습니다.
		</p>
		<p>
			오답 세 개도 검증합니다. 주사위를 돌리는 방법은 <b>24가지</b>뿐이라, 그 24가지에서 보이는 조합을
			전부 모아 두고 오답이 정말 그 목록에 없는지 대조합니다. 하나라도 통과하지 못하면 그 문제는
			버립니다.
		</p>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/cubenet">전개도 문제 풀러 가기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/">오늘의 딸깍 풀러 가기</a>
	</section>
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.crumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.crumb a {
		color: var(--accent);
		text-decoration: none;
	}
	h1 {
		margin: 10px 0;
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
	.note {
		background: var(--panel-2);
		border-left: 3px solid var(--accent);
		border-radius: 0 12px 12px 0;
		padding: 11px 14px;
		font-size: 13.5px !important;
	}

	.figrow {
		display: flex;
		gap: 12px;
		margin: 12px 0;
	}
	.fig {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
		flex: 1;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 14px 10px;
	}
	.cap {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
		text-align: center;
		word-break: keep-all;
	}

	.ringbox {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 14px 15px;
	}
	.ringlead {
		margin: 0 0 9px !important;
		font-size: 13.5px !important;
		color: var(--text) !important;
	}
	.ringrow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 5px;
		margin-bottom: 10px;
	}
	.rf {
		padding: 5px 10px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		font-size: 12.5px;
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

	.netbox {
		display: flex;
		justify-content: center;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 16px 12px;
	}
	.answer-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin: 12px 0;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.stage {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		touch-action: none;
		cursor: grab;
		user-select: none;
	}
	.ctrl {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
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
		padding: 8px 13px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		font-family: inherit;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text);
		cursor: pointer;
	}

	.steps {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.steps li {
		font-size: 13.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.steps b {
		color: var(--text);
	}

	.adwrap {
		margin-top: 26px;
	}

	.ctas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15.5px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.cta.ghost {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border-strong);
		box-shadow: none;
		font-weight: 700;
	}
</style>
