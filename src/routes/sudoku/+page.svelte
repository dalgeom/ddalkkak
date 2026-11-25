<script lang="ts">
	import { sudokuAt, firstStep } from '$lib/sudoku';
	import { PRACTICE_BASE } from '$lib/scramble';
	import SudokuCard from '$lib/components/SudokuCard.svelte';
	import PracticeShell from '$lib/components/PracticeShell.svelte';
	import DailyNext from '$lib/components/DailyNext.svelte';

	/* 미니 스도쿠 연습(11/25) — 오늘의 10문제 5번 칸과 같은 생성기, 날짜 대신 PRACTICE_BASE + k로 만든다.
	   k가 짝수면 4×4, 홀수면 6×6. 해가 하나뿐인지는 practice.test.ts가 200판을 센다. */
	let k = $state(0);
	const data = $derived(sudokuAt(PRACTICE_BASE + k));
	const fs = $derived(firstStep(data));
</script>

<svelte:head>
	<title>미니 스도쿠 — 4×4 · 6×6 무료 연습 | 딸깍</title>
	<meta
		name="description"
		content="한 판에 2~5분, 작은 스도쿠를 끝없이 연습해요. 4×4와 6×6이 번갈아 나오고, 막히면 첫 수와 풀이를 보여 드려요. 설치 · 가입 없이 바로."
	/>
	<link rel="canonical" href="https://ddalkkak.app/sudoku" />
	<meta property="og:title" content="미니 스도쿠 연습 | 딸깍" />
	<meta property="og:description" content="4×4 · 6×6 작은 스도쿠를 한 판씩. 막히면 첫 수를 알려 드려요." />
	<meta property="og:url" content="https://ddalkkak.app/sudoku" />
</svelte:head>

<div class="kroot">
	<header class="cover">
		<h1><span class="kicker">4×4 · 6×6</span>미니 <b>스도쿠</b></h1>
		<p class="lead">가로줄 · 세로줄 · 굵은 묶음에 같은 수가 두 번 오지 않게 채워요. 한 판 풀면 다음 판.</p>
	</header>

	<PracticeShell kind="sudoku" bind:k label="{k + 1}번째 판 · {data.size}×{data.size}">
		{#snippet card({ judged, onwrong, onsolve })}
			<SudokuCard {data} {judged} {onwrong} {onsolve} />
		{/snippet}
		{#snippet explain()}
			{#if fs}<span class="eqstep"
					>첫 수: <b>{Math.floor(fs.cell / data.size) + 1}행 {(fs.cell % data.size) + 1}열</b>은 같은 가로줄 · 세로줄 · 묶음에 이미 {fs.seen.join(' · ')}까지 다 있어서 남는 수는 <b>{fs.value}</b>뿐이에요.</span
				>{/if}
			이렇게 한 칸씩 정해 가면 끝까지 풀려요. 판에 정답을 채워 두었어요.
		{/snippet}
	</PracticeShell>

	<section class="card rules">
		<h2>어떻게 푸나요</h2>
		<p class="note">
			4×4 판에는 1부터 4까지, 6×6 판에는 1부터 6까지 들어가요. 가로줄 하나, 세로줄 하나, 굵은 선으로 묶인 칸 하나마다 그 수가 꼭 한 번씩만
			나와야 해요. 빈칸을 눌러 수를 고르고, 판이 다 차면 「확인」을 누르세요. 틀린 곳이 있으면 알려 드리니 다시 들여다보면 돼요. 정답이 하나뿐인
			판만 내니 짐작으로 찍을 필요가 없어요.
		</p>
		<p class="note">
			시작은 빈칸이 가장 적은 줄이나 묶음이에요. 한 줄에 빈칸이 하나 남았다면 빠진 수가 바로 답이에요. 그다음은 한 칸을 골라 그 칸이 속한
			가로줄 · 세로줄 · 묶음에 이미 있는 수를 모두 지워 보세요. 남는 수가 하나면 그 칸은 정해졌어요. 막히면 「답 보기」로 첫 수와 그 까닭을
			볼 수 있어요. 더 자세한 요령은 <a href="/read/sudoku-tips">스도쿠 요령 글</a>에 있어요.
		</p>
		<p class="note">
			스도쿠는 오늘의 10문제에도 매일 한 판씩 나와요. 글자를 바로 놓는 <a href="/scramble">글자 섞기</a>, 그림이 숨긴 수를 찾는
			<a href="/equation">그림 방정식</a>도 따로 연습할 수 있어요.
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
