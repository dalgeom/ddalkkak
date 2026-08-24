<script lang="ts">
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
</script>

<div class="ex" class:single>
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
		font-size: 16.5px;
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
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.4px;
	}
	.ex.single {
		padding: 16px 12px;
	}

	@media (max-width: 380px) {
		.row {
			font-size: 15px;
		}
		.ex.single .row {
			font-size: 16.5px;
		}
	}
</style>
