<script lang="ts">
	import { track } from '$lib/analytics';
	/* 지난 오늘의 낱말퍼즐 해설(2026-11-17). 검색으로 들어온 사람이 정답 판과 뜻을 보고 오늘 판으로 넘어간다. */
	let { data } = $props();
	const url = $derived(`https://ddalkkak.app/crossword/answer/${data.p.date}`);
	const head = $derived(`${data.p.date} 오늘의 가로세로 낱말퍼즐 정답과 뜻풀이`);
	const across = $derived(data.words.filter((w) => w.dir === 'across'));
	const down = $derived(data.words.filter((w) => w.dir === 'down'));
	const desc = $derived(`가로 ${across.map((w) => w.answer).join(' · ')}, 세로 ${down.map((w) => w.answer).join(' · ')} — 열쇠와 사전 뜻풀이.`);
</script>

<svelte:head>
	<title>{head} | 딸깍</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{head} | 딸깍" />
	<meta property="og:description" content={desc} />
	<meta property="og:url" content={url} />
</svelte:head>

<article class="ans">
	<span class="kicker">오늘의 낱말퍼즐 해설 · {data.p.date}</span>
	<h1>{data.p.date} 가로세로 낱말퍼즐 정답</h1>
	<div class="grid" aria-label="정답 판">
		{#each data.chars as c, i (i)}
			{#if data.black[i]}<span class="cell blk"></span>
			{:else}<span class="cell">{#if data.numbers[i]}<small>{data.numbers[i]}</small>{/if}{c}</span>{/if}
		{/each}
	</div>
	{#if data.p.note}<p class="note">{data.p.note}</p>{/if}
	{#each [['가로', across], ['세로', down]] as [label, list] (label)}
		<h2>{label} 낱말</h2>
		<ol>
			{#each list as w (w.num + w.dir)}
				<li><b>{w.num} {label} · {w.answer}</b><span class="clue">열쇠 — {w.clue}</span>{#if w.def}<span>사전 — {w.def}</span>{/if}</li>
			{/each}
		</ol>
	{/each}
	<a class="go" href="/crossword" onclick={() => track('cwanswer_play')}>오늘의 낱말퍼즐 풀기 →</a>
	<nav aria-label="다른 날 해설">
		{#if data.prev}<a href="/crossword/answer/{data.prev}">← {data.prev}</a>{/if}
		{#if data.next}<a class="nx" href="/crossword/answer/{data.next}">{data.next} →</a>{/if}
	</nav>
	<p class="src">낱말과 뜻풀이: <a href="https://krdict.korean.go.kr" rel="noopener">한국어기초사전(국립국어원)</a>, CC BY-SA 2.0 KR</p>
</article>

<style>
	.ans { padding-bottom: 40px; line-height: var(--lh-reading); } /* 폭 · 좌우 여백은 레이아웃 .wrap이 준다 */
	.kicker { font-size: 13px; font-weight: 800; color: var(--accent); }
	h1 { font-size: 22px; margin: 6px 0 12px; overflow-wrap: anywhere; }
	.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; width: min(100%, 300px); margin: 8px auto; }
	.cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; border-radius: 8px; background: var(--panel-2); font-size: 22px; font-weight: 800; }
	.cell small { position: absolute; top: 2px; left: 5px; font-size: 11px; font-weight: 700; color: var(--muted); }
	.blk { background: var(--text); }
	.note { margin: 10px 0 0; }
	h2 { font-size: 17px; margin: 22px 0 6px; }
	ol { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	li { padding: 10px 12px; border-radius: 12px; background: var(--panel-2); }
	li span { display: block; font-size: 14px; color: var(--muted); }
	li .clue { color: var(--text); }
	.go { display: block; margin: 18px 0; padding: 14px 16px; border-radius: 14px; background: var(--accent); color: #fff; font-weight: 800; text-decoration: none; text-align: center; }
	nav { display: flex; justify-content: space-between; }
	nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px; color: var(--accent-text); }
	.nx { margin-left: auto; }
	.src { margin-top: 24px; font-size: 12px; color: var(--muted-2); }
	.src a { color: inherit; }
</style>
