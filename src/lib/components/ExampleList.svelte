<script lang="ts">
	import { untrack } from 'svelte';

	/**
	 * 발견형 문제의 예시 줄(pre 블록)을 표로 세워 보여준다.
	 * 그냥 <pre>로 흘리면 "5+3=28" 같은 줄이 본문에 섞여 디자인되지 않은 텍스트로 보인다.
	 * 물음표가 든 줄은 '지금 맞혀야 할 줄'이므로 색과 무게로 분리한다.
	 */
	let { text }: { text: string } = $props();

	let rows = $derived(text.split('\n').map((l) => l.replace(/\s+$/, '')));
	/** 한 줄짜리(수열 등)는 표가 아니라 한 덩어리로 보여주는 게 자연스럽다 */
	let single = $derived(rows.filter((l) => l.trim()).length <= 1);

	/**
	 * 예시 줄인가, 읽는 문장인가.
	 *
	 * 이 블록은 white-space: pre다 — "5 + 3 = 28"처럼 자릿수를 맞춰 세로로 비교해야 하는
	 * 예시를 위해서다. 그런데 클럽 유형처럼 안내 문장이 같은 블록에 섞이는 경우가 있고,
	 * 그 문장은 좁은 화면에서 그대로 잘려 나갔다(…짝을 모두 고르시 하고 끊긴다).
	 *
	 * 문장은 줄바꿈을 허용하고 예시는 그대로 둔다. 가르는 기준은 한글로 끝나는 마침표다 —
	 * 물음표까지 포함하면 「1001  2004  3009  ?」 같은 수열의 빈칸 줄이 산문으로 잡혀
	 * 자릿수가 흐트러진다. 숫자·기호로 끝나는 줄은 어떤 경우에도 예시다.
	 */
	const isProse = (l: string) => /[가-힣]\.$/.test(l.trim());

	let box: HTMLDivElement | undefined = $state();
	/**
	 * 예시 줄이 블록보다 넓으면 블록 전체를 이 비율로 줄인다.
	 *
	 * pre 줄은 접을 수 없다 — 자릿수를 맞춰야 비교가 되는 예시라 접는 순간 문제가 망가진다.
	 * 그렇다고 넘치게 두면 좁은 화면에서 글자가 잘려 아예 못 푼다. 접을 수 없으면 줄이는
	 * 수밖에 없고, 이건 표시 문제이므로 문제 내용은 건드리지 않는다.
	 *
	 * 글자 크기를 CSS에만 맡길 수 없는 이유는 CSS가 글의 길이를 모르기 때문이다. 모든 문제를
	 * 다 들어가는 크기로 낮추면 짧은 줄까지 이유 없이 작아진다 — 넘치는 블록만 줄여야 한다.
	 */
	let fit = $state(1);

	function measure() {
		const el = box;
		if (!el) return;
		// 접히는 문장은 폭을 다 쓰므로 기준에서 뺀다 — 넣으면 항상 넘친 것으로 잡힌다
		const lines = [...el.querySelectorAll<HTMLElement>('.row:not(.prose)')];
		if (!lines.length) return;
		const cs = getComputedStyle(el);
		const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
		if (avail <= 0) return;
		// 지금 걸린 배율을 나눠 원래 폭을 되찾는다. 안 그러면 잴 때마다 더 줄어든다
		const natural = Math.max(...lines.map((l) => l.offsetWidth)) / fit;
		// 0.72 아래로는 안 내려간다 — 그보다 줄여야 하는 줄은 글이 너무 긴 것이고,
		// 작아서 못 읽느니 남는 만큼은 밀어서 보게 둔다
		const next = natural > avail ? Math.max(0.72, avail / natural) : 1;
		if (Math.abs(next - fit) > 0.005) fit = next;
	}

	$effect(() => {
		text; // 문제가 바뀌면 다시 잰다
		const el = box;
		if (!el) return;
		// fit을 읽고 쓰므로 추적 밖에서 — 안 그러면 자기가 쓴 값에 다시 반응한다
		const again = () => untrack(measure);
		again();
		// 폰트는 첫 페인트 뒤에 도착할 수 있고, 화면을 돌리면 쓸 수 있는 폭이 달라진다
		document.fonts?.ready.then(again);
		window.addEventListener('resize', again);
		return () => window.removeEventListener('resize', again);
	});
</script>

<div class="ex" class:single bind:this={box} style:--fit={fit}>
	{#each rows as line, i (i)}
		{#if line.trim() === ''}
			<div class="gap" aria-hidden="true"></div>
		{:else}
			<div class="row" class:ask={line.includes('?')} class:prose={isProse(line)}>{line}</div>
		{/if}
	{/each}
</div>

<style>
	.ex {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 12px;
		display: flex;
		flex-direction: column;
		/* align-items: center로 두면 안 된다 — 줄이 폭을 넘길 때 양끝이 대칭으로 잘려 나간다.
		   가로 스크롤은 되지만 시작 위치가 가운데라 앞글자가 이미 화면 밖이다.
		   가운데 정렬은 .row의 auto 마진으로 옮겼다. 남는 폭이 음수가 되면 auto는 0으로
		   접히므로, 넘치는 줄은 왼쪽 끝부터 보이고 나머지는 밀어서 읽을 수 있다. */
		align-items: stretch;
		gap: 7px;
		/* 자릿수가 흔들리면 예시끼리 비교가 안 된다 */
		font-variant-numeric: tabular-nums;
		overflow-x: auto;
	}
	.row {
		font-size: calc(16.5px * var(--fit, 1));
		font-weight: 600;
		line-height: 1.45;
		color: var(--text);
		white-space: pre;
		letter-spacing: 0.2px;
		/* 글자만큼만 차지하고 가운데로. 남는 폭이 음수면 auto 마진은 0이 되어
		   왼쪽에 붙는다 — 잘리는 대신 앞부터 보인다. */
		width: max-content;
		margin-inline: auto;
	}
	.row.ask {
		color: var(--accent-2);
		font-weight: 800;
	}
	/* 안내 문장은 접힌다. 예시처럼 자릿수를 맞출 이유가 없고, 안 접으면 화면 밖으로 나간다 */
	.row.prose {
		white-space: normal;
		word-break: keep-all;
		text-align: center;
		line-height: 1.65;
		/* 접히는 문장은 max-content로 재면 안 된다 — 접기 전 길이가 잡혀 안 접힌다 */
		width: auto;
	}
	.gap {
		height: 6px;
	}
	/* 한 줄짜리(수열)는 크게 한 덩어리로 */
	.ex.single .row {
		font-size: calc(18px * var(--fit, 1));
		font-weight: 700;
		letter-spacing: 0.4px;
	}
	.ex.single {
		padding: 16px 12px;
	}

	@media (max-width: 380px) {
		.row {
			font-size: calc(15px * var(--fit, 1));
		}
		.ex.single .row {
			font-size: calc(16.5px * var(--fit, 1));
		}
	}
</style>
