<script lang="ts">
	const CONTACT = 'hyun7219@gmail.com';
	const UPDATED = '2026년 7월 28일';
</script>

<svelte:head>
	<title>개인정보처리방침 — 딸깍</title>
	<meta
		name="description"
		content="딸깍은 회원가입 없이 이용하는 서비스로 개인 식별 정보를 수집하지 않습니다. 게임 기록은 브라우저에만 저장됩니다."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/privacy" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">개인정보처리방침</span>
		<h1>딸깍은 개인정보를<br /><b>수집하지 않습니다</b></h1>
		<p class="lead">
			회원가입도, 로그인도 없습니다. 푼 기록은 이용자의 브라우저 안에만 남고 서버로 전송되지
			않습니다.
		</p>
		<p class="updated">최종 수정 · {UPDATED}</p>
	</header>

	<!-- 한눈 요약 — 긴 조항을 읽기 전에 결론부터 -->
	<section class="sec">
		<div class="summary">
			<div class="srow ok"><span class="mark">✓</span><b>수집하지 않는 것</b><span class="d">이름 · 이메일 · 전화번호 · 계정 정보</span></div>
			<div class="srow"><span class="mark">·</span><b>브라우저에만 저장</b><span class="d">푼 문제, 진행 상태, 연속 일수</span></div>
			<div class="srow"><span class="mark">·</span><b>제3자 쿠키</b><span class="d">광고 게재 시 Google 등이 사용할 수 있음</span></div>
		</div>
	</section>

	<section class="sec">
		<h2 class="sh"><span class="n">1</span>수집하는 정보</h2>
		<div class="box">
			<p>
				딸깍은 회원가입 없이 이용하는 서비스로, 이름·이메일 등 개인 식별 정보를 직접 수집하지
				않습니다.
			</p>
			<p>
				게임 진행 상태(푼 문제 목록, 진행 위치, 연속 일수)는 이용자의 브라우저
				<b>로컬 저장소(localStorage)</b>에만 저장되며 서버로 전송되지 않습니다. 브라우저 데이터를
				삭제하면 이 기록도 함께 사라집니다.
			</p>
		</div>
	</section>

	<section class="sec">
		<h2 class="sh"><span class="n">2</span>광고 및 쿠키</h2>
		<div class="box">
			<p>본 사이트는 Google AdSense 광고를 게재할 수 있습니다.</p>
			<p>
				Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이전 방문 기록에 기반한
				광고를 표시할 수 있습니다. 자세한 내용과 수신 거부 방법은
				<a href="https://policies.google.com/technologies/ads" rel="noopener" target="_blank"
					>Google 광고 정책</a
				>에서 확인할 수 있습니다.
			</p>
		</div>
	</section>

	<section class="sec">
		<h2 class="sh"><span class="n">3</span>통계</h2>
		<div class="box">
			<p>
				서비스 개선을 위해 방문 통계 도구를 사용할 수 있으며, 이 경우 수집되는 정보는 익명화된
				이용 통계에 한합니다.
			</p>
		</div>
	</section>

	<section class="sec contact">
		<h2 class="sh plain">문의</h2>
		<p class="sub">개인정보 처리에 관한 문의는 아래로 연락해 주세요.</p>
		<a class="mail" href="mailto:{CONTACT}">{CONTACT}</a>
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
		border-radius: 999px;
		padding: 4px 11px;
	}
	h1 {
		margin: 12px 0 10px;
		font-size: 24px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		font-size: 14px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.updated {
		margin-top: 12px;
		font-size: 12px;
		color: var(--muted-2);
	}

	.sec {
		margin-top: 22px;
	}
	.summary {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.srow {
		display: grid;
		grid-template-columns: 20px 1fr;
		gap: 4px 8px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 13px 15px;
	}
	.srow .mark {
		grid-row: span 2;
		font-size: 14px;
		font-weight: 800;
		color: var(--muted-2);
		line-height: 1.4;
	}
	.srow.ok .mark {
		color: var(--accent);
	}
	.srow b {
		font-size: 14px;
	}
	.srow .d {
		font-size: 12.5px;
		color: var(--muted);
		word-break: keep-all;
	}

	.sh {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 16px;
		font-weight: 800;
		margin: 0 0 8px 2px;
	}
	.sh .n {
		width: 22px;
		height: 22px;
		flex: none;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.sh.plain {
		margin-left: 0;
		justify-content: center;
	}
	.box {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.box p {
		font-size: 13.5px;
		line-height: 1.8;
		color: var(--muted);
		word-break: keep-all;
	}
	.box p + p {
		margin-top: 10px;
	}
	.box b {
		color: var(--text);
	}
	.box a {
		color: var(--accent);
		font-weight: 700;
	}

	.contact {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 20px 18px;
		text-align: center;
	}
	.sub {
		margin: 0 0 12px;
		font-size: 13px;
		color: var(--muted);
	}
	.mail {
		display: inline-block;
		padding: 11px 18px;
		border-radius: 999px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		font-size: 15px;
		font-weight: 800;
		color: var(--text);
		text-decoration: none;
		word-break: break-all;
	}
	.mail:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	@media (min-width: 768px) {
		.cover {
			padding: 34px 30px 28px;
		}
		h1 {
			font-size: 28px;
		}
	}
</style>
