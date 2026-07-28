<script lang="ts">
	const CONTACT = 'hyun7219@gmail.com';
	const UPDATED = '2026년 7월 28일';

	const ARTICLES = [
		{
			n: 1,
			t: '목적',
			body: ['본 약관은 딸깍(이하 "서비스")이 제공하는 두뇌 퍼즐·퀴즈 게임의 이용 조건과 절차를 정합니다.']
		},
		{
			n: 2,
			t: '서비스 내용',
			body: [
				'딸깍은 회원가입 없이 누구나 무료로 이용할 수 있는 웹 게임 서비스입니다.',
				'오늘의 10문제, 무한 연습, 성냥개비 등의 콘텐츠를 제공하며, 게임 진행 기록은 이용자의 브라우저에만 저장됩니다.'
			]
		},
		{
			n: 3,
			t: '이용자의 의무',
			body: [
				'이용자는 서비스를 정상적인 방법으로 이용해야 하며, 서비스의 운영을 방해하거나 다른 이용자에게 피해를 주는 행위를 해서는 안 됩니다.'
			]
		},
		{
			n: 4,
			t: '콘텐츠 저작권',
			body: [
				'서비스가 제공하는 문제·해설·디자인 등 모든 콘텐츠의 저작권은 서비스 운영자에게 있습니다. 무단 복제·배포를 금합니다.'
			]
		},
		{
			n: 5,
			t: '광고',
			body: ['서비스는 Google AdSense 등 제3자 광고를 게재할 수 있습니다.'],
			link: { href: '/privacy', text: '광고 관련 사항은 개인정보처리방침에서 확인하세요' }
		},
		{
			n: 6,
			t: '책임의 한계',
			body: [
				'서비스는 무료로 제공되며, 게임 기록의 손실(브라우저 캐시 삭제·기기 변경 등)에 대해 책임지지 않습니다.'
			]
		}
	];
</script>

<svelte:head>
	<title>이용약관 — 딸깍</title>
	<meta
		name="description"
		content="딸깍 이용약관. 회원가입 없이 무료로 이용할 수 있는 두뇌 퍼즐 서비스의 이용 조건입니다."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/terms" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">이용약관</span>
		<h1>가입도, 결제도 없는<br /><b>무료 서비스입니다</b></h1>
		<p class="lead">
			딸깍을 이용하실 때 알아 두실 내용을 정리했습니다. 어려운 말은 최대한 덜어냈습니다.
		</p>
		<p class="updated">최종 수정 · {UPDATED}</p>
	</header>

	<section class="sec">
		<div class="arts">
			{#each ARTICLES as a (a.n)}
				<div class="art">
					<div class="ah"><span class="n">{a.n}</span><b>{a.t}</b></div>
					{#each a.body as p, i (i)}
						<p>{p}</p>
					{/each}
					{#if a.link}
						<a class="ilink" href={a.link.href}>{a.link.text} →</a>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<section class="sec contact">
		<h2 class="sh">문의</h2>
		<p class="sub">서비스 이용에 관한 문의는 아래로 연락해 주세요.</p>
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
	.arts {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.art {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.ah {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-bottom: 9px;
	}
	.ah .n {
		width: 22px;
		height: 22px;
		flex: none;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ah b {
		font-size: 15px;
	}
	.art p {
		font-size: 13.5px;
		line-height: 1.8;
		color: var(--muted);
		word-break: keep-all;
	}
	.art p + p {
		margin-top: 8px;
	}
	.ilink {
		display: inline-block;
		margin-top: 10px;
		font-size: 13px;
		font-weight: 700;
		color: var(--accent);
		text-decoration: none;
	}
	.ilink:hover {
		text-decoration: underline;
	}

	.contact {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 20px 18px;
		text-align: center;
	}
	.sh {
		font-size: 16px;
		font-weight: 800;
		margin: 0 0 6px;
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
