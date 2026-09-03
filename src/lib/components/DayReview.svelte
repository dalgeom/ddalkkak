<script lang="ts">
	import ProblemView from '$lib/components/ProblemView.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import CubeNetFigure from '$lib/components/CubeNetFigure.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { parseEq } from '$lib/matchstick';
	import type { DayView } from '$lib/dayview';

	/**
	 * 하루치 문제의 읽기 전용 화면. 아카이브(지난 문제)와 /today(오늘 다시 보기)가 같이 쓴다.
	 * 원래 archive/[day]/+page.svelte 안에 있던 것을 /today가 생기며 끌어올렸다.
	 * 정답은 전부 눌러야 열린다 — 훑기만 해도 답이 보이면 다시 볼 맛이 없다.
	 */
	let { view }: { view: DayView } = $props();

	let matchReveal = $state<boolean[]>([]);
	let cubeReveal = $state<boolean[]>([]);
	let bonusReveal = $state(false);
	$effect(() => {
		matchReveal = view.match.map(() => false);
		cubeReveal = view.cube.map(() => false);
		bonusReveal = false;
	});
</script>

<section class="grp">
	<div class="grp-h"><Icon name="search" size={16} /><h2>오늘의 발견</h2></div>
	<div class="grid">
		{#each view.discover as p (p.id)}
			<ProblemView problem={p} />
		{/each}
	</div>
</section>

<section class="grp">
	<div class="grp-h"><Icon name="book" size={16} /><h2>오늘의 상식</h2></div>
	<div class="grid">
		{#each view.trivia as p (p.id)}
			<ProblemView problem={p} />
		{/each}
	</div>
</section>

<section class="grp">
	<div class="grp-h"><Icon name="match" size={16} /><h2>오늘의 성냥개비</h2></div>
	<div class="grid">
		{#each view.match as m, i (i)}
			<article class="mv">
				<div class="mv-board"><MatchstickBoard board={parseEq(m.displayed)} picked={null} onstick={() => {}} interactive={false} label={m.displayed} /></div>
				<div class="mv-cap">성냥 하나만 옮겨 참으로</div>
				{#if matchReveal[i]}
					<div class="mv-answer">
						<div class="mv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
						<div class="mv-board sol"><MatchstickBoard board={parseEq(m.solution)} picked={null} onstick={() => {}} interactive={false} label={'정답 ' + m.solution} /></div>
					</div>
				{:else}
					<button class="mv-reveal" onclick={() => (matchReveal[i] = true)}>정답 보기</button>
				{/if}
			</article>
		{/each}
	</div>
</section>

{#if view.cube.length}
	<section class="grp">
		<div class="grp-h"><Icon name="match" size={16} /><h2>오늘의 전개도</h2></div>
		<div class="grid">
			{#each view.cube as c, i (i)}
				<article class="mv">
					<CubeNetFigure rows={c.net.rows} cells={c.net.cells} faceOf={c.net.faceOf} />
					<div class="mv-cap">접으면 어떤 주사위가 될까요?</div>
					{#if cubeReveal[i]}
						<div class="mv-answer">
							<div class="mv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
							<CubeDie view={c.options[c.answer]} />
						</div>
					{:else}
						<button class="mv-reveal" onclick={() => (cubeReveal[i] = true)}>정답 보기</button>
					{/if}
				</article>
			{/each}
		</div>
	</section>
{/if}

{#if view.bonus}
	<section class="grp">
		<div class="grp-h"><Icon name="hint" size={16} /><h2>보너스 문제</h2></div>
		<div class="grid">
			{#if view.bonus.kind === 'match'}
				<article class="mv">
					<div class="mv-board"><MatchstickBoard board={parseEq(view.bonus.eq.displayed)} picked={null} onstick={() => {}} interactive={false} label={view.bonus.eq.displayed} /></div>
					<div class="mv-cap">성냥 하나만 옮겨 참으로</div>
					{#if bonusReveal}
						<div class="mv-answer">
							<div class="mv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
							<div class="mv-board sol"><MatchstickBoard board={parseEq(view.bonus.eq.solution)} picked={null} onstick={() => {}} interactive={false} label={'정답 ' + view.bonus.eq.solution} /></div>
						</div>
					{:else}
						<button class="mv-reveal" onclick={() => (bonusReveal = true)}>정답 보기</button>
					{/if}
				</article>
			{:else if view.bonus.kind === 'cube'}
				<article class="mv">
					<CubeNetFigure
						rows={view.bonus.cube.net.rows}
						cells={view.bonus.cube.net.cells}
						faceOf={view.bonus.cube.net.faceOf}
					/>
					<div class="mv-cap">접으면 어떤 주사위가 될까요?</div>
					{#if bonusReveal}
						<div class="mv-answer">
							<div class="mv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
							<CubeDie view={view.bonus.cube.options[view.bonus.cube.answer]} />
						</div>
					{:else}
						<button class="mv-reveal" onclick={() => (bonusReveal = true)}>정답 보기</button>
					{/if}
				</article>
			{:else}
				<ProblemView problem={view.bonus.problem} />
			{/if}
		</div>
	</section>
{/if}

<style>
	.grp {
		margin-bottom: 30px;
	}
	.grp-h {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 12px;
	}
	.grp-h h2 {
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
		align-items: start;
	}
	.mv {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}
	.mv-board {
		max-width: 200px;
	}
	.mv-board :global(svg) {
		height: 72px;
		width: auto;
	}
	.mv-cap {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
	}
	.mv-reveal {
		font-family: inherit;
		font-size: var(--fs-xs);
		font-weight: var(--fw-emphasis);
		color: var(--muted);
		background: var(--panel-2);
		border: 1.5px solid var(--border-strong);
		border-bottom-width: 3px;
		border-radius: 12px;
		padding: 9px 18px;
		cursor: pointer;
	}
	.mv-reveal:hover {
		color: var(--text);
		border-color: var(--accent-text);
	}
	.mv-reveal:active {
		border-bottom-width: 1px;
	}
	.mv-answer {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}
	.mv-answer-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		color: #1f6b41;
	}
</style>
