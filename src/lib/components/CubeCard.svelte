<script lang="ts">
	import CubeNetFigure from '$lib/components/CubeNetFigure.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import { FACES, type CubeNetProblem } from '$lib/cubenet';

	/**
	 * 전개도 한 문제(2026-10-20, 단계 도전용) — 판정은 무한 연습과 같다: 두 번 틀리면 정답을 보여 준다.
	 * 해설은 마주 보는 면 짝(마주 본 두 면은 한 화면에 같이 보이지 않는다). 다 끝나면 onsettle(맞았나).
	 */
	let { problem, onsettle }: { problem: CubeNetProblem; onsettle: (ok: boolean) => void } = $props();

	let picked = $state<number | null>(null);
	let wrong = $state(0);
	let judged = $state(false);
	let msg = $state('');

	function choose(i: number) {
		if (judged) return;
		picked = i;
		if (i === problem.answer) {
			judged = true;
			msg = '딸깍! 맞혔어요';
			onsettle(true);
		} else if (++wrong >= 2) {
			judged = true;
			msg = '정답을 확인했어요';
			onsettle(false);
		} else msg = '아쉬워요 — 한 번 더 골라볼까요?';
	}
</script>

<div class="qtext">이 전개도를 접어 주사위를 만들면, 어떤 모양이 될까요?</div>
<div class="netbox">
	<CubeNetFigure rows={problem.net.rows} cells={problem.net.cells} faceOf={problem.net.faceOf} />
</div>
<div class="opts">
	{#each problem.options as opt, i (i)}
		<button class="opt" class:ok={judged && i === problem.answer} class:bad={picked === i && i !== problem.answer} disabled={judged} onclick={() => choose(i)}>
			<span class="b">{['A', 'B', 'C', 'D'][i]}</span>
			<CubeDie view={opt} size={84} />
		</button>
	{/each}
</div>
{#if msg}<p class="msg" class:okm={judged && picked === problem.answer}>{msg}</p>{/if}
{#if judged}
	<p class="explain">
		<b>해설</b> 마주 보는 면은
		{#each problem.opposites as [a, b], k (k)}{FACES[a].name} ↔ {FACES[b].name}{k < problem.opposites.length - 1 ? ', ' : ''}{/each}
		이에요. 마주 본 두 면은 한 화면에 같이 보이지 않아요.
	</p>
{/if}

<style>
	.qtext {
		margin-top: 14px;
		font-size: 17px;
		font-weight: 700;
		line-height: 1.5;
		word-break: keep-all;
	}
	.netbox {
		margin: 12px 0;
		display: flex;
		justify-content: center;
	}
	.opts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.opt {
		position: relative;
		display: flex;
		justify-content: center;
		padding: 12px 6px;
		border-radius: 14px;
		border: 1.5px solid var(--border-strong);
		background: var(--panel);
		cursor: pointer;
	}
	.opt:disabled {
		cursor: default;
	}
	.opt.ok {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.opt.bad {
		border-color: var(--danger);
		background: var(--danger-bg);
	}
	.b {
		position: absolute;
		top: 6px;
		left: 8px;
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
	}
	.msg {
		margin-top: 12px;
		font-size: 15px;
		font-weight: 800;
		color: var(--danger);
	}
	.msg.okm {
		color: var(--accent-text);
	}
	.explain {
		margin-top: 8px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.explain b {
		color: var(--text);
		margin-right: 6px;
	}
</style>
