<script lang="ts">
	import { tierName, type Tier } from '$lib/tiers';

	/**
	 * 단계 마지막 판을 깬 결과 화면의 한 줄(2026-10-22). 10/21 첫날 상식 고수 판을 다 깬 사람이 「이 판 다시 하기」 ·
	 * 「단계 지도 보기」만 보고 떠났다. 판은 매일 더해지고 지도에 「새」로 보인다는 걸 그 자리에서 알린다.
	 */
	let { tier }: { tier: Tier } = $props();
</script>

<p class="tend">
	<b>{tierName(tier)} 판을 다 깼어요.</b> 새 판은 매일 조금씩 더해져요. 새로 생긴 판은 단계 지도에 「새」로 보여 드려요.
</p>

<style>
	.tend {
		margin: 14px 0 0;
		padding: 12px 14px;
		border-radius: 12px;
		background: var(--gold-bg);
		color: var(--text);
		font-size: 13.5px;
		line-height: 1.65;
		word-break: keep-all;
		text-align: left;
	}
	.tend b {
		color: var(--gold-text);
	}
</style>
