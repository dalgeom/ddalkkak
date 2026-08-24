<script lang="ts">
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import { parseEq } from '$lib/matchstick';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = $derived(`https://ddalkkak.app/matchstick/${data.meta.slug}`);
	const heading = $derived(`${data.meta.title} ${data.count}개`);
	const desc = $derived(
		`${data.meta.title} ${data.count}개. 이 유형이 어떻게 갈리는지 대표 문제로 짚고, 왜 그 획을 옮기는지까지 설명합니다.`
	);

	// 대표 예시 — 문제와 정답을 나란히 놓는다
	const before = $derived(parseEq(data.meta.example.displayed));
	const after = $derived(parseEq(data.meta.example.solution));
</script>

<svelte:head>
	<title>{heading} — 정답 포함 | 딸깍 퍼즐</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{heading} — 정답 포함 | 딸깍 퍼즐" />
	<meta property="og:description" content={data.meta.intro} />
	<meta property="og:url" content={url} />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/matchstick">성냥개비</a><span aria-hidden="true">›</span><span>{data.meta.short}</span>
		</nav>
		<h1>{data.meta.title}<br /><b>{data.count}개</b></h1>
		<p class="lead">{data.meta.intro}</p>
	</header>

	<section class="sec">
		<h2 class="sh">이 유형은 이렇게 풉니다</h2>
		{#each data.meta.how as p, i (i)}
			<p class="how">{p}</p>
		{/each}

		<div class="demo">
			<div class="side">
				<span class="tag">문제</span>
				<MatchstickBoard
					board={before}
					picked={null}
					onstick={() => {}}
					interactive={false}
					label={data.meta.example.displayed}
				/>
			</div>
			<div class="arrow" aria-hidden="true">→</div>
			<div class="side">
				<span class="tag done">정답</span>
				<MatchstickBoard
					board={after}
					picked={null}
					onstick={() => {}}
					interactive={false}
					label={data.meta.example.solution}
				/>
			</div>
		</div>
		<p class="note">
			더 많은 요령은 <a href="/matchstick/guide">성냥개비 푸는 법</a>에 정리해 두었습니다.
		</p>
	</section>

	<!-- 전에는 이 자리에 이 유형의 문제 수백 개를 식만 한 줄씩 늘어놓았다. 읽을 것이 없는
	     기계 출력이라 애드센스가 '가치가 별로 없는 콘텐츠'로 두 번 반려하는 근거가 됐고,
	     사실 정보량도 없었다 — self 유형은 293개가 열 가지 변환의 반복일 뿐이다.
	     그래서 변환이 겹치지 않게 고른 대표만 싣고 왜 그 획이 그리로 가는지를 붙인다.
	     나머지는 무한 연습에서 만난다. -->
	<section class="sec">
		<h2 class="sh">{data.meta.title}, 이렇게 갈립니다</h2>
		<p class="sub">
			{data.meta.short === '한 숫자 안'
				? '이 유형에서 일어날 수 있는 변환은 아래 열 가지가 전부입니다. 이것만 외워 두면 나머지는 어느 자리에 쓸지 고르는 문제입니다.'
				: '서로 다른 변환을 하나씩 골랐습니다. 먼저 풀어보고 설명을 확인해 보세요.'}
		</p>
		<ol class="picks">
			{#each data.meta.featured as f, i (f.displayed)}
				<li class="pick">
					<div class="phead">
						<span class="no">{i + 1}</span>
						<span class="chg">{f.change}</span>
					</div>
					<div class="peq">
						<code class="q">{f.displayed}</code>
						<span class="to" aria-hidden="true">→</span>
						<code class="a">{f.solution}</code>
					</div>
					<p class="pwhy">{f.why}</p>
				</li>
			{/each}
		</ol>
		<p class="note">
			이 유형에 {data.count}개가 있습니다. 나머지는
			<a href="/play?filter=match">무한 연습</a>에서 이어서 풀 수 있어요.
		</p>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/play?filter=match">성냥개비 무한으로 풀기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/">오늘의 10문제 풀러 가기</a>
	</section>

	<section class="sec">
		<h2 class="sh">다른 유형도 있어요</h2>
		<p class="sub">전체 {data.total}개를 해법에 따라 3가지로 나눠 두었습니다.</p>
		<div class="cats">
			{#each data.others as k (k.slug)}
				<a class="cat" href="/matchstick/{k.slug}">{k.title} <b>{k.count}</b></a>
			{/each}
		</div>
	</section>
</article>

<style>
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.crumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.crumb a {
		color: var(--accent);
		text-decoration: none;
	}
	.crumb a:hover {
		text-decoration: underline;
	}
	h1 {
		margin: 10px 0;
		font-size: 25px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		margin: 0;
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}

	.sec {
		margin-top: 26px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 6px 2px;
		word-break: keep-all;
	}
	.sub {
		margin: 0 0 12px 2px;
		font-size: 13px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.how {
		margin: 0 2px 10px;
		font-size: 14px;
		line-height: 1.8;
		word-break: keep-all;
	}
	.note {
		margin: 14px 2px 0;
		font-size: 13px;
		color: var(--muted);
	}
	.note a {
		color: var(--accent);
		font-weight: 700;
	}

	.demo {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px 12px;
	}
	.side {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.tag {
		font-size: 11.5px;
		font-weight: 800;
		color: var(--muted);
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 7px;
		padding: 3px 9px;
	}
	.tag.done {
		color: #1f6b41;
		background: var(--accent-soft);
		border-color: #cfe6d8;
	}
	.arrow {
		flex: none;
		font-size: 20px;
		font-weight: 800;
		color: var(--muted-2);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 6px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 7px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 9px 11px;
	}
	.q,
	.a {
		font-size: 13.5px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.a {
		color: var(--accent);
	}
	.to {
		font-size: 12px;
		color: var(--muted-2);
	}

	.cats {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.cat {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		padding: 7px 11px;
		text-decoration: none;
	}
	.cat:hover {
		background: var(--panel-2);
	}
	.cat b {
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}

	.picks {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.pick {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.phead {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.phead .no {
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
	.phead .chg {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.peq {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
		flex-wrap: wrap;
	}
	.peq .q,
	.peq .a {
		font-size: 17px;
		font-weight: 800;
		letter-spacing: 0.5px;
	}
	.peq .a {
		color: var(--accent);
	}
	.peq .to {
		color: var(--muted-2);
	}
	.pwhy {
		margin-top: 8px;
		font-size: 13.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}

	.ctas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15.5px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.cta.ghost {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border-strong);
		box-shadow: none;
		font-weight: 700;
	}
	.cta.ghost:hover {
		background: var(--panel-2);
	}
</style>
