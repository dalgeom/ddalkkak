<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto, pushState } from '$app/navigation';

	/**
	 * 아래에서 올라오는 시트 — 딸깍의 모든 시트가 이것 하나를 쓴다(새 소식 · 의견 보내기).
	 *
	 * 2026-10-14 사용자 지적: 시트마다 따로 만들어 「스르륵 올라오는 느낌도 없고, 끌어내려 닫기도 안 된다」.
	 * 휴대폰 시트가 당연히 해야 하는 것을 여기서 한 번에 한다.
	 *   - 올라올 때 미끄러져 올라오고(0.34초), 닫힐 때 내려가며 사라진다. 뒤는 서서히 어두워진다
	 *   - 손잡이·제목을 끌어 내리면 따라 내려오고, 충분히 내리거나 빠르게 튕기면 닫힌다. 덜 내리면 제자리
	 *   - 끌어 올리면 화면 높이까지 커진다(expandable). 커진 상태에서 내리면 먼저 작아진다
	 *   - 내용이 맨 위일 때는 내용을 끌어 내려도 닫힌다(글 칸 안에서는 끌지 않는다)
	 *   - 휴대폰 뒤로가기로 닫힌다(열 때 기록을 한 칸 쌓는다). 바깥 · ✕ · Esc로도 닫힌다
	 *   - 열린 동안 뒤 화면은 스크롤되지 않는다
	 */
	let {
		open = $bindable(false),
		id,
		title = '',
		expandable = true,
		onclose,
		children
	}: {
		open?: boolean;
		/** 뒤로가기 기록에 쓰는 이름 */
		id: string;
		title?: string;
		expandable?: boolean;
		onclose?: () => void;
		children: Snippet;
	} = $props();

	let panel = $state<HTMLDivElement>();
	let body = $state<HTMLDivElement>();
	let dy = $state(0);
	let dragging = $state(false);
	let expanded = $state(false);
	let pushed = false;
	let returnFocus: Element | null = null;

	// 뒤로가기 — 열 때 기록 한 칸, 화면 안에서 닫으면 그 칸을 되돌린다
	$effect(() => {
		const o = open;
		untrack(() => {
			if (o && !pushed) {
				pushed = true;
				returnFocus = document.activeElement;
				pushState('', { sheet: id });
				dy = 0;
				expanded = false;
				queueMicrotask(() => panel?.focus({ preventScroll: true }));
			} else if (!o && pushed) {
				pushed = false;
				history.back();
			}
		});
	});
	function onPop() {
		if (!open || !pushed) return;
		pushed = false;
		open = false;
		onclose?.();
	}

	// 뒤 화면 스크롤 잠금
	$effect(() => {
		if (!open) return;
		const el = document.documentElement;
		const prev = el.style.overflow;
		el.style.overflow = 'hidden';
		return () => {
			el.style.overflow = prev;
			if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
		};
	});

	export function close() {
		if (!open) return;
		open = false;
		onclose?.();
	}
	/** 시트 안 링크로 떠날 때 — 시트 기록 칸을 새 화면으로 바꿔 끼워 뒤로가기가 빈 칸에 걸리지 않게 */
	export function leave(href: string) {
		pushed = false;
		open = false;
		onclose?.();
		goto(href, { replaceState: true });
	}

	// ── 끌기 ──
	let startY = 0;
	let startT = 0;
	let fromHandle = false;
	let canDrag = false;
	let blockClick = false;

	function begin(y: number, target: EventTarget | null) {
		const el = target as Element | null;
		fromHandle = !!el?.closest('.handle');
		const inField = !!el?.closest('textarea, input, select');
		canDrag = fromHandle || (!inField && (body?.scrollTop ?? 0) <= 0);
		startY = y;
		startT = performance.now();
		dragging = false;
	}
	/** 끌기로 넘어갔으면 true(그때부터 스크롤 대신 시트가 움직인다) */
	function move(y: number): boolean {
		if (!canDrag) return false;
		const d = y - startY;
		if (!dragging) {
			if (Math.abs(d) < 6) return false;
			// 내용을 위로 미는 것은 내용 스크롤이다
			if (d < 0 && !fromHandle) {
				canDrag = false;
				return false;
			}
			dragging = true;
		}
		dy = d > 0 ? d : d * (expandable && !expanded ? 0.45 : 0.15);
		return true;
	}
	function end() {
		if (!dragging) return;
		dragging = false;
		blockClick = true;
		setTimeout(() => (blockClick = false), 50);
		const h = panel?.offsetHeight ?? 400;
		const v = dy / Math.max(1, performance.now() - startT);
		if (expanded && dy > 0 && dy < h * 0.45 && v < 0.8) {
			expanded = false;
			dy = 0;
		} else if (dy > h * 0.28 || (dy > 40 && v > 0.55)) {
			close();
		} else if (dy < -40 && expandable && !expanded) {
			expanded = true;
			dy = 0;
		} else dy = 0;
	}

	function onTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		begin(e.touches[0].clientY, e.target);
		const tm = (ev: TouchEvent) => {
			if (move(ev.touches[0].clientY)) ev.preventDefault();
		};
		const te = () => {
			window.removeEventListener('touchmove', tm);
			window.removeEventListener('touchend', te);
			window.removeEventListener('touchcancel', te);
			end();
		};
		window.addEventListener('touchmove', tm, { passive: false });
		window.addEventListener('touchend', te);
		window.addEventListener('touchcancel', te);
	}
	// 마우스는 손잡이에서만
	function onMouseDown(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || e.button !== 0 || !(e.target as Element).closest('.handle')) return;
		if ((e.target as Element).closest('button')) return;
		begin(e.clientY, e.target);
		const pm = (ev: PointerEvent) => void move(ev.clientY);
		const pu = () => {
			window.removeEventListener('pointermove', pm);
			window.removeEventListener('pointerup', pu);
			end();
		};
		window.addEventListener('pointermove', pm);
		window.addEventListener('pointerup', pu);
	}
	function onClickCapture(e: MouseEvent) {
		if (blockClick) {
			e.preventDefault();
			e.stopPropagation();
		}
	}
	function onKey(e: KeyboardEvent) {
		if (open && e.key === 'Escape') close();
	}
</script>

<svelte:window onpopstate={onPop} onkeydown={onKey} />

{#if open}
	<div class="dim" role="presentation" onclick={close} transition:fade={{ duration: 240 }}></div>
	<div class="sheet" transition:fly={{ y: '100%', duration: 340, easing: cubicOut, opacity: 1 }}>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="panel"
			class:expanded
			class:dragging
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-label={title || undefined}
			tabindex="-1"
			style:transform={dy ? `translateY(${dy}px)` : null}
			ontouchstart={onTouchStart}
			onpointerdown={onMouseDown}
			onclickcapture={onClickCapture}
		>
			<div class="handle">
				<span class="grip" aria-hidden="true"></span>
				{#if title}<h2 class="title">{title}</h2>{/if}
				<button class="x" aria-label="닫기" onclick={close}>✕</button>
			</div>
			<div class="body" bind:this={body}>
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.dim {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(30, 26, 20, 0.4);
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 61;
		max-width: 520px;
		margin: 0 auto;
		pointer-events: none;
	}
	.panel {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		max-height: 88dvh;
		background: var(--panel);
		border-radius: 22px 22px 0 0;
		box-shadow: 0 -10px 30px rgba(30, 26, 20, 0.2);
		transition:
			transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
			height 0.28s cubic-bezier(0.22, 1, 0.36, 1);
		outline: none;
		overscroll-behavior: contain;
	}
	.panel.dragging {
		transition: none;
	}
	.panel.expanded {
		height: 94dvh;
		max-height: 94dvh;
	}
	.handle {
		position: relative;
		flex: none;
		padding: 10px 56px 8px 18px;
		touch-action: none;
		cursor: grab;
		user-select: none;
	}
	.dragging .handle {
		cursor: grabbing;
	}
	.grip {
		display: block;
		width: 44px;
		height: 5px;
		border-radius: 3px;
		background: var(--border-strong);
		margin: 0 auto 10px;
		transform: translateX(19px);
	}
	.title {
		font-size: 19px;
		font-weight: 900;
		line-height: 1.35;
		word-break: keep-all;
	}
	.x {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: none;
		background: none;
		color: var(--muted);
		font-size: 17px;
		cursor: pointer;
	}
	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 2px 18px calc(18px + env(safe-area-inset-bottom));
	}
</style>
