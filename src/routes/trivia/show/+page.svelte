<script lang="ts">
	import { onMount } from 'svelte';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';

	/**
	 * 상식 퀴즈 띄우기(2026-11-04) — 교실 TV · 모임 프로젝터에 보기 넷짜리 상식 문제를 크게 띄워 다 같이 맞히는 진행 화면.
	 * 초성 퀴즈 띄우기(/chosung/show)와 같은 틀. 문제는 deck에서 받아 온다(오늘 · 내일 출제분은 빼고).
	 * 계측: trivia_show_start → trivia_show_end(끝 장면까지), trivia_show_full(전체 화면), trivia_show_again.
	 */
	let { data } = $props();

	type Q = { id: string; category: string; grade: string; html: string; choices: string[]; answerIndex: number; explain: string };
	const SIZES = [10, 20, 30] as const;
	const MARK = ['①', '②', '③', '④'];

	let cat = $state('all');
	let grade = $state('all');
	let size = $state<number>(10);
	let deck = $state<Q[]>([]);
	let pos = $state(0);
	/** 0 문제 · 1 정답 · 2 해설 */
	let step = $state(0);
	let loading = $state(false);
	let failed = $state(false);
	let stage = $state<HTMLDivElement>();
	let canFull = $state(false);

	let presenting = $derived(!!page.state.tshow && deck.length > 0);
	let ended = $derived(pos >= deck.length);
	let cur = $derived(ended ? null : deck[pos]);
	let catName = $derived(cat === 'all' ? '전체' : (data.cats.find((c) => c.slug === cat)?.name ?? ''));

	async function fetchDeck(): Promise<Q[]> {
		const r = await fetch(`/trivia/show/deck?c=${encodeURIComponent(cat)}&g=${encodeURIComponent(grade)}&n=${size}`);
		if (!r.ok) throw new Error(String(r.status));
		return r.json();
	}

	async function start() {
		if (loading) return;
		loading = true;
		failed = false;
		try {
			deck = await fetchDeck();
			pos = 0;
			step = 0;
			pushState('', { tshow: true });
			track('trivia_show_start', { cat, grade, size });
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}

	async function again() {
		try {
			deck = await fetchDeck();
			pos = 0;
			step = 0;
			track('trivia_show_again');
		} catch {
			/* 그대로 끝 화면에 둔다 */
		}
	}

	function close() {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		if (page.state.tshow) history.back();
	}

	function forward() {
		if (ended) return;
		if (step < 2) step++;
		else next();
	}
	function next() {
		if (ended) return;
		pos++;
		step = 0;
		if (pos >= deck.length) track('trivia_show_end', { size: deck.length });
	}
	function back() {
		if (step > 0 && !ended) step--;
		else if (pos > 0) {
			pos--;
			step = 2;
		}
	}

	function full() {
		if (!stage) return;
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		else {
			stage.requestFullscreen?.().catch(() => {});
			track('trivia_show_full');
		}
	}

	function onKey(e: KeyboardEvent) {
		if (!presenting || e.altKey || e.ctrlKey || e.metaKey) return;
		// 발표용 리모컨은 PageDown · PageUp을 보낸다
		if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
			e.preventDefault();
			forward();
		} else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
			e.preventDefault();
			back();
		} else if (e.key === 'f' || e.key === 'ㄹ') full();
	}

	$effect(() => {
		document.documentElement.style.overflow = presenting ? 'hidden' : '';
		return () => (document.documentElement.style.overflow = '');
	});

	onMount(() => {
		canFull = !!document.documentElement.requestFullscreen;
		const c = page.url.searchParams.get('c');
		if (c && data.cats.some((x) => x.slug === c)) cat = c;
	});

	const ld = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '상식 퀴즈 띄우기',
		url: 'https://ddalkkak.app/trivia/show',
		applicationCategory: 'EducationalApplication',
		operatingSystem: 'Web',
		inLanguage: 'ko',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		description: '분야와 난이도를 고르면 보기 넷짜리 상식 문제가 TV · 프로젝터 화면 가득 나오고, 진행자가 눌러 정답과 해설을 차례로 여는 수업 · 모임용 진행 도구.'
	});
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
	<title>상식 퀴즈 띄우기 — 수업 · 모임에서 TV에 크게 띄워 다 같이 맞히기 | 딸깍</title>
	<meta
		name="description"
		content="분야 · 난이도 · 문제 수를 고르면 보기 넷짜리 상식 문제가 화면 가득 나와요. 진행자가 누르면 정답이, 한 번 더 누르면 해설이 열려요. 팩트체크한 객관식 {data.total}문제, 초등부터 어른까지."
	/>
	<link rel="canonical" href="https://ddalkkak.app/trivia/show" />
	<meta property="og:title" content="상식 퀴즈 띄우기 — 수업 · 모임에서 화면에 띄워 다 같이 | 딸깍" />
	<meta property="og:url" content="https://ddalkkak.app/trivia/show" />
	{@html `<script type="application/ld+json">${ld}</` + `script>`}
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/trivia">상식 퀴즈</a><span aria-hidden="true">›</span><span>화면에 띄우기</span>
		</nav>
		<h1>상식 퀴즈를<br /><b>화면에 띄워 다 같이</b></h1>
		<p class="lead">
			교실 TV나 모임 프로젝터에 보기 넷짜리 상식 문제를 크게 띄워요. 진행자가 한 번 누르면 정답이, 한 번 더 누르면 해설이
			나와요. 문제지를 만들거나 정답을 외워 둘 필요가 없어요.
		</p>
	</header>

	<section class="setup" aria-label="띄우기 설정">
		<h2 class="sh">분야</h2>
		<div class="chips" role="radiogroup" aria-label="분야">
			<button role="radio" aria-checked={cat === 'all'} class:on={cat === 'all'} onclick={() => (cat = 'all')}>
				전체 <span>{data.total}</span>
			</button>
			{#each data.cats as c (c.slug)}
				<button role="radio" aria-checked={cat === c.slug} class:on={cat === c.slug} onclick={() => (cat = c.slug)}>
					{c.name} <span>{c.count}</span>
				</button>
			{/each}
		</div>

		<h2 class="sh">난이도</h2>
		<div class="chips" role="radiogroup" aria-label="난이도">
			<button role="radio" aria-checked={grade === 'all'} class:on={grade === 'all'} onclick={() => (grade = 'all')}>골고루</button>
			{#each data.grades as g (g.name)}
				<button role="radio" aria-checked={grade === g.name} class:on={grade === g.name} onclick={() => (grade = g.name)}>
					{g.name} <span>{g.count}</span>
				</button>
			{/each}
		</div>

		<h2 class="sh">문제 수</h2>
		<div class="chips" role="radiogroup" aria-label="문제 수">
			{#each SIZES as n (n)}
				<button role="radio" aria-checked={size === n} class:on={size === n} onclick={() => (size = n)}>{n}문제</button>
			{/each}
		</div>

		<button class="cta" onclick={start} disabled={loading}>
			{loading ? '문제 섞는 중…' : `${catName} ${size}문제 띄우기`} <span aria-hidden="true">→</span>
		</button>
		{#if failed}<p class="err" role="alert">문제를 받아 오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>{/if}
		<p class="sub">오늘과 내일의 10문제에 든 상식은 빼고 뽑아요. 고른 분야에 그 난이도가 모자라면 다른 난이도도 섞어요.</p>
	</section>

	<section class="sec">
		<h2 class="sh">이렇게 진행해요</h2>
		<ol class="steps">
			<li><b>문제와 보기 넷을 보여 주기.</b> 손을 들거나 ①~④를 손가락으로 펴서 답하게 해요.</li>
			<li><b>정답 공개.</b> 화면 아무 곳이나 누르거나 오른쪽 화살표 · 스페이스를 누르면 정답 보기에 불이 들어와요.</li>
			<li><b>해설 한 줄.</b> 한 번 더 누르면 왜 그런지가 열려요. 수업이라면 여기서 이야기를 조금 덧붙이기 좋아요.</li>
			<li><b>다음 문제.</b> 끝까지 가면 몇 문제를 했는지 보여 주고, 같은 설정으로 새로 섞을 수 있어요.</li>
		</ol>
		<p class="deep">
			노트북을 TV에 연결했다면 전체 화면 버튼(또는 F 키)을 누르세요. 발표용 리모컨의 다음 · 이전 버튼도 그대로 먹어요.
			진행을 멈추려면 「끝내기」나 뒤로가기를 누르면 설정 화면으로 돌아와요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">수업 · 모임에 맞게 고르는 법</h2>
		<p class="deep">
			난이도는 학년이 아니라 <b>「그 나이에 처음 보고 맞힐 수 있나」</b>로 매겼어요. 초등은 교과서와 생활에서 한 번쯤 들어 본 것,
			중등은 수업에서 배운 것을 한 번 더 꼬아 생각해야 하는 것, 고등과 어른은 알고 있어도 보기 둘이 헷갈리게 만든 것이에요.
			가족 모임처럼 나이가 섞였다면 <b>골고루</b>를 고르세요. 뽑은 문제 안에서는 쉬운 것부터 나와서 아이들이 먼저 맞히는
			분위기로 시작할 수 있어요.
		</p>
		<p class="deep">
			분야는 수업과 엮어 고르기 좋아요. 한국사 · 세계사는 사회 시간 복습으로, 맞춤법 · 속담 · 사자성어는 국어 시간 쉬는
			10분에, 과학 · 우주 · 동물은 과학 시간 시작 전에 써 보세요. 모든 문제는 출처로 사실을 한 번 더 확인한 뒤에 넣었어요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">팀 대항으로 할 때</h2>
		<p class="deep">
			팀마다 ①~④ 카드를 한 장씩 들고 「하나 둘 셋」에 동시에 들게 하면, 먼저 외친 팀이 정답을 흘리는 일이 없어요. 맞힌 팀은
			1점, 어른 난이도는 2점으로 두면 마지막까지 역전이 나와요. 해설이 열리는 순간 「아, 그래서였구나」가 나오면 그 문제는
			성공이에요.
		</p>
		<p class="deep">
			혼자 풀어 보고 싶은 사람은 <a class="inl" href="/trivia">상식 퀴즈</a>에서 분야별로 풀 수 있고, 친구와 같은 10문제로 겨루려면
			<a class="inl" href="/trivia/duel">상식 대결</a>을 보내 보세요. 초성으로 맞히는 진행은
			<a class="inl" href="/chosung/show">초성 퀴즈 띄우기</a>, 다른 도구는 <a class="inl" href="/tools">딸깍 도구 모음</a>에 있어요.
		</p>
	</section>

	<OtherGames current="trivia" />
</article>

{#if presenting}
	<div class="stage" bind:this={stage} role="dialog" aria-modal="true" aria-label="상식 퀴즈 진행 화면">
		<div class="bar">
			<span class="pos">{ended ? '끝' : `${pos + 1} / ${deck.length}`} · {cur ? `${cur.category} · ${cur.grade}` : catName}</span>
			<span class="tools">
				{#if canFull}<button class="tool" onclick={full}>전체 화면</button>{/if}
				<button class="tool" onclick={close}>끝내기</button>
			</span>
		</div>

		{#if cur}
			<button class="board" onclick={forward} aria-label="다음 단계로">
				<span class="q">{@html cur.html}</span>
				<span class="opts">
					{#each cur.choices as ch, i (i)}
						<span class="opt" class:right={step >= 1 && i === cur.answerIndex} class:dim={step >= 1 && i !== cur.answerIndex}>
							<b>{MARK[i]}</b>{ch}
						</span>
					{/each}
				</span>
				<span class="exp" class:show={step >= 2}>{@html cur.explain}</span>
			</button>
			<div class="ctl">
				<button class="c" onclick={back} disabled={pos === 0 && step === 0}>← 이전</button>
				<button class="c" onclick={() => (step = Math.max(step, 1))} disabled={step >= 1}>정답</button>
				<button class="c" onclick={() => (step = 2)} disabled={step >= 2}>해설</button>
				<button class="c go" onclick={next}>{pos === deck.length - 1 ? '끝내기' : '다음'} →</button>
			</div>
		{:else}
			<div class="end">
				<p class="big">{deck.length}문제 끝!</p>
				<p class="small">같은 설정으로 새로 섞거나, 분야를 바꿔 다시 띄워 보세요.</p>
				<div class="ctl">
					<button class="c" onclick={back}>← 마지막 문제</button>
					<button class="c go" onclick={again}>새로 섞기</button>
					<button class="c" onclick={close}>설정 바꾸기</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 8px 2px;
		word-break: keep-all;
	}
	.sub,
	.err {
		margin: 10px 2px 0;
		font-size: 13px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.err {
		color: var(--danger, #c0392b);
		font-weight: 700;
	}
	.setup {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 18px 16px;
		margin: 20px 0 24px;
	}
	.setup .sh:not(:first-child) {
		margin-top: 16px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chips button {
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		background: var(--bg, transparent);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		padding: 8px 12px;
		min-height: 40px;
		cursor: pointer;
	}
	.chips button span {
		color: var(--muted);
		font-weight: 600;
		margin-left: 2px;
	}
	.chips button.on {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	.chips button.on span {
		color: #fff;
		opacity: 0.85;
	}
	.cta {
		margin-top: 18px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border: 0;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font: inherit;
		font-size: 15.5px;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:disabled {
		opacity: 0.7;
		cursor: default;
	}
	.steps {
		margin: 0;
		padding-left: 22px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 14px;
		line-height: 1.8;
		word-break: keep-all;
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
	.deep b {
		color: var(--text);
	}

	/* 진행 화면 — 헤더 · 하단 탭 위를 덮는다(탭 40 · 시트 60 · 스플래시 200) */
	.stage {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--bg, #fbf7ef);
		color: var(--text);
		display: flex;
		flex-direction: column;
		padding: max(12px, env(safe-area-inset-top)) 16px max(14px, env(safe-area-inset-bottom));
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: max(15px, 2.6vh);
		font-weight: 800;
		color: var(--muted);
	}
	.pos {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tools {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}
	.tool {
		min-height: 44px;
		padding: 0 14px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font: inherit;
		font-size: max(14px, 2.4vh);
		font-weight: 800;
		cursor: pointer;
		white-space: nowrap;
	}
	.board {
		flex: 1;
		min-height: 0;
		overflow: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2.4vh;
		background: none;
		border: 0;
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: center;
		padding: 8px 0;
	}
	.q {
		font-size: clamp(20px, min(6vw, 6vh), 64px);
		font-weight: 900;
		line-height: 1.4;
		word-break: keep-all;
		max-width: 1100px;
	}
	.opts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.4vh 12px;
		width: min(100%, 1100px);
	}
	.opt {
		display: flex;
		align-items: center;
		gap: 0.5em;
		text-align: left;
		padding: 1.6vh 14px;
		min-height: 48px;
		border-radius: 14px;
		border: 2px solid var(--border-strong);
		background: var(--panel);
		font-size: clamp(16px, min(4.2vw, 4.2vh), 44px);
		font-weight: 800;
		line-height: 1.3;
		word-break: keep-all;
		transition: opacity 0.2s;
	}
	.opt b {
		color: var(--muted);
		flex-shrink: 0;
	}
	.opt.right {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	.opt.right b {
		color: #fff;
	}
	.opt.dim {
		opacity: 0.35;
	}
	.exp {
		visibility: hidden;
		max-width: min(100%, 1100px);
		font-size: clamp(14px, min(3.6vw, 3.2vh), 32px);
		line-height: 1.6;
		font-weight: 600;
		color: var(--muted);
		word-break: keep-all;
	}
	.exp.show {
		visibility: visible;
	}
	.ctl {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.end .ctl {
		grid-template-columns: repeat(3, 1fr);
		width: min(100%, 560px);
	}
	.c {
		min-height: 50px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font: inherit;
		font-size: 15px;
		font-weight: 800;
		cursor: pointer;
		word-break: keep-all;
	}
	.c:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.c.go {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.end {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-align: center;
	}
	.end .big {
		margin: 0;
		font-size: min(12vw, 12vh);
		font-weight: 900;
	}
	.end .small {
		margin: 0 0 8px;
		font-size: 15px;
		color: var(--muted);
		word-break: keep-all;
	}
	@media (max-width: 420px) {
		.opts {
			grid-template-columns: 1fr;
		}
	}
</style>
