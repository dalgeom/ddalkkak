<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { makeDict, movesFrom, startsFor, dueum, last, type Dict } from '$lib/kkeut';
	import { track } from '$lib/analytics';
	import OtherGames from '$lib/components/OtherGames.svelte';

	/**
	 * 끝말잇기 단어 찾기(2026-11-04) — 「○으로 시작하는 말」을 사전에서 찾아 준다.
	 * 끝말잇기를 하다 막혔을 때, 수업에서 낱말을 모을 때 쓰는 도구. 한방 단어(받을 말이 없는 말)는 따로 표시한다.
	 * 사전은 /kkeut과 같은 한국어기초사전 명사(static/kkeut/words.json).
	 */
	let { data } = $props();

	const PAGE = 60;
	let dict = $state<Dict | null>(null);
	let loadErr = $state(false);
	let q = $state('');
	let only = $state<'all' | 'hanbang' | 'easy'>('all');
	let shown = $state(PAGE);
	let defs = $state<Record<string, string>>({});

	const BASE = 0xac00;
	const isSyl = (c: string) => {
		const o = c.charCodeAt(0) - BASE;
		return o >= 0 && o <= 11171;
	};

	/** 입력한 말의 끝 글자 — 「사과」를 넣으면 「과」로 시작하는 말을 찾는다 */
	let key = $derived.by(() => {
		const s = [...q.replace(/\s+/g, '').normalize('NFC')].filter(isSyl);
		return s.length ? s[s.length - 1] : '';
	});
	let starts = $derived(key ? startsFor(key) : []);
	let all = $derived.by(() => {
		if (!dict || !key) return [];
		const d = dict;
		const ws = movesFrom(d, key);
		const isHan = (w: string) => movesFrom(d, last(w)).length === 0;
		const rows = ws.map((w) => ({ w, han: isHan(w), easy: d.easy.has(w) }));
		// 한방 단어 먼저, 그다음 쉬운 말, 짧은 말 먼저
		rows.sort((a, b) => Number(b.han) - Number(a.han) || Number(b.easy) - Number(a.easy) || a.w.length - b.w.length);
		return rows;
	});
	let list = $derived(only === 'hanbang' ? all.filter((r) => r.han) : only === 'easy' ? all.filter((r) => r.easy) : all);
	let hanCount = $derived(all.filter((r) => r.han).length);

	onMount(async () => {
		const p = page.url.searchParams.get('q');
		if (p) q = p.slice(0, 20);
		try {
			const res = await fetch('/kkeut/words.json');
			if (!res.ok) throw new Error(String(res.status));
			const j = await res.json();
			dict = makeDict(j.words, j.easy);
		} catch {
			loadErr = true;
		}
	});

	// 글자가 바뀌면 목록을 처음으로 되돌리고, 뜻풀이 조각을 받고, 주소에 남긴다
	let lastKey = '';
	$effect(() => {
		const k = key;
		if (!dict || k === lastKey) return;
		lastKey = k;
		shown = PAGE;
		if (!k) return;
		try {
			replaceState(`/kkeut/words?q=${encodeURIComponent(k)}`, {});
		} catch {
			/* 첫 진입 직후에는 라우터가 아직일 수 있다 */
		}
		const n = all.length;
		track(n ? 'kkeut_words_search' : 'kkeut_words_none', { n, hanbang: hanCount });
		loadDefs(startsFor(k));
	});

	async function loadDefs(cs: string[]) {
		const need = [...new Set(cs.map((c) => Math.floor((c.charCodeAt(0) - BASE) / 588)))];
		const parts = await Promise.all(need.map((n) => fetch(`/kkeut/defs/${n}.json`).then((r) => r.json()).catch(() => ({}))));
		defs = Object.assign({}, defs, ...parts);
	}

	function pick(c: string) {
		q = c;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	const ld = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '끝말잇기 단어 찾기',
		url: 'https://ddalkkak.app/kkeut/words',
		applicationCategory: 'ReferenceApplication',
		operatingSystem: 'Any',
		inLanguage: 'ko',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		description: `국립국어원 한국어기초사전 명사 ${data.total.toLocaleString()}개에서 끝말잇기로 이을 말을 찾아 주는 무료 도구. 두음법칙을 함께 따지고 한방 단어를 따로 표시한다.`,
		publisher: { '@type': 'Organization', name: '딸깍', url: 'https://ddalkkak.app' }
	});
</script>

<svelte:head>
	<title>끝말잇기 단어 찾기 — ○으로 시작하는 말 · 한방 단어 목록 | 딸깍</title>
	<meta
		name="description"
		content="글자나 낱말을 넣으면 끝말잇기로 이을 말을 사전에서 찾아 줘요. 두음법칙(력→역, 리→이)도 함께 따지고, 받을 말이 없는 한방 단어는 따로 표시해요. 한국어기초사전 명사 {data.total.toLocaleString()}개."
	/>
	<link rel="canonical" href="https://ddalkkak.app/kkeut/words" />
	<meta property="og:title" content="끝말잇기 단어 찾기 — 이을 말 · 한방 단어 | 딸깍" />
	<meta property="og:description" content="글자를 넣으면 이을 말과 한방 단어를 사전에서 찾아 줘요." />
	<meta property="og:url" content="https://ddalkkak.app/kkeut/words" />
	{@html `<script type="application/ld+json">${ld}</` + `script>`}
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/kkeut">끝말잇기</a><span aria-hidden="true">›</span><span>단어 찾기</span>
		</nav>
		<h1>끝말잇기<br /><b>단어 찾기</b></h1>
		<p class="lead">
			막힌 글자를 넣으면 그 글자로 시작하는 말을 사전에서 찾아 줘요. 낱말을 통째로 넣으면 끝 글자로 찾아요. 받을 말이 없는
			<b>한방 단어</b>는 맨 앞에 따로 표시해요.
		</p>
	</header>

	<section class="box" aria-label="단어 찾기">
		<label class="field">
			<span class="lab">글자 또는 낱말</span>
			<input
				type="search"
				bind:value={q}
				maxlength="20"
				placeholder="예) 력 · 사과 · 늄"
				autocomplete="off"
				enterkeyhint="search"
			/>
		</label>

		{#if loadErr}
			<p class="msg">사전을 불러오지 못했어요. 잠시 뒤 새로 고쳐 주세요.</p>
		{:else if !dict}
			<p class="msg">사전을 불러오는 중…</p>
		{:else if !key}
			<p class="msg">한글 글자를 넣어 주세요. 예를 들어 「력」을 넣으면 력 · 역으로 시작하는 말이 나와요.</p>
		{:else}
			<p class="sum">
				<b>「{starts.join('」 · 「')}」</b>로 시작하는 말 <b>{all.length.toLocaleString()}</b>개
				{#if hanCount}· 한방 단어 <b class="han-n">{hanCount}</b>개{/if}
			</p>
			{#if dueum(key)}
				<p class="note">두음법칙으로 「{key}」 대신 「{dueum(key)}」로 시작해도 돼요.</p>
			{/if}

			{#if all.length}
				<div class="tabs" role="radiogroup" aria-label="보기">
					<button role="radio" aria-checked={only === 'all'} class:on={only === 'all'} onclick={() => ((only = 'all'), (shown = PAGE))}>전체</button>
					<button role="radio" aria-checked={only === 'hanbang'} class:on={only === 'hanbang'} onclick={() => ((only = 'hanbang'), (shown = PAGE))}>한방 단어만</button>
					<button role="radio" aria-checked={only === 'easy'} class:on={only === 'easy'} onclick={() => ((only = 'easy'), (shown = PAGE))}>쉬운 말만</button>
				</div>
				{#if list.length}
					<ul class="words">
						{#each list.slice(0, shown) as r (r.w)}
							<li>
								<span class="w">{r.w}</span>
								{#if r.han}<span class="badge">한방</span>{/if}
								{#if defs[r.w]}<span class="def">{defs[r.w]}</span>{/if}
							</li>
						{/each}
					</ul>
					{#if list.length > shown}
						<button class="more" onclick={() => (shown += PAGE)}>더 보기 ({(list.length - shown).toLocaleString()}개 남음)</button>
					{/if}
				{:else}
					<p class="msg">이 보기에 맞는 말이 없어요.</p>
				{/if}
			{:else}
				<p class="msg">
					사전에 「{key}」로 시작하는 명사가 없어요. 끝말잇기에서 이 글자로 끝나는 말을 내면 상대가 받을 수 없어요 — 「{key}」는 한방
					끝 글자예요.
				</p>
			{/if}
		{/if}
	</section>

	<section class="text">
		<h2 class="sh">이렇게 찾아요</h2>
		<ol class="steps">
			<li>상대가 낸 말을 그대로 넣거나, 끝 글자 하나만 넣어요. 「사과」를 넣으면 「과」로 시작하는 말을 찾아요.</li>
			<li>
				두음법칙이 걸리는 글자는 두 가지를 함께 찾아요. 「력」으로 끝나면 「력」과 「역」, 「리」로 끝나면 「리」와 「이」로 시작하는 말이
				모두 나와요.
			</li>
			<li>
				<b>한방</b> 표시가 붙은 말은 끝 글자로 시작하는 말이 사전에 없어요. 내면 상대가 받을 수 없는 말이에요. 「한방 단어만」을 누르면
				그것만 모아 봐요.
			</li>
			<li>「쉬운 말만」은 사전이 초급 · 중급으로 매긴 낱말만 남겨요. 수업에서 낱말 카드를 만들 때 좋아요.</li>
		</ol>

		<h2 class="sh">어떤 사전을 쓰나요</h2>
		<p class="deep">
			국립국어원 <b>한국어기초사전</b>의 명사 {data.total.toLocaleString()}개를 써요. 두 글자 이상인 한글 명사만 남겼어요. 기초사전이라
			큰 국어사전에 있는 말이 여기 없을 수 있어요 — 모임에서 할 때는 「이 사전에 있는 말만」으로 정해 두면
			다툼이 줄어요. 뜻풀이도 같은 사전에서 가져왔어요(CC BY-SA 2.0 KR, <a class="inl" href="/kkeut/LICENSE.txt">이용 조건</a>).
		</p>

		<h2 class="sh">한방 끝 글자 {data.hanbang.length}개</h2>
		<p class="deep">
			아래 글자로 끝나는 말은 이 사전에서 받을 말이 없어요. 모두 {data.hanbangWords.toLocaleString()}개 — 사전 명사의
			{((data.hanbangWords / data.total) * 100).toFixed(1)}%예요. 많이 나오는 글자부터 적었고, 글자를 누르면 그 글자로 끝나는 말이
			아니라 <b>그 글자로 시작하는 말</b>을 찾아요(없다는 것을 확인할 수 있어요).
		</p>
		<ul class="hb">
			{#each data.hanbang as h (h.c)}
				<li>
					<button class="hc" onclick={() => pick(h.c)} aria-label="{h.c}로 시작하는 말 찾기">{h.c}</button>
					<span class="hn">{h.n}개</span>
					<span class="hx">{h.ex.join(' · ')}</span>
				</li>
			{/each}
		</ul>

		<h2 class="sh">직접 겨뤄 보기</h2>
		<p class="deep">
			찾은 말로 <a class="inl" href="/kkeut">컴퓨터와 끝말잇기</a>를 해 보세요. 새싹부터 고수까지 다섯 단계가 있고, 매일 「몇 수 안에
			컴퓨터를 막아라」 퍼즐이 새로 열려요.
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
	.sum,
	.note {
		margin: 12px 2px 0;
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.msg,
	.note {
		color: var(--muted);
	}
	.note {
		margin-top: 4px;
		font-size: 13px;
	}
	.han-n {
		color: var(--accent);
	}
	.tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		margin-top: 12px;
	}
	.tabs button {
		font: inherit;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text);
		background: var(--bg, transparent);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		min-height: 40px;
		cursor: pointer;
		word-break: keep-all;
	}
	.tabs button.on {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	.words {
		list-style: none;
		margin: 12px 0 0;
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
		font-size: 20px;
		font-weight: 800;
		min-width: 40px;
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
