<script lang="ts">
	/**
	 * 딸깍 로고 — 느낌표 자리의 전구를 7세그먼트 부품으로 그린다.
	 *
	 * 유리는 SevenSeg/SegNumber와 **완전히 같은 SEG 좌표**의 숫자 '0'(6획)이고,
	 * 필라멘트는 그 가운데 g획을 꺼진 색으로 둔 것이다. 즉 로고와 문제 화면 전광판이
	 * 같은 부품에서 나온다 — 새 조형을 발명하지 않는 것이 이 아이덴티티의 규칙이다.
	 *
	 * 전구를 느낌표로 쓰는 발상 자체는 유지하되(대표가 직접 낸 안), 재료만 베지어 곡선에서
	 * 세그먼트 획으로 바꿨다.
	 */
	let { size = 27 }: { size?: number } = $props();

	const SEG: Record<string, [number, number, number, number]> = {
		a: [10, 0, 34, 7],
		b: [46, 8, 7, 34],
		c: [46, 50, 7, 34],
		d: [10, 86, 34, 7],
		e: [0, 50, 7, 34],
		f: [0, 8, 7, 34],
		g: [10, 43, 34, 7]
	};
	const GLASS = ['a', 'b', 'c', 'd', 'e', 'f'];
</script>

<a class="logo" href="/" aria-label="딸깍 홈">
	<span class="word" style="font-size:{size}px">딸깍</span>
	<svg
		class="excl"
		style="height:{Math.round(size * 1.52)}px"
		viewBox="0 0 53 158"
		aria-hidden="true"
	>
		<!-- 유리 = 숫자 0의 6획. 좌표를 그대로 재사용한다 -->
		{#each GLASS as k (k)}
			<rect
				x={SEG[k][0]}
				y={SEG[k][1]}
				width={SEG[k][2]}
				height={SEG[k][3]}
				rx="3"
				fill="var(--gold)"
			/>
		{/each}
		<!-- 필라멘트 = g획 자리. 꺼져 있다가 켜지는 그 획이다 -->
		<rect
			x={SEG.g[0]}
			y={SEG.g[1]}
			width={SEG.g[2]}
			height={SEG.g[3]}
			rx="3"
			fill="#d8ab34"
		/>
		<!-- 소켓 두 줄 -->
		<rect x="14" y="98" width="25" height="6" rx="3" fill="var(--border-strong)" />
		<rect x="16" y="108" width="21" height="6" rx="3" fill="var(--border-strong)" />
		<!-- 줄기 = 세그먼트 세로획과 같은 폭·라운드 -->
		<rect x="23" y="118" width="7" height="20" rx="3" fill="currentColor" />
		<!-- 점 = 원이 아니라 세그먼트와 같은 코너 -->
		<rect x="19.5" y="144" width="14" height="14" rx="3" fill="currentColor" />
	</svg>
</a>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		text-decoration: none;
		color: var(--text);
	}
	/* Georgia 세리프를 버렸다 — 사이트 전체가 Pretendard인데 로고만 세리프일 이유가 없다.
	   무게는 900(--fw-number: 숫자·로고 전용)으로 아이콘과 균형을 맞춘다. */
	.word {
		font-weight: var(--fw-number);
		letter-spacing: -1.5px;
		color: var(--text);
		line-height: 1;
	}
	.excl {
		display: block;
		transform: translateY(-1px);
	}
</style>
