<script lang="ts">
	/**
	 * 크림 배경 위에 직접 서는 경량 7세그먼트 숫자.
	 * SevenSeg.svelte(문제용 전광판)와 **완전히 같은 좌표계**를 쓴다 — 새 형태를 만드는 게 아니라
	 * 이미 있는 부품을 HUD로 꺼내 쓰는 것이 이 아이덴티티의 전부다.
	 *
	 * 고스트(꺼진 세그먼트)는 기본 꺼둔다 — 1·7처럼 켜진 획이 적은 숫자에서 꺼진 획이 '8' 실루엣을
	 * 만들어 정작 숫자가 안 읽힌다. LCD 질감이 필요한 자리에서만 ghost를 켠다.
	 * 스크린리더에는 숫자 그대로 읽힌다.
	 */
	let {
		value,
		size = 24,
		color = 'var(--seg-on-hud)',
		ghost = false,
		boot = false
	}: {
		value: number | string;
		size?: number;
		color?: string;
		ghost?: boolean;
		boot?: boolean;
	} = $props();

	const SEG: Record<string, [number, number, number, number]> = {
		a: [10, 0, 34, 7],
		b: [46, 8, 7, 34],
		c: [46, 50, 7, 34],
		d: [10, 86, 34, 7],
		e: [0, 50, 7, 34],
		f: [0, 8, 7, 34],
		g: [10, 43, 34, 7]
	};
	const DIG: Record<string, string> = {
		'0': 'abcdef',
		'1': 'bc',
		'2': 'abdeg',
		'3': 'abcdg',
		'4': 'bcfg',
		'5': 'acdfg',
		'6': 'acdefg',
		'7': 'abc',
		'8': 'abcdefg',
		'9': 'abcdfg'
	};
	const ORDER = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

	let chars = $derived(String(value).split(''));
</script>

<span class="segnum" style="--seg-h:{size}px" aria-label={String(value)} role="img">
	{#each chars as ch, di (di)}
		{#if DIG[ch]}
			<svg viewBox="0 0 53 93" height={size} aria-hidden="true">
				{#each ORDER as k, ki (k)}
					{@const on = DIG[ch].includes(k)}
					{#if on || ghost}
						<rect
							x={SEG[k][0]}
							y={SEG[k][1]}
							width={SEG[k][2]}
							height={SEG[k][3]}
							rx="3"
							fill={on ? color : 'var(--seg-off)'}
							class:boot={boot && on}
							style={boot && on ? `animation-delay:${di * 90 + ki * 45}ms` : undefined}
						/>
					{/if}
				{/each}
			</svg>
		{:else}
			<span class="punct" style="color:{color}">{ch}</span>
		{/if}
	{/each}
</span>

<style>
	.segnum {
		display: inline-flex;
		align-items: center;
		gap: calc(var(--seg-h) * 0.09);
		line-height: 1;
		vertical-align: middle;
	}
	svg {
		display: block;
	}
	.punct {
		font-size: calc(var(--seg-h) * 0.8);
		font-weight: 900;
	}
	/* 정답 순간 세그먼트가 순서대로 켜진다 — 색·아이콘에 이은 세 번째 정답 신호 */
	rect.boot {
		opacity: 0;
		animation: seg-on 90ms linear forwards;
	}
	@keyframes seg-on {
		to {
			opacity: 1;
		}
	}
</style>
