<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { track } from '$lib/analytics';

	/**
	 * 놀이 탭 연습 판(11/25) — /sudoku · /scramble · /equation이 같이 쓴다.
	 * 몇 번째 판인지(k)는 이 기기에만 남긴다. 판 자체는 쪽이 k로 만들고 card 조각으로 넘긴다.
	 */
	type Ctx = { judged: boolean; onwrong: () => void; onsolve: () => void };
	let {
		kind,
		k = $bindable(0),
		over = false,
		label,
		card,
		explain
	}: { kind: string; k?: number; over?: boolean; label: string; card: Snippet<[Ctx]>; explain: Snippet } = $props();

	const KEY = `ddal.practice.${kind}`;
	let ready = $state(false);
	let judged = $state(false);
	let solved = $state(false);
	let msg = $state('');

	onMount(() => {
		try {
			const v = Number(localStorage.getItem(KEY));
			if (Number.isInteger(v) && v > 0) k = v;
		} catch {}
		ready = true;
		track('practice_start', { kind, k });
	});

	const onwrong = () => (msg = '아직이에요 — 다시 들여다볼까요?');
	const onsolve = () => {
		judged = true;
		solved = true;
		msg = '';
		track('practice_solve', { kind, k });
	};
	function reveal() {
		judged = true;
		msg = '';
	}
	function next() {
		k += 1;
		try {
			localStorage.setItem(KEY, String(k));
		} catch {}
		judged = false;
		solved = false;
		msg = '';
		scrollTo({ top: 0 });
	}
</script>

{#if ready}
	{#if over}
		<section class="card">
			<h2>준비된 판을 다 풀었어요</h2>
			<p class="note">새 판은 계속 붙여요. 그동안 오늘의 10문제를 풀어 보세요.</p>
		</section>
	{:else}
		<section class="card play">
			<span class="kicker">{label}</span>
			{#key k}{@render card({ judged, onwrong, onsolve })}{/key}
			<p class="msg" aria-live="assertive">{msg}</p>
			{#if judged}
				<div class="exp"><b>{solved ? '맞았어요!' : '정답과 풀이'}</b> {@render explain()}</div>
				<button class="big" type="button" onclick={next}>다음 판</button>
			{:else}
				<button class="ghost" type="button" onclick={reveal}>답 보기</button>
			{/if}
		</section>
	{/if}
{/if}

<style>
	.card { margin-top: 14px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); }
	.card h2 { font-size: 18px; font-weight: 900; margin-bottom: 6px; }
	.kicker { display: block; font-size: 13px; font-weight: 800; color: var(--accent); margin-bottom: 8px; }
	.note { color: var(--muted); font-size: 15px; line-height: 1.6; word-break: keep-all; }
	.msg { color: var(--danger); font-weight: 700; margin-top: 8px; word-break: keep-all; }
	.msg:empty { margin: 0; }
	.exp { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: var(--panel-2); font-size: 15px; line-height: 1.6; word-break: keep-all; }
	.exp :global(.eqstep) { display: block; margin-top: 4px; }
	.big { display: block; width: 100%; min-height: 48px; margin-top: 12px; border: 0; border-radius: 14px; background: var(--accent); color: #fff; font-size: 16px; font-weight: 800; box-shadow: 0 4px 0 var(--accent-press); }
	.ghost { display: block; width: 100%; min-height: 44px; margin-top: 8px; background: none; border: 0; color: var(--muted); font-size: 15px; text-decoration: underline; }
</style>
