<script lang="ts">
	/**
	 * 단계 도전 지도(2026-10-20, 「딸깍 5단계」 공통 부품) — 상식부터 쓰고 발견형 · 초성 · 전개도가 뒤따른다.
	 * 단계(새싹~고수)마다 묶어 보여 준다. 단계마다 첫 판은 처음부터 열려 있어, 잘하는 사람은 새싹을 건너뛰고
	 * 자기 실력에서 시작한다(stages.ts isOpen). 칸 모양은 성냥 단계판(.sgrid · .stile)과 같다.
	 */
	import { onMount } from 'svelte';
	import { track } from '$lib/analytics';
	import { isOpen, loadSeen, newKeys, nextOpen, saveSeen, tierCounts, type StageMeta, type StageProgress } from '$lib/stages';
	import { TIERS } from '$lib/tiers';

	let {
		stages,
		progress,
		hrefOf,
		storageKey,
		event
	}: {
		stages: StageMeta[];
		progress: StageProgress;
		hrefOf: (key: string) => string;
		/** 진행 기록 열쇠 — 「새 판」 기록은 그 옆(`열쇠:seen`)에 둔다 */
		storageKey: string;
		/** 계측 이름 앞머리(tstage 등) */
		event: string;
	} = $props();

	let groups = $derived(
		TIERS.map((t) => ({ ...t, list: stages.filter((s) => s.tier === t.tier) })).filter((g) => g.list.length)
	);

	// 「새 판」(10/22, stages.ts newKeys). 진행은 부모가 자기 onMount에서 읽어 오므로(자식이 먼저 붙는다) 한 차례 미룬 뒤 가른다
	let fresh = $state<Set<string>>(new Set());
	onMount(() => {
		const t = setTimeout(() => {
			fresh = newKeys(stages, loadSeen(storageKey), progress);
			if (fresh.size) track(`${event}_new_seen`, { n: fresh.size });
			else saveSeen(storageKey, tierCounts(stages));
		}, 0);
		return () => clearTimeout(t);
	});
</script>

{#each groups as g (g.tier)}
	{@const cleared = g.list.filter((s) => (progress[s.key] ?? 0) >= 1).length}
	{@const goIn = nextOpen(stages, progress, g.tier)}
	{@const newN = g.list.filter((s) => fresh.has(s.key)).length}
	<section class="tier" id="tier-{g.tier}">
		<div class="th">
			<div>
				<h3><span class="lv lv{g.tier}">{g.tier}단계</span>{g.name}</h3>
				<p>{g.who} · {g.list.length}판 중 {cleared}판 통과{#if newN}<b class="newn">{` · 새 판 ${newN}개`}</b>{/if}</p>
			</div>
			<a class="go" href={hrefOf(goIn)}>{cleared ? '이어하기' : '시작'}</a>
		</div>
		<div class="sgrid">
			{#each g.list as s (s.key)}
				{@const st = progress[s.key] ?? 0}
				{@const isNew = fresh.has(s.key)}
				{#if isOpen(stages, progress, s.key)}
					<a
						class="stile"
						class:cleared={st > 0}
						class:new={isNew}
						href={hrefOf(s.key)}
						onclick={() => isNew && track(`${event}_new_click`)}
						aria-label={st ? `${g.name} ${s.inTier}판 별 ${st}개` : `${g.name} ${s.inTier}판${isNew ? ' 새 판' : ''}`}
					>
						{#if isNew}<i class="nb" aria-hidden="true">새</i>{/if}
						<b>{s.inTier}</b><span>{'★'.repeat(st)}</span>
					</a>
				{:else}
					<span class="stile locked" class:new={isNew} aria-label="{g.name} {s.inTier}판 잠김{isNew ? ' 새 판' : ''}"
						>{#if isNew}<i class="nb" aria-hidden="true">새</i>{/if}<b>{s.inTier}</b><span></span></span
					>
				{/if}
			{/each}
		</div>
	</section>
{/each}

<style>
	.tier + .tier {
		margin-top: 22px;
	}
	.th {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h3 {
		font-size: 17px;
		font-weight: 900;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.th p {
		margin-top: 3px;
		font-size: 13px;
		color: var(--muted);
		word-break: keep-all;
	}
	.lv {
		font-size: 11.5px;
		font-weight: 800;
		border-radius: 7px;
		padding: 3px 8px;
		color: var(--accent-text);
		background: var(--correct-bg);
	}
	.lv3 {
		color: var(--gold-text);
		background: var(--gold-bg);
	}
	.lv4,
	.lv5 {
		color: var(--danger);
		background: var(--danger-bg);
	}
	.go {
		flex: none;
		padding: 9px 14px;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 800;
		text-decoration: none;
	}
	.sgrid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		margin-top: 12px;
	}
	.stile {
		min-height: 48px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--panel);
		color: var(--text);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		text-decoration: none;
	}
	.stile b {
		font-size: 14px;
		font-weight: 800;
	}
	.stile span {
		font-size: 10px;
		line-height: 1;
		min-height: 10px;
		color: var(--accent-text);
	}
	.stile.cleared {
		border-color: var(--accent);
	}
	.stile.locked {
		opacity: 0.35;
	}
	/* 새 판 — 칸 테두리와 귀퉁이 「새」. 잠긴 새 판도 흐려지지 않게 해 어디에 붙었는지 보인다 */
	.stile {
		position: relative;
	}
	.stile.new {
		border-color: var(--gold-text);
	}
	.stile.locked.new {
		opacity: 0.7;
	}
	.nb {
		position: absolute;
		top: -6px;
		right: -4px;
		font-style: normal;
		font-size: 10px;
		font-weight: 900;
		line-height: 1;
		color: #fff;
		background: var(--gold-text);
		border-radius: 5px;
		padding: 3px 4px;
	}
	.newn {
		color: var(--gold-text);
		font-weight: 800;
	}
</style>
