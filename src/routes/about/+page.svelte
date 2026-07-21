<svelte:head>
	<title>소개 — 딸깍</title>
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
	<h2>문제의 기준</h2>
	<p>
		모든 문제는 자체 검수 기준을 통과합니다 — 규칙은 절대 지문에 노출하지 않고, 발견하는
		순간 모든 예시가 한 번에 설명되어야 하며, 답은 유일해야 합니다. 문의·제보는
		사이트 운영자에게 남겨 주세요.
	</p>
</div>

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
		margin: 4px 0;
	}
</style>
