<script lang="ts">
	import ExampleList from '$lib/components/ExampleList.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import { parseEq } from '$lib/matchstick';

	const CONTACT = 'hyun7219@gmail.com';
	const demoBoard = parseEq('8 - 0 = 8');

	const RULES = [
		{
			t: '규칙을 지문에 노출하지 않는다',
			d: '"각 자리 숫자를 더하세요" 같은 안내가 있으면 발견이 아니라 계산입니다.'
		},
		{
			t: '답이 하나로 유일해야 한다',
			d: '다른 규칙으로도 말이 되면 문제가 아니라 논쟁이 됩니다.'
		},
		{
			t: '미끼를 죽이는 예시가 있어야 한다',
			d: '자연스럽게 떠오르는 오답 가설을, 문제 안의 다른 예시가 스스로 무너뜨려야 합니다.'
		},
		{
			t: '발견의 쾌감이 있어야 한다',
			d: '규칙을 알아낸 순간 "아!" 소리가 나야 채택합니다. 억지로 꼬아 놓기만 한 문제는 뺍니다.'
		}
	];
</script>

<svelte:head>
	<title>소개 — 딸깍</title>
	<meta
		name="description"
		content="딸깍은 매일 10문제가 새로 열리는 두뇌 퍼즐 사이트입니다. 발견형 퍼즐·상식 퀴즈·성냥개비를 매일 자정에 새로, 모두가 같은 문제로 풉니다."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/about" />
	<meta property="og:title" content="소개 — 딸깍" />
	<meta property="og:description" content="매일 10문제가 새로 열리는 두뇌 퍼즐 사이트, 딸깍." />
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/about" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">소개</span>
		<h1>규칙을 발견하는 순간의<br /><b>그 소리, 딸깍</b></h1>
		<p class="lead">
			막막하던 문제에서 규칙이 보이는 순간, 머릿속에서 딸깍 하고 스위치가 켜집니다. 그 소리를 매일
			한 번씩 듣자고 만든 사이트입니다.
		</p>
		<div class="facts">
			<div class="fact"><b>10</b><span>하루 문제 수</span></div>
			<div class="fact"><b>1,317</b><span>누적 문제</span></div>
			<div class="fact"><b>0원</b><span>가입·결제</span></div>
		</div>
	</header>

	<section class="sec">
		<h2 class="sh">세 가지 문제</h2>
		<div class="cards">
			<div class="card">
				<div class="ct"><b>발견형 퍼즐</b><span class="tag">딸깍의 간판</span></div>
				<p class="cd">
					규칙을 알려주지 않고 예시만 줍니다. 숨은 규칙을 스스로 찾아 물음표를 채워요.
					숫자·글자·색·전광판·손그림 등 재료가 다양합니다.
				</p>
				<ExampleList text={'5+3 = 28\n9+1 = 810\n7+3 = ?'} />
			</div>
			<div class="card">
				<div class="ct"><b>상식 퀴즈</b><span class="tag">18개 분야 · 4단계</span></div>
				<p class="cd">
					지리·역사·과학·속담·사자성어 등을 초등부터 어른까지 네 단계 난이도로 나눴습니다.
					시의성에 흔들리지 않는, 오래 유효한 사실만 다룹니다.
				</p>
			</div>
			<div class="card">
				<div class="ct"><b>성냥개비</b><span class="tag">하나만 옮겨 참으로</span></div>
				<p class="cd">
					틀린 등식에서 성냥 하나만 옮겨 참으로 만드는 고전 퍼즐. 전광판 획을 손으로 직접 집어
					옮깁니다.
				</p>
				<MatchstickBoard
					board={demoBoard}
					picked={null}
					onstick={() => {}}
					interactive={false}
					label="8 − 0 = 8"
				/>
			</div>
		</div>
		<p class="note">발견형 푸는 법은 <a href="/guide">풀이 가이드</a>에 단계별로 정리해 두었습니다.</p>
	</section>

	<section class="sec">
		<h2 class="sh">매일, 모두 같은 문제</h2>
		<div class="flow">
			<div class="fstep"><b>자정</b><span>한국 시각 자정에 새 10문제가 열립니다</span></div>
			<div class="fstep"><b>같은 문제</b><span>그날 방문한 사람은 모두 같은 문제를 풉니다</span></div>
			<div class="fstep"><b>결과 공유</b><span>같은 문제라서 친구와 바로 견줄 수 있어요</span></div>
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">문제를 고르는 기준</h2>
		<p class="sub">특히 발견형은 아래를 전부 통과해야 문제은행에 들어갑니다.</p>
		<div class="rules">
			{#each RULES as r (r.t)}
				<div class="rule">
					<b>{r.t}</b>
					<span>{r.d}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec contact">
		<h2 class="sh">문의</h2>
		<p class="sub">문제 제보·오류 신고·제휴 문의를 환영합니다.</p>
		<a class="mail" href="mailto:{CONTACT}">{CONTACT}</a>
		<a class="cta" href="/">오늘의 10문제 풀어보기 <span class="arr" aria-hidden="true">→</span></a>
	</section>
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 26px 20px 22px;
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
		font-size: 26px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 18px;
	}
	.fact {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 12px 6px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 19px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.fact span {
		font-size: 11.5px;
		color: var(--muted-2);
	}

	.sec {
		margin-top: 26px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 6px 2px;
	}
	.sub {
		margin: 0 0 12px 2px;
		font-size: 13px;
		color: var(--muted);
		word-break: keep-all;
	}
	.note {
		margin: 12px 2px 0;
		font-size: 13px;
		color: var(--muted);
	}
	.note a {
		color: var(--accent);
		font-weight: 700;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.ct {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 7px;
	}
	.ct b {
		font-size: 16px;
	}
	.tag {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--muted);
		background: var(--panel-2);
		border-radius: 7px;
		padding: 3px 9px;
	}
	.cd {
		font-size: 13.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
		margin-bottom: 12px;
	}

	.flow {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.fstep {
		display: flex;
		align-items: baseline;
		gap: 10px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 13px 15px;
	}
	.fstep b {
		flex: none;
		font-size: 14px;
		color: var(--accent);
	}
	.fstep span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		word-break: keep-all;
	}

	.rules {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.rule {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		padding: 13px 15px;
	}
	.rule b {
		display: block;
		font-size: 14px;
		margin-bottom: 4px;
	}
	.rule span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}

	.contact {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 20px 18px;
		text-align: center;
	}
	.contact .sh,
	.contact .sub {
		margin-left: 0;
	}
	.mail {
		display: inline-block;
		margin-bottom: 18px;
		font-size: 16px;
		font-weight: 800;
		color: var(--accent);
		text-decoration: none;
		word-break: break-all;
	}
	.mail:hover {
		text-decoration: underline;
	}
	.cta {
		display: block;
		padding: 15px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.arr {
		display: inline-block;
		animation: arr 1.6s var(--ease-out) infinite;
	}
	@keyframes arr {
		0%,
		55%,
		100% {
			transform: translateX(0);
		}
		70% {
			transform: translateX(5px);
		}
		85% {
			transform: translateX(1px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.arr {
			animation: none;
		}
	}
	@media (min-width: 768px) {
		.cover {
			padding: 34px 30px 28px;
		}
		h1 {
			font-size: 30px;
		}
	}
</style>
