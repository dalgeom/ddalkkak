<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { parsePattern, matchWords, firstCho } from '$lib/chosungFind';
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';

	/**
	 * 초성으로 단어 찾기(2026-11-05) — 「ㅅㄱ」 · 「사ㄱ」을 넣으면 사전에서 초성이 맞는 말을 찾는다.
	 * 왜: GSC 28일 검색어에 초성 그 자체(「ㅁㅋㅅㅂㄷㅅㅅ」 · 「ㅂㅈ」 · 「ㅇㄷ」)가 노출됐다 — 풀어 줄 곳을 찾는 수요로 보인다(가설).
	 * 사전은 /kkeut과 같은 한국어기초사전 명사. 초성 퀴즈 정답 낱말은 빼 둔다(data.hide).
	 */
	let { data } = $props();

	const PAGE = 60;
	let words = $state<string[] | null>(null);
	let easy = $state<Set<string>>(new Set());
	let loadErr = $state(false);
	let q = $state('');
	let onlyEasy = $state(false);
	let shown = $state(PAGE);
	let defs = $state<Record<string, string>>({});
	const loadedDefs = new Set<number>();

	let pat = $derived(parsePattern(q));
	let all = $derived.by(() => {
		if (!words || !pat) return [];
		const e = easy;
		const ws = matchWords(words, pat);
		return [...ws.filter((w) => e.has(w)), ...ws.filter((w) => !e.has(w))];
	});
	let list = $derived(onlyEasy ? all.filter((w) => easy.has(w)) : all);
	let easyCount = $derived(all.filter((w) => easy.has(w)).length);
	let typed = $derived(q.replace(/\s+/g, '').normalize('NFC'));

	onMount(async () => {
		const p = page.url.searchParams.get('q');
		if (p) q = p.slice(0, 12);
		try {
			const res = await fetch('/kkeut/words.json');
			if (!res.ok) throw new Error(String(res.status));
			const j: { words: string[]; easy: string[] } = await res.json();
			const hide = new Set(data.hide);
			words = j.words.filter((w) => !hide.has(w));
			easy = new Set(j.easy);
		} catch {
			loadErr = true;
		}
	});

	// 찾는 말이 바뀌면 목록을 처음으로 되돌리고, 뜻풀이 조각을 받고, 주소에 남긴다
	let lastQ = '';
	$effect(() => {
		const t = typed;
		const p = pat;
		if (!words || t === lastQ) return;
		lastQ = t;
		shown = PAGE;
		if (!p) return;
		try {
			replaceState(`/chosung/find?q=${encodeURIComponent(t)}`, {});
		} catch {
			/* 첫 진입 직후에는 라우터가 아직일 수 있다 */
		}
		const n = all.length;
		track(n ? 'chosung_find_search' : 'chosung_find_none', { n, len: p.length });
		loadDefs(firstCho(p));
	});

	async function loadDefs(n: number) {
		if (loadedDefs.has(n)) return;
		loadedDefs.add(n);
		const part = await fetch(`/kkeut/defs/${n}.json`)
			.then((r) => r.json())
			.catch(() => ({}));
		defs = Object.assign({}, defs, part);
	}

	function pick(c: string) {
		q = c;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	const ld = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '초성으로 단어 찾기',
		url: 'https://ddalkkak.app/chosung/find',
		applicationCategory: 'ReferenceApplication',
		operatingSystem: 'Any',
		inLanguage: 'ko',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		description: `초성(ㅅㄱ)이나 초성과 글자를 섞어(사ㄱ) 넣으면 국립국어원 한국어기초사전 명사 ${data.total.toLocaleString()}개에서 맞는 말을 찾아 주는 무료 도구.`,
		publisher: { '@type': 'Organization', name: '딸깍', url: 'https://ddalkkak.app' }
	});
</script>

<svelte:head>
	<title>초성으로 단어 찾기 — ㅅㄱ을 넣으면 사고 · 시계 · 수건 | 딸깍</title>
	<meta
		name="description"
		content="초성만 넣으면 그 초성으로 된 낱말을 사전에서 찾아 줘요. 아는 글자를 섞어(사ㄱ) 좁힐 수도 있어요. 초성 퀴즈 만들기, 수업 낱말 모으기에. 한국어기초사전 명사 {data.total.toLocaleString()}개."
	/>
	<link rel="canonical" href="https://ddalkkak.app/chosung/find" />
	<meta property="og:title" content="초성으로 단어 찾기 | 딸깍" />
	<meta property="og:description" content="초성을 넣으면 맞는 낱말을 사전에서 찾아 줘요." />
	<meta property="og:url" content="https://ddalkkak.app/chosung/find" />
	{@html `<script type="application/ld+json">${ld}</` + `script>`}
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/chosung">초성 퀴즈</a><span aria-hidden="true">›</span><span>단어 찾기</span>
		</nav>
		<h1>초성으로<br /><b>단어 찾기</b></h1>
		<p class="lead">
			초성을 넣으면 그 초성으로 된 말을 사전에서 찾아 줘요. 아는 글자가 있으면 섞어 넣어 좁혀요 — <b>ㅅㄱ</b>은 사고 · 시계 · 수건,
			<b>사ㄱ</b>은 사건 · 사고 · 사기처럼 첫 글자가 「사」인 말만.
		</p>
	</header>

	<section class="box" aria-label="초성으로 단어 찾기">
		<label class="field">
			<span class="lab">초성 (글자를 섞어도 돼요)</span>
			<input
				type="search"
				bind:value={q}
				maxlength="12"
				placeholder="예) ㅅㄱ · ㄱㅇㅇ · 사ㄱ"
				autocomplete="off"
				enterkeyhint="search"
			/>
		</label>

		{#if loadErr}
			<p class="msg">사전을 불러오지 못했어요. 잠시 뒤 새로 고쳐 주세요.</p>
		{:else if !words}
			<p class="msg">사전을 불러오는 중…</p>
		{:else if !typed}
			<p class="msg">초성을 넣어 주세요. 한 자리에 초성 하나씩, 낱말 글자 수만큼 넣어요.</p>
		{:else if !pat}
			<p class="msg">초성(ㄱ~ㅎ)이 한 자리 이상 있어야 찾아요. ㄳ · ㄺ 같은 겹받침, 모음, 영문은 초성이 될 수 없어요.</p>
		{:else}
			<p class="sum">
				<b>{typed}</b>에 맞는 {pat.length}글자 말 <b>{all.length.toLocaleString()}</b>개
				{#if easyCount}· 쉬운 말 <b class="em">{easyCount}</b>개{/if}
			</p>
			{#if all.length}
				<label class="chk"><input type="checkbox" bind:checked={onlyEasy} onchange={() => (shown = PAGE)} /> 쉬운 말만</label>
				{#if list.length}
					<ul class="words">
						{#each list.slice(0, shown) as w (w)}
							<li>
								<span class="w">{w}</span>
								{#if easy.has(w)}<span class="badge">쉬움</span>{/if}
								{#if defs[w]}<span class="def">{defs[w]}</span>{/if}
							</li>
						{/each}
					</ul>
					{#if list.length > shown}
						<button class="more" onclick={() => (shown += PAGE)}>더 보기 ({(list.length - shown).toLocaleString()}개 남음)</button>
					{/if}
				{:else}
					<p class="msg">쉬운 말 중에는 맞는 말이 없어요. 「쉬운 말만」을 끄면 나와요.</p>
				{/if}
			{:else}
				<p class="msg">
					사전에 맞는 명사가 없어요. 글자 수가 맞는지 보세요 — 「금요일」은 ㄱㅇㅇ처럼 세 자리예요. 사람 이름 · 상품 이름 · 신조어는 이
					사전에 없어요.
				</p>
			{/if}
		{/if}
	</section>

	<section class="text">
		<h2 class="sh">이렇게 찾아요</h2>
		<ol class="steps">
			<li>낱말의 글자 수만큼 초성을 넣어요. 「ㄱㅇㅇ」은 초성이 ㄱ · ㅇ · ㅇ인 세 글자 말을 찾아요.</li>
			<li>아는 글자가 있으면 그 자리에 글자를 넣어요. 「ㄱ요ㅇ」은 가운데 글자가 「요」인 말(금요일 …)만 남겨요.</li>
			<li>된소리는 따로 봐요. ㄲ · ㄸ · ㅃ · ㅆ · ㅉ은 ㄱ · ㄷ · ㅂ · ㅅ · ㅈ과 다른 초성이에요.</li>
			<li>「쉬움」 표시는 사전이 초급 · 중급으로 매긴 말이에요. 맨 앞에 모아 두었어요.</li>
		</ol>

		<h2 class="sh">이럴 때 써요</h2>
		<p class="deep">
			<b>초성 퀴즈를 낼 때</b> — 정답 하나에 초성이 같은 말이 몇 개나 있는지 먼저 봐요. 너무 많으면 분야를 정해 주거나 글자를 하나
			열어 주면 좋아요. <b>수업에서</b> — 「ㅂㄹ으로 된 말을 모아 보자」 같은 낱말 모으기에 답지로 써요. <b>막힌 초성을 풀 때</b> —
			어디선가 본 초성 수수께끼의 답이 사전에 있는 말인지 확인해요.
		</p>

		<h2 class="sh">자주 쓰는 두 글자 초성</h2>
		<p class="deep">쉬운 두 글자 말이 많은 초성부터 {data.common.length}개를 적었어요. 누르면 그 초성으로 찾아요.</p>
		<ul class="hb">
			{#each data.common as c (c.cho)}
				<li>
					<button class="hc" onclick={() => pick(c.cho)} aria-label="{c.cho}로 찾기">{c.cho}</button>
					<span class="hn">쉬운 말 {c.n}개</span>
					<span class="hx">{c.ex.join(' · ')}</span>
				</li>
			{/each}
		</ul>

		<h2 class="sh">어떤 사전을 쓰나요</h2>
		<p class="deep">
			국립국어원 <b>한국어기초사전</b>의 명사 {data.total.toLocaleString()}개를 써요. 두 글자 이상인 한글 명사만 남겼고, 딸깍
			<a class="inl" href="/chosung">초성 퀴즈</a>의 정답 낱말은 빼 두었어요 — 퀴즈는 직접 풀어야 재미있으니까요. 뜻풀이도 같은
			사전에서 가져왔어요(CC BY-SA 2.0 KR, <a class="inl" href="/kkeut/LICENSE.txt">이용 조건</a>).
		</p>

		<h2 class="sh">직접 풀어 보기</h2>
		<p class="deep">
			찾는 것보다 맞히는 쪽이 재미있다면 <a class="inl" href="/chosung">초성 퀴즈</a>를 풀어 보세요. 동물 · 음식 · 과일과 채소 · 나라 ·
			사자성어 다섯 분야가 있고, 매일 「오늘의 초성」이 하나씩 열려요.
		</p>
	</section>

	<OtherGames />
</article>

<style>
	.box,
	.text {
		margin: 20px 0 24px;
	}
	.box {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 18px 16px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.lab {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.field input {
		font: inherit;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--text);
		background: var(--bg, transparent);
		border: 2px solid var(--border-strong);
		border-radius: 12px;
		padding: 10px 14px;
		min-height: 52px;
		width: 100%;
		box-sizing: border-box;
	}
	.field input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.msg,
	.sum {
		margin: 12px 2px 0;
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.msg {
		color: var(--muted);
	}
	.em {
		color: var(--accent);
	}
	.chk {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		min-height: 40px;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}
	.chk input {
		width: 20px;
		height: 20px;
		accent-color: var(--accent);
	}
	.words {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.words li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 8px;
		padding: 9px 2px;
		border-top: 1px solid var(--border-strong);
	}
	.w {
		font-size: 16px;
		font-weight: 800;
	}
	.badge {
		font-size: 11px;
		font-weight: 800;
		color: #fff;
		background: var(--accent);
		border-radius: 6px;
		padding: 1px 6px;
	}
	.def {
		flex-basis: 100%;
		font-size: 13px;
		line-height: 1.5;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.more {
		margin-top: 12px;
		width: 100%;
		min-height: 46px;
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		background: var(--bg, transparent);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		cursor: pointer;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 24px 0 8px 2px;
		word-break: keep-all;
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
	.hb {
		list-style: none;
		margin: 10px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 6px;
	}
	.hb li {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 8px;
		align-items: center;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		padding: 6px 8px;
		min-width: 0;
	}
	.hc {
		grid-row: span 2;
		font: inherit;
		font-size: 17px;
		font-weight: 800;
		min-width: 48px;
		min-height: 40px;
		border-radius: 8px;
		border: 0;
		background: var(--accent);
		color: #fff;
		cursor: pointer;
	}
	.hn {
		font-size: 12px;
		font-weight: 700;
	}
	.hx {
		font-size: 12px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
</style>
