<script lang="ts">
	import ExampleList from '$lib/components/ExampleList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>발견형 퍼즐 — 숨은 규칙 찾기 문제 {data.total}제 | 딸깍</title>
	<meta
		name="description"
		content="규칙을 알려주지 않는 발견형 퍼즐 {data.total}문제. 예시를 보고 숨은 규칙을 스스로 발견하는 두뇌 문제 — 문제적 남자 스타일 문제를 좋아한다면 매일 새 문제를 풀어보세요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/discover" />
	<meta property="og:title" content="발견형 퍼즐 — 숨은 규칙 찾기 문제 {data.total}제 | 딸깍" />
	<meta
		property="og:description"
		content="규칙을 알려주지 않는 발견형 퍼즐. 예시 속 숨은 규칙을 발견하는 순간, 딸깍."
	/>
	<meta property="og:url" content="https://ddalkkak.app/discover" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">발견형 퍼즐</span>
		<h1>규칙은 숨겨져 있다<br /><b>찾는 순간, 딸깍</b></h1>
		<p class="lead">
			발견형 퍼즐은 규칙을 알려주지 않습니다. 예시 몇 줄만 던져주고, 그 안에 숨은 규칙을 스스로
			찾아 물음표를 채우는 문제예요. 정답을 맞히는 순간보다 규칙이 보이는 순간 — 머릿속에서 딸깍
			소리가 나는 그 순간이 이 퍼즐의 전부입니다.
		</p>
		<div class="facts">
			<div class="fact"><b>{data.total}</b><span>발견형 문제</span></div>
			<div class="fact"><b>매일 3+</b><span>오늘의 딸깍 출제</span></div>
			<div class="fact"><b>3단계</b><span>막히면 힌트</span></div>
		</div>
	</header>

	<section class="sec">
		<h2 class="sh">이런 문제예요 — 직접 풀어보세요</h2>
		<p class="sub">
			지시문은 "물음표에 들어갈 값은?"뿐. 무엇을 세라, 어떻게 계산하라 알려주지 않습니다. 규칙을
			발견해야만 풀립니다.
		</p>
		<div class="samples">
			{#each data.samples as s (s.id)}
				<div class="sample">
					<span class="chip">{s.chip}</span>
					{#each s.blocks as b, i (i)}
						{#if b.kind === 'text'}
							<div class="q">{@html b.html}</div>
						{:else if b.kind === 'pre'}
							<ExampleList text={b.text} />
						{/if}
					{/each}
					<details>
						<summary>정답 보기</summary>
						<p class="ans">정답은 <b>{s.answer}</b></p>
						<p class="exp">{@html s.explain}</p>
					</details>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">'문제적 남자' 같은 문제를 찾고 있다면</h2>
		<div class="card">
			<p class="cd">
				tvN에서 방영했던 <b>문제적 남자</b>(2015~2020)를 기억하나요? 뇌섹남들이 모여 숨은 규칙을
				찾아내던 그 문제들 — 방송이 끝난 뒤 "그런 문제 어디서 풀지?" 하던 분들이 많습니다. 딸깍의
				발견형 퍼즐이 정확히 그 결의 문제입니다. 규칙 발견·발상 전환·숫자와 글자의 숨은 성질을
				다루고, 매일 자정 새 문제가 열려요.
			</p>
			<p class="cd small">
				딸깍은 해당 방송사·프로그램과 무관한 독립 서비스이며, 모든 문제는 자체 제작입니다.
			</p>
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">품질 기준 — 아무 문제나 안 넣습니다</h2>
		<div class="rules">
			<div class="rule"><b>규칙을 지문에 노출하지 않는다</b><span>"세어 보세요" 같은 안내가 있으면 발견이 아니라 노동입니다.</span></div>
			<div class="rule"><b>답이 하나로 유일해야 한다</b><span>다른 규칙으로도 말이 되면 문제가 아니라 논쟁입니다.</span></div>
			<div class="rule"><b>발견의 쾌감이 있어야 한다</b><span>규칙을 알아낸 순간 "아!" 소리가 나야 채택합니다.</span></div>
		</div>
		<p class="note">더 자세한 풀이 요령은 <a href="/guide">발견형 풀이 가이드</a>에 정리해 두었습니다.</p>
	</section>

	<section class="sec ctas">
		<a class="cta" href="/">오늘의 10문제 풀러 가기 <span aria-hidden="true">→</span></a>
		<a class="cta ghost" href="/play?filter=puzzle">발견형만 무한 연습하기</a>
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
		border-radius: 7px;
		padding: 4px 11px;
	}
	h1 {
		margin: 12px 0 10px;
		font-size: 26px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 18px;
	}
	.fact {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 12px 6px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 18px;
		font-weight: 800;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.fact span {
		font-size: 11.5px;
		color: var(--muted-2);
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
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}
	.note {
		margin: 12px 2px 0;
		font-size: 13px;
		color: var(--muted);
	}
	.note a {
		color: var(--accent);
		font-weight: 700;
	}

	.samples {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.sample {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.chip {
		display: inline-block;
		font-size: 12px;
		font-weight: 700;
		background: var(--panel-2);
		color: var(--muted);
		padding: 3px 9px;
		border-radius: 7px;
		margin-bottom: 8px;
	}
	.q {
		font-size: 15px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
		margin-bottom: 8px;
	}
	details {
		margin-top: 10px;
		background: var(--panel-2);
		border-radius: 12px;
		padding: 10px 14px;
	}
	summary {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
	}
	.ans {
		margin: 10px 0 6px;
		font-size: 14px;
		font-weight: 700;
	}
	.ans b {
		color: var(--accent);
	}
	.exp {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}

	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
	}
	.cd {
		font-size: 13.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.cd b {
		color: var(--text);
	}
	.cd.small {
		margin-top: 8px;
		font-size: 12px;
		color: var(--muted-2);
	}

	.rules {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.rule {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		padding: 13px 15px;
	}
	.rule b {
		display: block;
		font-size: 14px;
		margin-bottom: 4px;
	}
	.rule span {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
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
