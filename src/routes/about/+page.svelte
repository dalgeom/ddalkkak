<svelte:head>
	<title>소개 — 딸깍</title>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/about" />
	<meta property="og:title" content="소개 — 딸깍" />
	<meta property="og:description" content="딸깍은 숨은 규칙을 발견하는 두뇌 퍼즐 게임입니다." />
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/about" />
</svelte:head>

<div class="page">
	<h1>딸깍은 어떤 사이트인가요?</h1>
	<p>
		<b>딸깍</b>은 숨은 규칙을 발견하는 두뇌 퍼즐 게임입니다. 문제마다 수학처럼 보이는 함정
		뒤에 전혀 다른 층위의 규칙이 숨어 있고, 그것을 알아채는 순간 머릿속에서 "딸깍" 하는
		소리가 납니다. 저희는 그 순간을 위해 문제를 만듭니다.
	</p>
	<h2>이렇게 즐기세요</h2>
	<ul>
		<li>한 라운드는 문제 3개 — 가볍게 1~3분이면 충분합니다.</li>
		<li>막히면 힌트 사다리를 하나씩 열어 보세요. 대신 점수가 조금씩 깎입니다.</li>
		<li>규칙을 발견해도 꼭 검산해 보세요. 좋은 문제는 답이 스스로 증명됩니다.</li>
	</ul>
	<h2>세 가지 문제</h2>
	<p>딸깍에는 결이 다른 세 종류의 문제가 있습니다.</p>
	<ul>
		<li>
			<b>발견형 퍼즐</b> — 규칙을 알려주지 않고 예시만 줍니다. 숨은 규칙을 스스로 찾아 물음표를
			채우는, 딸깍의 간판이에요. 숫자·글자·색·전광판·손그림 등 다양한 재료로 나옵니다. 푸는
			법은 <a href="/guide">풀이 가이드</a>에 정리해 두었습니다.
		</li>
		<li>
			<b>상식 퀴즈</b> — 수도·역사·과학·속담·사자성어 등 18개 분야를 초등부터 어른까지 네 단계
			난이도로 나눴습니다. 시의성에 흔들리지 않는, 오래 유효한 사실만 다룹니다.
		</li>
		<li>
			<b>성냥개비</b> — 틀린 등식에서 성냥 하나만 옮겨 참으로 만드는 고전 퍼즐. 전광판(7-세그먼트)
			숫자를 손으로 직접 옮겨 봅니다.
		</li>
	</ul>
	<p>
		이 셋을 매일 한 세트(오늘의 딸깍)로 풀거나, 연속 모드에서 원하는 만큼 이어 풀 수 있습니다.
	</p>

	<h2>매일, 모두 같은 문제</h2>
	<p>
		오늘의 딸깍은 매일 자정(한국 시각)에 새로 열리고, 전 세계 방문자가 <b>같은 문제</b>를 풉니다.
		그래서 결과를 공유하면 친구와 같은 문제로 실력을 견줄 수 있어요. 지나간 날은
		<a href="/archive">지난 문제</a>에서 다시 풀어볼 수 있습니다.
	</p>

	<h2>문제의 기준</h2>
	<p>
		모든 문제는 자체 검수 기준을 통과합니다 — 발견형은 규칙을 지문에 노출하지 않고, 답이 하나로
		유일하며, 억지가 아니라 '발견의 쾌감'이 있어야 채택됩니다. 상식 퀴즈는 사실 정확성을 따로
		검증합니다.
	</p>

	<h2>문의</h2>
	<p>문제 제보·문의·제휴는 이메일 <b>ddalkkak.puzzle@gmail.com</b> 으로 보내 주세요.</p>
</div>

<a class="start-cta" href="/">오늘의 딸깍 풀어보기 →</a>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 30px 28px;
		line-height: 1.8;
		font-size: 15px;
		color: var(--text);
	}
	.start-cta {
		display: block;
		max-width: 720px;
		margin: 18px auto 0;
		padding: 15px 24px;
		text-align: center;
		background: var(--accent);
		color: #fff;
		border-radius: 13px;
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
		text-decoration: none;
		box-shadow: 0 1px 2px rgba(44, 40, 34, 0.16);
		transition:
			filter 0.18s var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.start-cta:hover {
		filter: brightness(1.06);
		transform: translateY(-1.5px);
	}
	h1 {
		font-size: 22px;
		margin-bottom: 12px;
	}
	h2 {
		font-size: 16px;
		margin: 20px 0 8px;
		color: var(--accent);
	}
	ul {
		padding-left: 20px;
	}
	li {
		margin: 6px 0;
		word-break: keep-all;
	}
	.page a {
		color: var(--accent);
		font-weight: var(--fw-emphasis);
		text-decoration: underline;
	}
</style>
