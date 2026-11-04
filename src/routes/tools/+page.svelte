<script lang="ts">
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import { CHOSUNG_WORDS } from '$lib/chosung';
	import { TRIVIA } from '$lib/trivia';
	import { KKEUT_WORDS } from '$lib/data/kkeutMeta';
	import { MATCH_ANSWERS } from '$lib/matchAnswers';

	/*
	 * 도구 모음(2026-11-04) — 매일 10문제 말고 「쓰는」 것들을 한 쪽에 모은다.
	 * 왜: 애드센스가 세 번 「가치 없는 콘텐츠」로 반려했다. 띄우기 · 정답 찾기 · 문제 만들기 · 학습지는 쪽마다 흩어져 있어
	 * 사람도 크롤러도 「딸깍은 도구도 있는 곳」으로 묶어 보지 못한다. 쓰임새(큰 화면 · 종이 · 찾기 · 겨루기)로 나눠 보여 준다.
	 * 계측: tools_go(어느 도구를 눌렀나)
	 */

	type Tool = { href: string; name: string; line: string; who: string };
	const GROUPS: { title: string; desc: string; tools: Tool[] }[] = [
		{
			title: 'TV · 프로젝터에 띄우기',
			desc: '수업 · 모임 · 레크리에이션에서 큰 화면에 띄우고 진행자가 눌러 넘겨요. 발표용 리모컨(→ 키)으로도 넘어가요.',
			tools: [
				{
					href: '/chosung/show',
					name: '초성 퀴즈 띄우기',
					line: `${CHOSUNG_WORDS.length.toLocaleString()}낱말에서 분야 · 난이도 · 문제 수를 골라 초성을 크게 띄워요. 누를 때마다 힌트 → 정답.`,
					who: '국어 시간 · 아이스브레이킹 · 경로당'
				},
				{
					href: '/trivia/show',
					name: '상식 퀴즈 띄우기',
					line: `상식 ${TRIVIA.length.toLocaleString()}문제에서 분야를 골라 보기 넷짜리 퀴즈를 띄워요. 누르면 정답, 한 번 더 누르면 해설.`,
					who: '골든벨 · 회식 · 가족 모임'
				},
				{
					href: '/matchstick/make',
					name: '성냥개비 문제 만들기',
					line: '맞는 식을 넣으면 성냥 하나를 옮기거나 빼거나 더한 문제를 만들어 줘요. 답이 하나뿐인 문제를 골라 크게 띄워요.',
					who: '수학 시간 · 방과 후 · 두뇌 훈련'
				}
			]
		},
		{
			title: '종이로 뽑기',
			desc: '화면이 없는 곳에서는 종이가 편해요. 문제 장과 답 장이 따로 나와요.',
			tools: [
				{
					href: '/print',
					name: '학습지 만들기',
					line: '초성 퀴즈 · 성냥개비 문제를 A4 학습지로 인쇄해요. 둘째 장에 답이 붙고, PDF로 저장할 수도 있어요.',
					who: '돌봄 교실 · 복지관 · 숙제'
				}
			]
		},
		{
			title: '찾아보기 · 풀어 보기',
			desc: '어디서 본 문제가 막혔을 때, 끝말잇기에서 이을 말이 안 떠오를 때.',
			tools: [
				{
					href: '/matchstick/solve',
					name: '성냥개비 정답 찾기',
					line: '어디서 본 성냥개비 식을 넣으면 답을 모두 찾아 그림으로 보여 줘요. 두 자리 수 · 2개 옮기기도 돼요.',
					who: '숙제 · 단톡방 문제 · 퍼즐 책'
				},
				{
					href: '/matchstick/answer',
					name: '자주 찾는 성냥 식 정답',
					line: `많이 검색되는 성냥개비 식 ${MATCH_ANSWERS.length}개의 답과 풀이를 손으로 정리했어요.`,
					who: '검색해서 답만 빨리 볼 때'
				},
				{
					href: '/kkeut/words',
					name: '끝말잇기 단어 찾기',
					line: `사전 명사 ${KKEUT_WORDS.toLocaleString()}개에서 「력」 · 「름」처럼 막힌 글자로 시작하는 말을 찾아 줘요. 한방 단어도 따로 보여요.`,
					who: '끝말잇기 · 국어 공부'
				}
			]
		},
		{
			title: '친구와 겨루기',
			desc: '같은 문제를 풀고 결과 링크를 보내면 친구가 똑같은 문제로 겨뤄요. 가입은 필요 없어요.',
			tools: [
				{
					href: '/trivia/duel',
					name: '상식 퀴즈 대결',
					line: '상식 10문제를 풀고 링크를 보내면 친구와 점수를 비교해요.',
					who: '단톡방 · 친구 · 가족'
				},
				{
					href: '/matchstick/duel',
					name: '성냥개비 대결',
					line: '성냥 하나만 옮기는 5문제를 누가 더 빨리 푸는지 겨뤄요.',
					who: '단톡방 · 친구 · 가족'
				}
			]
		}
	];
	const ALL = GROUPS.flatMap((g) => g.tools);

	const ld = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: '딸깍 도구 모음',
		url: 'https://ddalkkak.app/tools',
		inLanguage: 'ko',
		description: '수업 · 모임에서 쓰는 무료 퀴즈 도구 모음 — 초성 · 상식 퀴즈 띄우기, 성냥개비 문제 만들기 · 정답 찾기, 학습지 인쇄, 끝말잇기 단어 찾기.',
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: ALL.map((t, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: t.name,
				url: `https://ddalkkak.app${t.href}`
			}))
		}
	});
</script>

<svelte:head>
	<title>무료 퀴즈 도구 모음 — 초성 · 상식 퀴즈 띄우기, 성냥개비 문제 만들기, 학습지 인쇄 | 딸깍</title>
	<meta
		name="description"
		content="수업 · 모임에서 바로 쓰는 무료 퀴즈 도구 {ALL.length}가지. TV · 프로젝터에 초성 · 상식 퀴즈 띄우기, 성냥개비 문제 만들기와 정답 찾기, A4 학습지 인쇄, 끝말잇기 단어 찾기. 가입 없이 브라우저에서."
	/>
	<link rel="canonical" href="https://ddalkkak.app/tools" />
	<meta property="og:title" content="딸깍 도구 모음 — 수업 · 모임용 무료 퀴즈 도구" />
	<meta property="og:url" content="https://ddalkkak.app/tools" />
	{@html `<script type="application/ld+json">${ld}</` + `script>`}
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/">딸깍</a><span aria-hidden="true">›</span><span>도구 모음</span>
		</nav>
		<h1>풀기만 하지 않고<br /><b>쓰는 딸깍</b></h1>
		<p class="lead">
			매일 10문제 말고도, 수업 · 모임 · 숙제에 그대로 쓰는 도구가 {ALL.length}가지 있어요. 모두 무료고 가입 없이 브라우저에서 바로
			열려요.
		</p>
	</header>

	{#each GROUPS as g (g.title)}
		<section class="grp">
			<h2 class="sh">{g.title}</h2>
			<p class="gd">{g.desc}</p>
			<ul class="tl">
				{#each g.tools as t (t.href)}
					<li>
						<a href={t.href} onclick={() => track('tools_go', { to: t.href })}>
							<b>{t.name} <span aria-hidden="true">→</span></b>
							<span class="ln">{t.line}</span>
							<span class="who">{t.who}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<section class="grp">
		<h2 class="sh">문제는 어디서 오나요</h2>
		<p class="deep">
			도구에 나오는 초성 낱말 · 상식 문제는 매일 10문제와 같은 은행에서 나와요. 하나씩 검수하고, 사실은 출처로 확인하고,
			공개 하루 전에 직접 풀어 보며 고쳐요(<a href="/news/fixes">다듬은 기록</a>). 성냥개비 문제는 맞는 식에서 기계로 만들지만, 답이
			여러 개인 문제는 걸러 내 「답이 하나뿐인」 것만 내놓아요. 끝말잇기 단어는 국립국어원 사전의 명사에서 골랐어요.
		</p>
		<p class="deep">
			쓰다가 불편한 점이 있거나 있었으면 하는 도구가 떠오르면 위쪽 「의견」으로 알려 주세요.
			딸깍이 어떤 곳인지는 <a href="/about">소개</a>에 적어 두었어요.
		</p>
	</section>

	<OtherGames />
</article>

<style>
	.grp {
		margin: 22px 0 26px;
	}
	.sh {
		font-size: 18px;
		font-weight: 800;
		margin: 0 0 4px 2px;
		word-break: keep-all;
	}
	.gd {
		margin: 0 2px 10px;
		font-size: 13.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.tl {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.tl a {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		color: var(--text);
		text-decoration: none;
	}
	.tl a:hover {
		border-color: var(--accent);
	}
	.tl b {
		font-size: 16px;
		font-weight: 800;
		color: var(--accent);
	}
	.ln {
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.who {
		font-size: 12.5px;
		color: var(--muted);
	}
	.deep {
		margin-top: 10px;
		font-size: 14px;
		line-height: 1.85;
		color: var(--muted);
		word-break: keep-all;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 15px 16px;
	}
</style>
