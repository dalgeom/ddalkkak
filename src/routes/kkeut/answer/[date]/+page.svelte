<script lang="ts">
	import { track } from '$lib/analytics';
	/* 지난 오늘의 끝말잇기 해설(2026-11-03). 검색으로 들어온 사람이 수순과 뜻을 보고 오늘 퍼즐로 넘어간다. */
	let { data } = $props();
	/** 받침 따라 조사 — ro: 으로/로(ㄹ받침은 로), wa: 과/와 */
	const jong = (w: string) => (w.charCodeAt(w.length - 1) - 0xac00) % 28;
	const ro = (w: string) => (jong(w) === 0 || jong(w) === 8 ? '로' : '으로');
	const wa = (w: string) => (jong(w) === 0 ? '와' : '과');
	const url = $derived(`https://ddalkkak.app/kkeut/answer/${data.p.date}`);
	const head = $derived(`${data.p.date} 오늘의 끝말잇기 정답 — 「${data.p.start}」 ${data.n}수 안에 막기`);
</script>

<svelte:head>
	<title>{head} | 딸깍</title>
	<meta name="description" content="「{data.p.start}」 다음에 무엇을 내야 컴퓨터가 {data.n}수 안에 막힐까요? 정답 길 {data.p.line.join(' → ')}{wa(data.p.line[data.p.line.length - 1])} 사전 뜻풀이." />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{head} | 딸깍" />
	<meta property="og:description" content="「{data.p.start}」 다음에 무엇을 내야 컴퓨터가 {data.n}수 안에 막힐까요? 정답 길 {data.p.line.join(' → ')}{wa(data.p.line[data.p.line.length - 1])} 사전 뜻풀이." />
	<meta property="og:url" content={url} />
</svelte:head>

<article class="ans">
	<span class="kicker">오늘의 끝말잇기 해설 · {data.p.date}</span>
	<h1>「{data.p.start}」 다음, {data.n}수 안에 컴퓨터 막기</h1>
	<ol>
		<li><b>컴퓨터 · {data.p.start}</b>{#if data.defs[data.p.start]}<span>{data.defs[data.p.start]}</span>{/if}</li>
		{#each data.p.line as w, i (w)}
			<li class:me={i % 2 === 0}><b>{i % 2 === 0 ? '나' : '컴퓨터'} · {w}</b>{#if data.defs[w]}<span>{data.defs[w]}</span>{/if}</li>
		{/each}
	</ol>
	<p>마지막 말 「{data.p.line[data.p.line.length - 1]}」의 끝 글자 ‘{data.end}’{data.du ? '(두음법칙으로 바뀌는 글자 포함)' : ''}{ro(data.end)} 시작하는 명사가 사전에 없어 컴퓨터가 막혀요.
		{#if data.n > 1}컴퓨터는 가장 오래 버티는 말로 받아쳤고, 다른 길로 막아도 정답이에요.{/if}</p>
	<a class="go" href="/kkeut" onclick={() => track('kanswer_play')}>오늘의 끝말잇기 풀기 →</a>
	<nav aria-label="다른 날 해설">
		{#if data.prev}<a href="/kkeut/answer/{data.prev}">← {data.prev}</a>{/if}
		{#if data.next}<a class="nx" href="/kkeut/answer/{data.next}">{data.next} →</a>{/if}
	</nav>
	<p class="src">낱말과 뜻풀이: <a href="https://krdict.korean.go.kr" rel="noopener">한국어기초사전(국립국어원)</a>, CC BY-SA 2.0 KR</p>
</article>

<style>
	.ans { padding-bottom: 40px; line-height: var(--lh-reading); } /* 폭 · 좌우 여백은 레이아웃 .wrap이 준다 */
	.kicker { font-size: 13px; font-weight: 800; color: var(--accent); }
	h1 { font-size: 22px; margin: 6px 0 12px; overflow-wrap: anywhere; }
	ol { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	li { padding: 10px 12px; border-radius: 12px; background: var(--panel-2); }
	li.me { background: var(--panel); border: 1px solid var(--accent); }
	li span { display: block; font-size: 14px; color: var(--muted); }
	.go { display: block; margin: 18px 0; padding: 14px 16px; border-radius: 14px; background: var(--accent); color: #fff; font-weight: 800; text-decoration: none; text-align: center; }
	nav { display: flex; justify-content: space-between; }
	nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px; color: var(--accent-text); }
	.nx { margin-left: auto; }
	.src { margin-top: 24px; font-size: 12px; color: var(--muted-2); }
	.src a { color: inherit; }
</style>
