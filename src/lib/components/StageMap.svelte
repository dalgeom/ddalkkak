<script lang="ts">
	/**
	 * 단계 도전 지도(2026-10-20, 「딸깍 5단계」 공통 부품) — 상식부터 쓰고 발견형 · 초성 · 전개도가 뒤따른다.
	 * 단계(새싹~고수)마다 묶어 보여 준다. 단계마다 첫 판은 처음부터 열려 있어, 잘하는 사람은 새싹을 건너뛰고
	 * 자기 실력에서 시작한다(stages.ts isOpen). 칸 모양은 성냥 단계판(.sgrid · .stile)과 같다.
	 */
	import { isOpen, nextOpen, type StageMeta, type StageProgress } from '$lib/stages';
	import { TIERS } from '$lib/tiers';

	let {
		stages,
		progress,
		hrefOf
	}: { stages: StageMeta[]; progress: StageProgress; hrefOf: (no: number) => string } = $props();

	let groups = $derived(
		TIERS.map((t) => ({ ...t, list: stages.filter((s) => s.tier === t.tier) })).filter((g) => g.list.length)
	);
</script>

{#each groups as g (g.tier)}
	{@const cleared = g.list.filter((s) => (progress[s.no] ?? 0) >= 1).length}
	{@const go = nextOpen(stages, progress, g.list[0].no)}
	{@const goIn = stages[go - 1]?.tier === g.tier ? go : g.list[0].no}
	<section class="tier" id="tier-{g.tier}">
		<div class="th">
			<div>
				<h3><span class="lv lv{g.tier}">{g.tier}단계</span>{g.name}</h3>
				<p>{g.who} · {g.list.length}판 중 {cleared}판 통과</p>
			</div>
			<a class="go" href={hrefOf(goIn)}>{cleared ? '이어하기' : '시작'}</a>
		</div>
		<div class="sgrid">
			{#each g.list as s (s.no)}
				{@const st = progress[s.no] ?? 0}
				{#if isOpen(stages, progress, s.no)}
					<a class="stile" class:cleared={st > 0} href={hrefOf(s.no)} aria-label={st ? `${g.name} ${s.inTier}판 별 ${st}개` : `${g.name} ${s.inTier}판`}>
						<b>{s.inTier}</b><span>{'★'.repeat(st)}</span>
					</a>
				{:else}
					<span class="stile locked" aria-label="{g.name} {s.inTier}판 잠김"><b>{s.inTier}</b><span></span></span>
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
</style>
