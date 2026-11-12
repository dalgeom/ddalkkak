<script lang="ts">
	import { onMount } from 'svelte';
	import { ctaTrack } from '$lib/analytics';
	import { kstDayNumber, readDailyProgress } from '$lib/game';
	import { todayMissions, type Mission } from '$lib/missions';

	/**
	 * 「오늘의 10문제로 이어 가기」 카드(2026-10-15 성장 작업 — 활성율).
	 *
	 * 왜: 10/1~10/13에 메인으로 들어온 세션은 68%가 오늘의 10문제를 시작했는데, 검색으로 /matchstick에 들어온
	 * 78세션은 8%, 초성 분야(/chosung/*) 56세션은 2%뿐이었다. 오늘의 성냥개비 · 초성을 막 끝낸 순간에는
	 * 「내일 자정에 새 문제」만 있어 길이 끊겼다. 하던 놀이와 이어지는 이유(성냥 2문제가 더 있다)를 붙여 잇는다.
	 *
	 * 오늘의 10문제를 이미 끝낸 사람에게는 아직 안 한 오늘의 미션(성냥 · 초성)을 권한다(11/12 점검 — 끝낸 뒤 길이 끊겼다).
	 * 미션까지 다 했으면 안 보인다. 하다 만 사람에게는 「이어 풀기」.
	 * 누르면 메인이 곧장 시작한다(ctaTrack 'next' → markGoDaily). 노출 · 누름은 cta_next_seen · cta_next_click.
	 */
	/** shown — 카드가 보이는지. 보일 때는 화면의 다른 큰 버튼을 테두리 버튼으로 낮춘다(초록 큰 버튼은 하나) */
	/** skip — 이 화면 자신의 미션(같은 쪽으로 가는 링크는 아무 일도 안 일어난다) */
	let { pitch, skip, shown = $bindable(false) }: { pitch: string; skip?: 'match' | 'cho'; shown?: boolean } = $props();

	let view = $state<'hidden' | 'new' | 'resume' | 'mission'>('hidden');
	let mission = $state<Mission | null>(null);
	onMount(() => {
		const day = kstDayNumber(Date.now());
		const p = readDailyProgress(day);
		const ms = todayMissions(day);
		// 이 화면의 오늘 문제를 아직 안 풀었으면 다른 미션으로 보내지 않는다(허브에서 딴 데로 새는 것)
		const own = !skip || ms.find((m) => m.key === skip)?.done !== false;
		mission = p.done && own ? (ms.find((m) => m.key !== 'daily' && m.key !== skip && !m.done) ?? null) : null;
		view = p.done ? (mission ? 'mission' : 'hidden') : p.marks.length ? 'resume' : 'new';
		shown = view !== 'hidden';
	});
</script>

{#if view === 'mission' && mission}
	<a class="dnext" href={mission.href}>
		<span class="dn-k">오늘의 미션 하나 더</span>
		<b class="dn-t">{mission.label}도 풀어 볼까요?</b>
		<span class="dn-s">하루 한 문제 · 1분이면 끝나요</span>
		<span class="dn-go">바로 시작 <span aria-hidden="true">→</span></span>
	</a>
{:else if view !== 'hidden'}
	<a class="dnext" href="/" use:ctaTrack={'next'}>
		<span class="dn-k">오늘의 10문제</span>
		<b class="dn-t">{view === 'resume' ? '풀던 오늘의 10문제를 이어서 풀어요' : pitch}</b>
		<span class="dn-s">발견형 3 · 상식 2 · 성냥개비 2 · 전개도 2 · 보너스 1 · 10분이면 끝나요</span>
		<span class="dn-go">{view === 'resume' ? '이어 풀기' : '바로 시작'} <span aria-hidden="true">→</span></span>
	</a>
{/if}

<style>
	.dnext {
		display: grid;
		gap: 3px;
		margin-top: 12px;
		padding: 14px 16px;
		border-radius: 16px;
		background: var(--correct-bg);
		border: 1.5px solid var(--accent);
		color: var(--text);
		text-decoration: none;
		text-align: left;
	}
	.dn-k {
		font-size: 12.5px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.dn-t {
		font-size: 16px;
		font-weight: 900;
		line-height: 1.4;
		word-break: keep-all;
	}
	.dn-s {
		font-size: 12.5px;
		color: var(--muted);
		word-break: keep-all;
	}
	.dn-go {
		margin-top: 4px;
		font-size: 14.5px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.dnext:active {
		transform: translateY(1px);
	}
</style>
