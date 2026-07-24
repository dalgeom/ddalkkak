<svelte:head>
	<title>발견형 퍼즐 풀이 가이드 — 딸깍</title>
	<meta
		name="description"
		content="규칙을 알려주지 않는 발견형 퍼즐, 어떻게 풀까? 가설을 세우는 방황부터 데이터 속 발판 찾기, 규칙 해금, 검산까지 — 막힐 때 규칙을 찾아내는 4단계와 자주 나오는 규칙의 결을 정리했습니다."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/guide" />
	<meta property="og:title" content="발견형 퍼즐 풀이 가이드 — 딸깍" />
	<meta
		property="og:description"
		content="규칙을 알려주지 않는 발견형 퍼즐을 푸는 4단계(방황·발판·해금·검산)와 자주 나오는 규칙의 결."
	/>
	<meta property="og:url" content="https://ddalkkak-1c2.pages.dev/guide" />
</svelte:head>

<article class="page">
	<h1>발견형 퍼즐, 어떻게 푸는 걸까?</h1>
	<p class="lead">
		발견형 퍼즐은 <b>규칙을 알려주지 않는</b> 퍼즐입니다. 예시 몇 개만 주고, 그 안에 숨은 규칙을
		스스로 찾아 물음표를 채우는 것이죠. 처음엔 막막하지만, 규칙을 찾아내는 데에는 분명한 흐름이
		있습니다. 이 글은 그 흐름을 정리한 것입니다.
	</p>

	<h2>규칙을 찾는 네 단계</h2>

	<h3>1. 방황 — 가설을 여러 개 던진다</h3>
	<p>
		더하기일까? 곱하기일까? 자릿수를 세는 걸까, 글자 모양일까? 처음엔 여러 가설을 꼬리에 꼬리를
		물고 시도하게 됩니다. 이 <b>방황</b>은 실패가 아니라 재미의 준비 운동이에요. 특히 숫자가 여러
		개 나열된 문제일수록 시도해 볼 가설이 많아 방황이 풍부하고, 그만큼 풀었을 때의 쾌감도 큽니다.
	</p>

	<h3>2. 발판 — 데이터에서 걸리는 부분을 찾는다</h3>
	<p>
		돌파구는 가설을 전부 소진해서가 아니라, <b>데이터 속에서 눈에 걸리는 작은 부분</b>에서 옵니다.
		이 '발판'은 대개 다섯 가지 모습으로 나타납니다.
	</p>
	<ul>
		<li><b>부분 패턴</b> — 끝자리가 3·0·3·0처럼 규칙적으로 반복될 때.</li>
		<li><b>숨은 공통 성질</b> — 예시에 나온 것들이 전부 좌우대칭이거나, 전부 짝수일 때.</li>
		<li><b>이상치</b> — 유독 큰 값 하나, 혹은 수열의 차이가 한 번만 확 튀는 지점.</li>
		<li>
			<b>구조 어긋남</b> — 윗줄은 다섯 개인데 아랫줄은 여섯 개. "번갈아 봐야 하나?" 하는 의문이
			규칙을 부릅니다.
		</li>
		<li>
			<b>지각 반전</b> — 그림·글자를 오래 보다 어느 순간 다른 형태가 '툭' 보이는 순간(시각형 문제
			전용).
		</li>
	</ul>

	<h3>3. 해금 — 발판 하나가 전체를 연다</h3>
	<p>
		발판을 짚는 순간, 규칙 전체가 한 번에 열립니다. "아, 이거 날짜였구나!", "값이 아니라 몇
		번째인지였네!" — 이 <b>해금</b>의 순간이 발견형 퍼즐의 핵심이고, 딸깍이라는 이름이 나온
		이유이기도 합니다.
	</p>

	<h3>4. 검산 — 나머지 예시로 확인한다</h3>
	<p>
		찾은 규칙을 아직 안 쓴 예시에 대입해 보세요. 전부 맞아떨어지면 확신해도 좋습니다. <b
			>좋은 문제는 답이 스스로 증명됩니다.</b
		> 규칙을 발견했다고 바로 답을 적기보다, 한 번 검산하는 습관이 실수를 줄여 줍니다.
	</p>

	<h2>자주 나오는 규칙의 결</h2>
	<p>규칙은 무한하지만, 자주 등장하는 큰 갈래를 알아 두면 방황의 방향을 잡기 쉽습니다.</p>
	<ul>
		<li>
			<b>연산 뒤에 숨기기</b> — 답이 그냥 합이나 곱이 아니라, 그 결과를 이어붙이거나 자리를 바꾼
			것. "그냥 산수"처럼 보이면 한 겹 더 의심해 보세요.
		</li>
		<li>
			<b>글자를 그림으로 보기</b> — 글자의 '뜻'이 아니라 닫힌 칸 개수·좌우대칭·획의 수 같은 '모양'이
			규칙일 때가 있습니다.
		</li>
		<li>
			<b>값이 아니라 순서·위치</b> — 숫자의 크기가 아니라 '몇 번째'인지, 어느 자리에 있는지가
			답인 경우.
		</li>
		<li>
			<b>재료 바꿔 읽기</b> — 색·요일·시계·알파벳 순번처럼, 눈앞의 재료를 다른 체계로 번역해야
			규칙이 보이는 경우.
		</li>
	</ul>

	<h2>막힐 때</h2>
	<ul>
		<li>
			<b>힌트를 하나씩 여세요.</b> 점수가 조금 깎이지만, 포기하고 나가는 것보다 훨씬 낫습니다. 힌트는
			규칙을 통째로 알려주기보다 발판 쪽으로 눈을 돌려 줍니다.
		</li>
		<li>
			<b>값의 범위를 단서로 삼으세요.</b> 결과가 작으면 큰 연산은 아닙니다. 예시에 쓰인 글자와 문제의
			글자가 다르면 산술 문제가 아닐 가능성이 높습니다 — 찍기보다 탐정처럼 소거해 나가세요.
		</li>
	</ul>

	<h2>매일 새로 열립니다</h2>
	<p>
		딸깍의 발견형 퍼즐·상식 퀴즈·성냥개비는 매일 자정(한국 시각)에 새로 열리고, 전 세계 방문자가
		<b>같은 문제</b>를 풉니다. 오늘 규칙을 하나 발견해 보세요.
	</p>

	<a class="start-cta" href="/">오늘의 딸깍 풀어보기 →</a>
</article>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 32px 28px;
		line-height: var(--lh-reading);
		font-size: 15px;
		color: var(--text);
	}
	h1 {
		font-size: 24px;
		font-weight: var(--fw-emphasis);
		letter-spacing: var(--ls-tight);
		word-break: keep-all;
	}
	.lead {
		margin-top: 14px;
		color: var(--text);
		word-break: keep-all;
	}
	h2 {
		font-size: 18px;
		font-weight: var(--fw-emphasis);
		margin: 30px 0 8px;
		color: var(--accent);
	}
	h3 {
		font-size: 15.5px;
		font-weight: var(--fw-emphasis);
		margin: 18px 0 4px;
	}
	p {
		margin-top: 8px;
		word-break: keep-all;
	}
	ul {
		margin-top: 8px;
		padding-left: 20px;
	}
	li {
		margin: 6px 0;
		word-break: keep-all;
	}
	.page :global(b) {
		font-weight: var(--fw-emphasis);
	}
	.start-cta {
		display: block;
		margin-top: 30px;
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
</style>
