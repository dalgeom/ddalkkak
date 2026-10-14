<script lang="ts">
	import { onMount } from 'svelte';
	import { todayMissions, type Mission } from '$lib/missions';
	import { kstDayNumber } from '$lib/game';

	/** 오늘의 미션(missions.ts) — 메인과 /games가 함께 쓴다 */
	/** 서버 렌더·첫 그림 — 저장소를 읽기 전에도 같은 자리에 같은 세 칸이 보이게 */
	const BLANK: Mission[] = [
		{ key: 'daily', label: '오늘의 10문제', href: '/', done: false },
		{ key: 'match', label: '오늘의 성냥개비', href: '/matchstick', done: false },
		{ key: 'cho', label: '오늘의 초성', href: '/chosung', done: false }
	];
	let missions = $state<Mission[]>([]);
	let left = $derived(missions.filter((m) => !m.done).length);

	onMount(() => {
		missions = todayMissions(kstDayNumber(Date.now()));
	});
</script>

<section class="mission">
	<h2>오늘의 미션 <span>{missions.length ? (left ? `${left}개 남았어요` : '오늘은 다 했어요') : ''}</span></h2>
	<div class="mrow">
		{#each missions.length ? missions : BLANK as m (m.key)}
			<a href={m.href} class:done={m.done}>
				<span class="ck" aria-hidden="true">{m.done ? '✓' : ''}</span>{m.label}
			</a>
		{/each}
	</div>
</section>

<style>
	.mission {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 14px;
	}
	h2 {
		font-size: 15px;
		font-weight: 900;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
	}
	h2 span {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--accent-text);
	}
	.mrow {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.mrow a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 4px;
		border-radius: 12px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		font-size: 12px;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
		text-align: center;
		word-break: keep-all;
	}
	.ck {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--border-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 900;
		color: #fff;
	}
	.mrow a.done {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.mrow a.done .ck {
		background: var(--accent);
		border-color: var(--accent);
	}
</style>
