<script lang="ts">
	import { equationAt } from '$lib/equation';
	import { PRACTICE_BASE } from '$lib/scramble';
	import EquationCard from '$lib/components/EquationCard.svelte';
	import PracticeShell from '$lib/components/PracticeShell.svelte';
	import DailyNext from '$lib/components/DailyNext.svelte';

	/* 그림 방정식 연습(11/25) — 오늘의 10문제 4번 칸과 같은 생성기, 날짜 대신 PRACTICE_BASE + k로 만든다.
	   답이 하나뿐인지는 practice.test.ts가 센다. */
	let k = $state(0);
	const data = $derived(equationAt(PRACTICE_BASE + k));
</script>

<svelte:head>
	<title>그림 방정식 — 그림 수학 퍼즐 무료 연습 | 딸깍</title>
	<meta
		name="description"
		content="그림마다 숨은 수를 찾아 마지막 식을 계산하는 그림 수학 퍼즐. 한 판에 1~3분, 틀리면 한 줄씩 풀이를 보여 드려요. 설치 · 가입 없이 바로."
	/>
	<link rel="canonical" href="https://ddalkkak.app/equation" />
	<meta property="og:title" content="그림 방정식 연습 | 딸깍" />
	<meta property="og:description" content="그림마다 숨은 수를 찾아 마지막 식을 계산해요. 풀이는 한 줄씩." />
	<meta property="og:url" content="https://ddalkkak.app/equation" />
</svelte:head>

<div class="kroot">
	<header class="cover">
		<h1><span class="kicker">그림 수학 퍼즐</span>그림 <b>방정식</b></h1>
		<p class="lead">그림 하나가 수 하나예요. 위의 식들로 그림마다 수를 찾고, 마지막 식의 값을 적어요.</p>
	</header>

	<PracticeShell kind="equation" bind:k label="{k + 1}번째 판">
		{#snippet card({ judged, onwrong, onsolve })}
			<EquationCard {data} {judged} {onwrong} {onsolve} />
		{/snippet}
		{#snippet explain()}
			{#each data.steps as s}<span class="eqstep">{s}</span>{/each}
		{/snippet}
	</PracticeShell>

	<section class="card rules">
		<h2>어떻게 푸나요</h2>
		<p class="note">
			식이 몇 줄 있고, 같은 그림은 어느 줄에서나 같은 수예요. 그림 한 가지만 여러 번 나오는 줄이 있으면 거기서부터 보세요. 그 그림의 수가
			바로 나오고, 그 수를 다음 줄에 넣으면 남은 그림이 하나로 줄어요. 그런 줄이 없고 그림 둘씩 더한 줄만 있으면 세 줄을 모두 더해 보세요.
			그림마다 두 번씩 들어가니 반으로 나누면 셋의 합이 나와요. 마지막 줄의 값을 적고 「확인」을 누르세요.
		</p>
		<p class="note">
			곱하기와 더하기가 섞여 있으면 곱하기를 먼저 해요. 그림 수는 모두 자연수라서, 나눠떨어지지 않는 값이 나오면 앞에서 계산이 틀렸다는
			뜻이에요. 막히면 「답 보기」로 그림마다 수를 찾는 순서를 한 줄씩 볼 수 있어요. 판마다 그림과 식의 꼴이 바뀌고, 풀 때마다 다음 판이
			새로 만들어져요.
		</p>
		<p class="note">
			그림 방정식은 오늘의 10문제에도 매일 나와요. 성냥 하나로 식을 고치는 <a href="/matchstick">성냥개비 퍼즐</a>, 수를 채우는
			<a href="/sudoku">미니 스도쿠</a>, 글자를 바로 놓는 <a href="/scramble">글자 섞기</a>도 있어요.
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
