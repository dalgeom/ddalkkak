<script lang="ts">
	/**
	 * 큰 글자 시각 블록. 한자·한글·알파벳의 '모양'이 규칙인 문제를 위한 것.
	 * (예: 한자 좌우대칭, 글자를 반 잘라 자음 찾기, 데칼코마니)
	 *
	 * 글자는 유니코드라 이미지가 필요 없다 — 크게 띄우고, 필요하면 세로 대칭축을 그어
	 * 좌우대칭이 눈에 들어오게 한다. 이것이 '그림 규칙'을 렌더하는 첫 수단이다.
	 *
	 * lines: 각 줄은 공백으로 나뉜 토큰. 예: '木 = 11', '一 二 五 ?'
	 * axis: true면 각 글자 칸에 세로 점선 대칭축을 그린다.
	 */
	let { lines, axis = false }: { lines: string[]; axis?: boolean } = $props();

	const isSym = (t: string) => t !== '=' && t !== '?' && t !== '→' && t !== '·';
</script>

{#each lines as line, li (li)}
	<div class="grow">
		{#each line.split(' ').filter(Boolean) as tok, ti (ti)}
			{#if tok === '=' || tok === '→' || tok === '·'}
				<span class="op">{tok}</span>
			{:else}
				<span class="cell" class:axis={axis && isSym(tok)}>{tok}</span>
			{/if}
		{/each}
	</div>
{/each}

<style>
	.grow {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		flex-wrap: wrap;
		padding: 6px 0;
	}
	.cell {
		position: relative;
		font-size: clamp(38px, 13cqi, 64px);
		font-weight: 700;
		line-height: 1;
		color: var(--text);
		/* 한자·한글이 또렷하게 — 세리프가 대칭 획을 더 잘 드러낸다 */
		font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR', serif;
	}
	/* 세로 대칭축 — 좌우대칭 글자에서 양쪽이 겹쳐 보이게 유도 */
	.cell.axis::after {
		content: '';
		position: absolute;
		top: -6%;
		bottom: -6%;
		left: 50%;
		width: 0;
		border-left: 1.5px dashed var(--border-strong);
		transform: translateX(-50%);
	}
	.op {
		font-size: 26px;
		font-weight: 800;
		color: var(--muted);
	}
</style>
