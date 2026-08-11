<script lang="ts">
	import { onMount } from 'svelte';
	import DayReview from '$lib/components/DayReview.svelte';
	import { kstDayNumber, dayLabel, readDailyProgress, MARK_EMOJI, type Mark } from '$lib/game';
	import { assembleDayView, type DayView } from '$lib/dayview';

	/**
	 * 오늘 문제 다시 보기 — 완주한 사람만.
	 * GN 피드백(8/11) "내가 푼 문제 다시 볼 수가 없군요"로 생겼다.
	 * 아카이브는 스포일러 때문에 오늘을 서버에서 404로 막는다. 여기는 클라이언트에서만
	 * 조립하고, 완주 전이라면 문제를 아예 만들지 않는다.
	 */
	let phase = $state<'loading' | 'locked' | 'ready'>('loading');
	let label = $state('');
	let marks = $state<Mark[]>([]);
	let view = $state<DayView | null>(null);

	onMount(() => {
		const day = kstDayNumber(Date.now());
		label = dayLabel(day);
		const p = readDailyProgress(day);
		if (!p.done) {
			phase = 'locked';
			return;
		}
		marks = p.marks;
		view = assembleDayView(day);
		phase = 'ready';
	});
</script>

<svelte:head>
	<title>오늘 문제 다시 보기 | 딸깍</title>
	<!-- 완주자 개인용 화면 — 검색에 실을 내용이 없다 -->
	<meta name="robots" content="noindex" />
</svelte:head>

{#if phase === 'locked'}
	<div class="lock">
		<h1>아직 잠겨 있어요</h1>
		<p>
			오늘 문제 다시 보기는 <b>오늘의 10문제를 완주한 뒤</b>에 열립니다.
			정답이 다 보이는 화면이라, 풀기 전에 열면 재미가 사라져요.
		</p>
		<a class="cta" href="/">오늘의 10문제 풀러 가기 <span aria-hidden="true">→</span></a>
	</div>
{:else if phase === 'ready' && view}
	<nav class="crumb">
		<a href="/">← 오늘의 딸깍</a>
	</nav>
	<h1>{label}</h1>
	<div class="mymarks" aria-label="내 결과">
		<span class="mm-label">내 기록</span>
		<span class="mm-marks">{#each marks as m, i (i)}{MARK_EMOJI[m]}{/each}</span>
	</div>

	<DayReview {view} />

	<a class="today-cta" href="/record">
		<span>내 기록 달력 보기 →</span>
	</a>
{/if}

<style>
	.lock {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 26px 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		align-items: flex-start;
	}
	.lock h1 {
		font-size: 21px;
		font-weight: 800;
	}
	.lock p {
		margin: 0;
		font-size: 14px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 50px;
		padding: 0 22px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}

	.crumb {
		padding: 4px 0 6px;
	}
	.crumb a {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
		text-decoration: none;
	}
	.crumb a:hover {
		color: var(--accent);
	}
	h1 {
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		margin-bottom: 10px;
	}
	.mymarks {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px 14px;
		margin-bottom: 22px;
	}
	.mm-label {
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
	}
	.mm-marks {
		font-size: 15px;
		letter-spacing: 2px;
	}
	.today-cta {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 13px 20px;
		border-radius: 14px;
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		text-decoration: none;
		font-size: var(--fs-sm);
		font-weight: var(--fw-emphasis);
		color: #1f6b41;
	}
	.today-cta:hover {
		border-color: var(--accent);
	}
</style>
