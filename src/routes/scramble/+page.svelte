<script lang="ts">
	import { scramblePracticeAt, SCRAMBLE_PRACTICE } from '$lib/scramble';
	import ScrambleCard from '$lib/components/ScrambleCard.svelte';
	import PracticeShell from '$lib/components/PracticeShell.svelte';
	import DailyNext from '$lib/components/DailyNext.svelte';

	/* 글자 섞기 연습(11/25) — 오늘의 10문제 1번 칸과 같은 꼴. 낱말은 초성 퀴즈 은행에서 데일리에 안 나오는 것만,
	   쉬운 단계부터(SCRAMBLE_PRACTICE). 다 풀면 over. */
	let k = $state(0);
	const data = $derived(scramblePracticeAt(k));
</script>

<svelte:head>
	<title>글자 섞기 — 뒤섞인 낱말 맞히기 무료 연습 | 딸깍</title>
	<meta
		name="description"
		content="섞인 글자를 바로 놓아 낱말을 맞혀요. 과일 · 동물 · 나라처럼 분야를 알려 주고, 쉬운 낱말부터 한 판씩 나와요. 설치 · 가입 없이 바로."
	/>
	<link rel="canonical" href="https://ddalkkak.app/scramble" />
	<meta property="og:title" content="글자 섞기 연습 | 딸깍" />
	<meta property="og:description" content="뒤섞인 글자를 바로 놓아 낱말을 맞혀요. 분야 힌트와 함께 한 판씩." />
	<meta property="og:url" content="https://ddalkkak.app/scramble" />
</svelte:head>

<div class="kroot">
	<header class="cover">
		<h1><span class="kicker">낱말 맞히기</span>글자 <b>섞기</b></h1>
		<p class="lead">뒤섞인 글자를 바로 놓아 낱말을 맞혀요. 분야를 알려 주니 그 안에서 떠올려 보세요.</p>
	</header>

	<PracticeShell kind="scramble" bind:k over={!data} label="{k + 1}번째 낱말 · 모두 {SCRAMBLE_PRACTICE.length}개">
		{#snippet card({ judged, onwrong, onsolve })}
			{#if data}<ScrambleCard {data} {judged} {onwrong} {onsolve} />{/if}
		{/snippet}
		{#snippet explain()}
			{#if data}정답은 <b>{data.word}</b> ({data.category}). {data.hint}{/if}
		{/snippet}
	</PracticeShell>

	<section class="card rules">
		<h2>어떻게 푸나요</h2>
		<p class="note">
			글자 몇 개가 순서 없이 섞여 나와요. 그 글자를 모두 한 번씩 써서 뜻이 있는 낱말 하나를 만들면 돼요. 글자를 빼거나 더하면 안 되고, 위에
			적힌 분야(과일 · 동물 · 나라 같은 것) 안의 낱말이에요. 답을 적고 「확인」을 누르면 맞았는지 알려 드려요. 띄어쓰기는 신경 쓰지 않아도 돼요.
		</p>
		<p class="note">
			막히면 먼저 첫 글자가 될 만한 것을 골라 보세요. 받침이 있는 글자는 낱말 끝에 오는 일이 많고, 「이 · 기 · 리」처럼 흔한 끝 글자도
			실마리가 돼요. 분야를 떠올리며 그 분야에서 글자 수가 같은 낱말을 몇 개 대 보는 것도 빨라요. 그래도 안 되면 「답 보기」로 정답과 짧은
			설명을 볼 수 있어요. 쉬운 낱말부터 나오고, 뒤로 갈수록 덜 익숙한 낱말이 나와요.
		</p>
		<p class="note">
			글자 섞기는 오늘의 10문제 첫 칸에도 매일 나와요. 초성만 보고 맞히는 <a href="/chosung">초성 퀴즈</a>, 수를 채우는
			<a href="/sudoku">미니 스도쿠</a>, 그림이 숨긴 수를 찾는 <a href="/equation">그림 방정식</a>도 있어요.
		</p>
	</section>

	<DailyNext pitch="오늘의 10문제도 풀어 보세요" />
</div>

<style>
	.kroot { padding-bottom: 20px; }
	.cover h1 { font-size: 28px; line-height: 1.25; margin: 6px 0 8px; }
	.cover h1 .kicker { display: block; }
	.kicker { font-size: 13px; font-weight: 800; color: var(--accent); }
	.lead, .note { color: var(--muted); font-size: 15px; line-height: 1.6; word-break: keep-all; }
	.note + .note { margin-top: 8px; }
	.card { margin-top: 14px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); }
	.card h2 { font-size: 18px; font-weight: 900; margin-bottom: 6px; }
	.note a { color: var(--accent); }
</style>
