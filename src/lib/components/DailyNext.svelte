<script lang="ts">
	import { onMount } from 'svelte';
	import { ctaTrack } from '$lib/analytics';
	import { kstDayNumber, readDailyProgress } from '$lib/game';

	/**
	 * 「오늘의 10문제로 이어 가기」 카드(2026-10-15 성장 작업 — 활성율).
	 *
	 * 왜: 10/1~10/13에 메인으로 들어온 세션은 68%가 오늘의 10문제를 시작했는데, 검색으로 /matchstick에 들어온
	 * 78세션은 8%, 초성 분야(/chosung/*) 56세션은 2%뿐이었다. 오늘의 성냥개비 · 초성을 막 끝낸 순간에는
	 * 「내일 자정에 새 문제」만 있어 길이 끊겼다. 하던 놀이와 이어지는 이유(성냥 2문제가 더 있다)를 붙여 잇는다.
	 *
	 * 오늘의 10문제를 이미 끝낸 사람에게는 안 보인다. 하다 만 사람에게는 「이어 풀기」.
	 * 누르면 메인이 곧장 시작한다(ctaTrack 'next' → markGoDaily). 노출 · 누름은 cta_next_seen · cta_next_click.
	 */
	/** shown — 카드가 보이는지. 보일 때는 화면의 다른 큰 버튼을 테두리 버튼으로 낮춘다(초록 큰 버튼은 하나) */
	let { pitch, shown = $bindable(false) }: { pitch: string; shown?: boolean } = $props();

	let state = $state<'hidden' | 'new' | 'resume'>('hidden');
	onMount(() => {
		const p = readDailyProgress(kstDayNumber(Date.now()));
		state = p.done ? 'hidden' : p.marks.length ? 'resume' : 'new';
		shown = state !== 'hidden';
	});
</script>

{#if state !== 'hidden'}
	<a class="dnext" href="/" use:ctaTrack={'next'}>
		<span class="dn-k">오늘의 10문제</span>
		<b class="dn-t">{state === 'resume' ? '풀던 오늘의 10문제를 이어서 풀어요' : pitch}</b>
		<span class="dn-s">발견형 3 · 상식 2 · 성냥개비 2 · 전개도 2 · 보너스 1 · 10분이면 끝나요</span>
		<span class="dn-go">{state === 'resume' ? '이어 풀기' : '바로 시작'} <span aria-hidden="true">→</span></span>
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
