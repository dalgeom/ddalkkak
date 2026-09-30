<script lang="ts">
	import ExampleList from '$lib/components/ExampleList.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import { parseEq } from '$lib/matchstick';

	/* 누적 문제 수는 레이아웃 서버 로드가 실제로 세어 내려준다(숫자를 박아두면 반드시 어긋난다) */
	let { data }: { data: { totalProblems: number } } = $props();

	const CONTACT = 'hyun7219@gmail.com';
	const demoBoard = parseEq('8 - 0 = 8');

	const RULES = [
		{
			t: '규칙을 지문에 드러내지 않아요',
			d: '"각 자리 숫자를 더하세요" 같은 안내가 있으면 발견이 아니라 계산이 돼요.'
		},
		{
			t: '답은 하나로 정해져야 해요',
			d: '다른 규칙으로도 말이 되면 문제가 아니라 논쟁이 돼요.'
		},
		{
			t: '미끼를 무너뜨리는 예시가 있어야 해요',
			d: '자연스럽게 떠오르는 오답 가설을 문제 안의 다른 예시가 스스로 무너뜨려야 해요.'
		},
		{
			t: '규칙을 안 순간 "아!" 소리가 나야 해요',
			d: '억지로 꼬아 놓기만 한 문제는 빼요.'
		}
	];
</script>

<svelte:head>
	<title>소개 — 딸깍 퍼즐</title>
	<meta
		name="description"
		content="딸깍은 매일 10문제가 새로 열리는 두뇌 퍼즐 사이트예요. 발견형 퍼즐·상식 퀴즈·성냥개비·전개도를 매일 자정에 새로, 모두가 같은 문제로 풀어요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/about" />
	<meta property="og:title" content="소개 — 딸깍 퍼즐" />
	<meta property="og:description" content="매일 10문제가 새로 열리는 두뇌 퍼즐 사이트, 딸깍." />
	<meta property="og:url" content="https://ddalkkak.app/about" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">소개</span>
		<h1>규칙을 발견하는 순간의<br /><b>그 소리, 딸깍</b></h1>
		<p class="lead">
			막막하던 문제에서 규칙이 보이는 순간, 머릿속에서 딸깍 하고 스위치가 켜져요. 그 소리를 매일
			한 번씩 듣자고 만든 사이트예요.
		</p>
		<div class="facts">
			<div class="fact"><b>10</b><span>하루 문제 수</span></div>
			<div class="fact"><b>{data.totalProblems.toLocaleString()}</b><span>누적 문제</span></div>
			<div class="fact"><b>0원</b><span>가입·결제</span></div>
		</div>
	</header>

	<section class="sec">
		<h2 class="sh">매일 나오는 네 가지 문제</h2>
		<div class="cards">
			<div class="card">
				<div class="ct"><b>발견형 퍼즐</b><span class="tag">딸깍의 간판</span></div>
				<p class="cd">
					규칙을 알려주지 않고 예시만 줘요. 숨은 규칙을 스스로 찾아 물음표를 채워요.
					숫자·글자·색·전광판·손그림 등 재료가 다양해요.
				</p>
				<ExampleList text={'5+3 = 28\n9+1 = 810\n7+3 = ?'} />
			</div>
			<div class="card">
				<div class="ct"><b>상식 퀴즈</b><span class="tag">18개 분야 · 4단계</span></div>
				<p class="cd">
					지리·역사·과학·속담·사자성어 등을 초등부터 어른까지 네 단계 난이도로 나눴어요.
					시의성에 흔들리지 않는, 오래 유효한 사실만 다뤄요.
				</p>
			</div>
			<div class="card">
				<div class="ct"><b>성냥개비</b><span class="tag">하나만 옮겨 참으로</span></div>
				<p class="cd">
					틀린 등식에서 성냥 하나만 옮겨 참으로 만드는 고전 퍼즐이에요. 전광판 획을 손으로 직접
					집어 옮겨요.
				</p>
				<MatchstickBoard
					board={demoBoard}
					picked={null}
					onstick={() => {}}
					interactive={false}
					label="8 − 0 = 8"
				/>
			</div>
			<div class="card">
				<div class="ct"><b>전개도</b><span class="tag">머릿속으로 접기</span></div>
				<p class="cd">
					펼쳐진 정육면체를 접으면 어떤 주사위가 되는지 맞혀요. 규칙을 외워 푸는 게 아니라
					도형을 실제로 돌려봐야 풀려요. 틀리면 접히는 과정을 그대로 보여줘요.
				</p>
				<div class="dieRow"><CubeDie view={[2, 3, 4]} size={84} /></div>
			</div>
		</div>
		<p class="note">
			매일 10문제와 따로 즐기는 <a href="/chosung">초성 퀴즈</a>도 있어요. 발견형 푸는 법은
			<a href="/guide">풀이 가이드</a>에 단계별로 정리해 두었어요.
		</p>
	</section>

	<!-- 아래 「열 문제인 이유」·「52개를 갈아엎은 일」·「힌트가 정답을 감추는 이유」·「기록」은
	     8/24부터 홈에 있던 글이다. 홈 스크롤이 너무 길다는 지적(9/30)으로 여기로 옮겼다. -->
	<section class="sec">
		<h2 class="sh">매일, 모두 같은 문제</h2>
		<div class="flow">
			<div class="fstep"><b>자정</b><span>한국 시각 자정에 새 10문제가 열려요</span></div>
			<div class="fstep"><b>같은 문제</b><span>그날 방문한 사람은 모두 같은 문제를 풀어요</span></div>
			<div class="fstep"><b>결과 공유</b><span>같은 문제라서 친구와 바로 견줄 수 있어요</span></div>
		</div>
		<p class="para">
			발견형 세 문제, 상식 두 문제, 성냥개비 두 문제, 전개도 두 문제, 그리고 그날의 보너스 한
			문제예요. 순서와 조합은 날짜에서 계산되기 때문에 <b>누가 언제 들어와도 같은 열 문제</b>를
			만나요. 어제 푼 사람과 오늘 푼 사람이 같은 이야기를 할 수 있어야 한다고 생각했어요.
		</p>
		<p class="para">
			10분이면 끝나요. 매일 하는 일이 15분을 넘기면 사흘째에 그만두게 된다는 걸 만들면서 여러 번
			확인했어요. 그래서 스무 문제도 다섯 문제도 아닌 열 문제예요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">문제를 고르는 기준</h2>
		<p class="sub">특히 발견형은 아래를 전부 통과해야 문제은행에 들어가요.</p>
		<div class="rules">
			{#each RULES as r (r.t)}
				<div class="rule">
					<b>{r.t}</b>
					<span>{r.d}</span>
				</div>
			{/each}
		</div>
		<p class="para">
			모국어 화자에게 3초 안에 규칙이 보이면 빼고, 검색해서 알 수 있는 지식이어도 빼요. 이 기준으로
			<b>발견형 324문제 중 52개를 갈아엎은 적이 있어요.</b> 지금 나오는 문제들은 그 뒤에 남거나
			새로 들어온 것이에요.
		</p>
		<p class="para">
			막히면 힌트가 세 단계로 열려요. 첫 힌트는 어디를 보라고만 하고, 두 번째는 무엇을 해보라고
			하고, 세 번째에 규칙의 절반이 나와요. <b>정답은 마지막까지 알려주지 않아요.</b> 힌트를 여는
			순간이 포기하는 순간이 되면 발견이 사라지기 때문이에요.
		</p>
	</section>

	<!-- 누가 만들고 있는지가 이 페이지에 없었다. 소개 페이지가 기능 설명만 하고 있으면
	     사이트 뒤에 사람이 있는지 알 수 없다. 애드센스가 두 번 반려하며 가리킨 기준도
	     결국 그 지점이라, 만드는 사람과 그 방식을 적어 둔다. -->
	<section class="sec maker">
		<h2 class="sh">누가 만들고 있나</h2>
		<p>
			딸깍은 <b>한 사람이 만들고 매일 손보는 사이트</b>예요. 문제를 만들고, 버리고, 고치는 일을
			하루도 거르지 않고 하고 있어요. 회사도 팀도 없어서 좋은 점이 하나 있는데, 어제 이상하다고
			생각한 것을 오늘 바꿀 수 있다는 거예요.
		</p>
		<p>
			실제로 그렇게 고친 것이 많아요. 발견형 문제 100개를 한 번에 버린 적이 있고, 힌트가 정답을
			너무 많이 알려주던 아홉 문제를 하루 만에 다시 쓴 적도 있어요. 어떤 날은 이용자가 남긴 한 줄
			때문에 문제 하나가 통째로 바뀌기도 했어요. 그런 이야기는 <a href="/read">읽을거리</a>에
			그때그때 적고 있어요.
		</p>
		<p>
			사람이 손으로 만드는 것과 프로그램이 맡는 것을 나눠 두었어요. 발견형과 상식은 한 문제씩 직접
			쓰고 검수해요. 성냥개비와 전개도는 규칙이 명확해서 프로그램이 만들고, 대신 <b>사람이 손으로
			적으면 반드시 틀린다</b>는 것을 전제로 검증을 붙였어요. 전개도를 손으로 24개 적었을 때 그중
			여섯 개가 접히지 않는 가짜였던 경험에서 나온 방식이에요.
		</p>
	</section>

	<section class="sec maker">
		<h2 class="sh">기록은 이 브라우저에만 남아요</h2>
		<p>
			회원가입도 로그인도 없어요. 며칠 연속으로 풀었는지, 어떤 유형에 강한지는 전부
			<a href="/record">이 브라우저 안</a>에 저장돼요. 서버로 가는 것은 문제별 정답률을 내기 위한
			익명 숫자뿐이에요. 광고 외에 다른 수익은 없고, 가입도 결제도 없어요. 자세한 것은
			<a href="/privacy">개인정보처리방침</a>에 적어 두었어요.
		</p>
	</section>

	<section class="sec contact">
		<h2 class="sh">문의</h2>
		<p class="sub">문제 제보·오류 신고·제휴 문의를 환영해요.</p>
		<a class="mail" href="mailto:{CONTACT}">{CONTACT}</a>
		<a class="cta" href="/">오늘의 10문제 풀어보기 <span class="arr" aria-hidden="true">→</span></a>
	</section>
</article>

<style>
	/* 홈에서 옮겨 온 설명 문단(9/30) — maker 섹션 본문과 같은 리듬 */
	.para {
		margin-top: 12px;
		font-size: 14px;
		line-height: 1.85;
		color: var(--muted);
		word-break: keep-all;
	}
	.para b {
		color: var(--text);
	}
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
		color: var(--accent-text);
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
		color: var(--accent-text);
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
		color: var(--accent-text);
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
	.dieRow {
		display: flex;
		justify-content: center;
		padding: 4px 0;
	}
	.note {
		margin: 12px 2px 0;
		font-size: 13px;
		color: var(--muted);
	}
	.note a {
		color: var(--accent-text);
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
		color: var(--accent-text);
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

	/* 만드는 사람 이야기 — 기능 설명과 달리 글의 리듬으로 읽히게 */
	.maker p {
		font-size: 14px;
		line-height: 1.85;
		color: var(--muted);
		word-break: keep-all;
	}
	.maker p + p {
		margin-top: 10px;
	}
	.maker b {
		color: var(--text);
	}
	.maker a {
		color: var(--accent-text);
		font-weight: 700;
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
		color: var(--accent-text);
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
