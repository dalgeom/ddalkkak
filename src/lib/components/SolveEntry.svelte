<script lang="ts">
	import { track } from '$lib/analytics';

	/**
	 * 성냥 정답 찾기로 가는 입구(2026-10-21). 식을 검색해 들어오는 쪽(/matchstick, 푸는 법, 유형 쪽,
	 * 성냥 읽을거리)마다 둔다. 자리마다 이벤트 이름을 나눠 어느 입구로 들어왔는지 본다(ctaTrack과 같은 까닭).
	 */
	let { from }: { from: 'match' | 'guide' | 'kind' | 'read' } = $props();
</script>

<a class="solve-entry" href="/matchstick/solve" onclick={() => track(`msolve_in_${from}`)}>
	<span class="t">
		<b>다른 데서 본 성냥 문제가 있나요?</b>
		<span>식을 넣으면 답을 찾아 드려요</span>
	</span>
	<span class="go" aria-hidden="true">→</span>
</a>

<style>
	.solve-entry {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 14px;
		padding: 13px 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text);
	}
	.solve-entry:hover {
		background: var(--panel-2);
	}
	.t {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		word-break: keep-all;
	}
	.t b {
		font-size: 14.5px;
	}
	.t span {
		font-size: 13px;
		color: var(--muted);
	}
	.go {
		flex: none;
		font-size: 18px;
		font-weight: 800;
		color: var(--accent-text);
	}
</style>
