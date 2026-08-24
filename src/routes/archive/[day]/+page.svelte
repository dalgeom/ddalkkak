<script lang="ts">
	import DayReview from '$lib/components/DayReview.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import type { Problem } from '$lib/problems';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	/* 검색엔진용 Quiz 구조화 데이터 — 이 페이지가 문제·정답 플래시카드형 Q&A임을 알린다 */
	const strip = (s: string) => s.replace(/<[^>]*>/g, '').trim();
	const qtext = (blocks: Problem['blocks']) =>
		blocks
			.map((b) => (b.kind === 'text' ? strip(b.html) : b.kind === 'pre' ? b.text : ''))
			.filter(Boolean)
			.join(' · ');
	/** 그날 실제 구성 — 전개도가 들어오기 전 날짜는 옛 구성 그대로 표기해야 한다 */
	const composition = $derived(
		[
			`발견형 ${data.discover.length}`,
			`상식 ${data.trivia.length}`,
			`성냥개비 ${data.match.length}`,
			...(data.cube.length ? [`전개도 ${data.cube.length}`] : []),
			'보너스 1'
		].join(' · ')
	);

	let quizLd = $derived.by(() => {
		const qs: { q: string; a: string }[] = [];
		const push = (p: Problem) => {
			const a = p.answers?.[0] ?? p.choices?.[p.answerIndex ?? -1];
			if (a) qs.push({ q: qtext(p.blocks), a: String(a) });
		};
		data.discover.forEach(push);
		data.trivia.forEach(push);
		for (const m of data.match)
			qs.push({ q: `성냥개비 퍼즐: ${m.displayed} 에서 성냥 하나만 옮겨 참인 식으로 만들기`, a: m.solution });
		for (const c of data.cube)
			qs.push({
				q: '전개도 퍼즐: 이 전개도를 접으면 어떤 주사위가 되는지 고르기',
				a: '보기 ' + ['A', 'B', 'C', 'D'][c.answer]
			});
		if (data.bonus) {
			if (data.bonus.kind === 'match')
				qs.push({
					q: `성냥개비 퍼즐: ${data.bonus.eq.displayed} 에서 성냥 하나만 옮겨 참인 식으로 만들기`,
					a: data.bonus.eq.solution
				});
			else if (data.bonus.kind === 'cube')
				qs.push({
					q: '전개도 퍼즐: 이 전개도를 접으면 어떤 주사위가 되는지 고르기',
					a: '보기 ' + ['A', 'B', 'C', 'D'][data.bonus.cube.answer]
				});
			else push(data.bonus.problem);
		}
		const ld = {
			'@context': 'https://schema.org',
			'@type': 'Quiz',
			name: `${data.label} 오늘의 딸깍 10문제`,
			inLanguage: 'ko',
			about: { '@type': 'Thing', name: '두뇌 퍼즐·상식 퀴즈' },
			hasPart: qs.map(({ q, a }) => ({
				'@type': 'Question',
				eduQuestionType: 'Flashcard',
				text: q,
				acceptedAnswer: { '@type': 'Answer', text: a }
			}))
		};
		// '<'를 이스케이프해 스크립트 태그 조기 종료를 막는다
		return JSON.stringify(ld).replace(/</g, '\\u003c');
	});
</script>

<svelte:head>
	<!-- 색인에서 뺀다. 하루치 10문제라 본문이 1,200~1,500자를 넘지 못하는데, 날마다 한 장씩
	     늘어 sitemap 78개 중 31개(40%)를 차지하고 있었다. 애드센스가 '가치가 별로 없는
	     콘텐츠'로 두 번 반려했고(8/11·8/21), 사이트에서 분량이 이 기준에 걸리는 건 여기다.
	     검색 유입도 잃지 않는다 — 3주간 랜딩 통계에 /archive/*로 들어온 세션이 0건이었다.
	     사람은 '지난 문제' 링크로만 오므로 페이지 자체는 그대로 둔다. follow는 남겨
	     여기 걸린 링크는 계속 따라가게 한다. -->
	<meta name="robots" content="noindex, follow" />
	<title>{data.label} 오늘의 딸깍 — 지난 문제</title>
	<meta
		name="description"
		content="{data.label}의 오늘의 딸깍 10문제와 정답·해설. {composition}."
	/>
	<link rel="canonical" href="https://ddalkkak.app/archive/{data.day}" />
	<meta property="og:title" content="{data.label} 오늘의 딸깍 — 지난 문제" />
	<meta
		property="og:description"
		content="{data.label}의 10문제와 정답·해설. {composition}."
	/>
	<meta property="og:url" content="https://ddalkkak.app/archive/{data.day}" />
	{@html `<script type="application/ld+json">${quizLd}</` + `script>`}
</svelte:head>

<nav class="crumb">
	<a href="/archive">← 지난 문제</a>
</nav>
<h1>{data.label}</h1>

<DayReview view={data} />

<div class="mid-ad"><AdSlot label="지난 문제" /></div>

<a class="today-cta" href="/">
	<span><Icon name="arrow" size={15} /> 오늘의 딸깍 풀러 가기</span>
</a>

<style>
	.crumb {
		padding: 4px 0 6px;
	}
	.crumb a {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
		text-decoration: none;
	}
	.crumb a:hover {
		color: var(--accent);
	}
	h1 {
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		margin-bottom: 22px;
	}
	.mid-ad {
		margin: 0;
	}
	.today-cta {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 13px 20px;
		border-radius: 14px;
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		text-decoration: none;
		font-size: var(--fs-sm);
		font-weight: var(--fw-emphasis);
		color: #1f6b41;
	}
	.today-cta:hover {
		border-color: var(--accent);
	}
</style>
