<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { goto, pushState } from '$app/navigation';

	/**
	 * 아래에서 올라오는 시트 — 딸깍의 모든 시트가 이것 하나를 쓴다(새 소식 · 의견 보내기).
	 *
	 * 닫기는 휴대폰에서 사람들이 실제로 하는 방법만: 끌어 내리기 · 바깥 누르기 · 뒤로가기(키보드는 Esc).
	 * ✕ 버튼은 두지 않는다(2026-10-14 사용자: 「아래 모달을 누가 X를 눌러서 꺼?」).
	 *   - 올라올 때 미끄러져 올라오고(0.34초), 닫힐 때 내려가며 사라진다. 뒤는 서서히 어두워진다
	 *   - 손잡이·제목을 끌어 내리면 따라 내려오고, 충분히 내리거나 빠르게 튕기면 닫힌다. 덜 내리면 제자리
	 *   - 끌어 올리면 화면 높이까지 커진다(expandable). 커진 상태에서 내리면 먼저 작아진다
	 *   - 내용이 맨 위일 때는 내용을 끌어 내려도 닫힌다(글 칸 안에서는 끌지 않는다)
	 *   - 휴대폰 뒤로가기로 닫힌다(열 때 기록을 한 칸 쌓는다)
	 *   - 열린 동안 뒤 화면은 스크롤되지 않는다
	 *
	 * 아이폰 사파리에서 닫는 순간 검은 막이 깜빡였다(10/14 사용자). 그래서
	 *   - 막과 시트를 「떼어내는 애니메이션」(svelte transition)으로 지우지 않는다. 클래스 하나로 CSS 전환을
	 *     걸고, 다 투명해진 뒤에 지운다 — 지우는 순간 이미 투명이라 마지막 한 프레임이 다시 그려질 일이 없다
	 *   - 스크롤 잠금에 html overflow를 쓰지 않는다(사파리는 주소창 크기가 바뀌며 화면을 다시 그린다).
	 *     시트 밖 터치·휠만 막는다
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

	const DUR = 340;
	let mounted = $state(false);
	let shown = $state(false);
	let panel = $state<HTMLDivElement>();
	let body = $state<HTMLDivElement>();
	let dy = $state(0);
	let dragging = $state(false);
	let expanded = $state(false);
	let pushed = false;
	let returnFocus: Element | null = null;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const o = open;
		untrack(() => {
			clearTimeout(hideTimer);
			if (o) {
				if (!pushed) {
					pushed = true;
					returnFocus = document.activeElement;
					pushState('', { sheet: id });
				}
				if (!mounted) {
					dy = 0;
					expanded = false;
					mounted = true;
				}
				// 처음 그린 자리(아래 · 투명)를 브라우저가 한 번 칠한 뒤에 올린다 — 그래야 전환이 보인다
				requestAnimationFrame(() =>
					requestAnimationFrame(() => {
						if (open) {
							shown = true;
							panel?.focus({ preventScroll: true });
						}
					})
				);
			} else {
				if (pushed) {
					pushed = false;
					history.back();
				}
				shown = false;
				hideTimer = setTimeout(() => {
					if (!open) {
						mounted = false;
						dy = 0;
						if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
					}
				}, DUR + 60);
			}
		});
	});

	function onPop() {
		if (!open || !pushed) return;
		pushed = false;
		open = false;
		onclose?.();
	}

	// 스크롤 잠금 — 시트 밖으로 가는 터치·휠은 막고, 시트 안 내용이 스크롤될 수 있을 때만 통과
	$effect(() => {
		if (!mounted) return;
		const canScroll = (t: EventTarget | null, delta: number) => {
			const el = t as Element | null;
			if (!body || !el || !body.contains(el)) return false;
			if (body.scrollHeight <= body.clientHeight + 1) return false;
			if (delta < 0) return body.scrollTop > 0;
			return body.scrollTop + body.clientHeight < body.scrollHeight - 1;
		};
		let lastY = 0;
		const ts = (e: TouchEvent) => (lastY = e.touches[0]?.clientY ?? 0);
		const tm = (e: TouchEvent) => {
			const y = e.touches[0]?.clientY ?? lastY;
			const delta = lastY - y;
			lastY = y;
			const field = (e.target as Element | null)?.closest?.('textarea');
			if (field && panel?.contains(field)) return;
			if (!canScroll(e.target, delta) && e.cancelable) e.preventDefault();
		};
		const wh = (e: WheelEvent) => {
			if (!canScroll(e.target, e.deltaY)) e.preventDefault();
		};
		document.addEventListener('touchstart', ts, { passive: true });
		document.addEventListener('touchmove', tm, { passive: false });
		document.addEventListener('wheel', wh, { passive: false });
		return () => {
			document.removeEventListener('touchstart', ts);
			document.removeEventListener('touchmove', tm);
			document.removeEventListener('wheel', wh);
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
	/** 최근 움직임(시각 · 끈 거리) — 튕긴 속도는 손을 뗄 무렵 0.1초로 잰다. 처음부터의 평균으로 재면
	    손잡이를 잠깐 누르고 있다가 휙 튕긴 것이 느린 끌기로 읽혀 안 닫혔다(10/20 QA C3가 들쭉날쭉했던 원인) */
	let trail: { t: number; dy: number }[] = [];

	function begin(y: number, target: EventTarget | null) {
		const el = target as Element | null;
		fromHandle = !!el?.closest('.handle');
		const inField = !!el?.closest('textarea, input, select');
		canDrag = fromHandle || (!inField && (body?.scrollTop ?? 0) <= 0);
		startY = y;
		startT = performance.now();
		trail = [{ t: startT, dy: 0 }];
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
		const now = performance.now();
		trail.push({ t: now, dy });
		while (trail.length > 2 && now - trail[1].t > 100) trail.shift();
		return true;
	}
	function end() {
		if (!dragging) return;
		dragging = false;
		blockClick = true;
		setTimeout(() => (blockClick = false), 50);
		const h = panel?.offsetHeight ?? 400;
		// 손을 떼기 직전 0.1초쯤 움직인 속도(px/ms) — 마지막 움직임까지로 잰다(떼는 데 걸린 틈은 뺀다).
		// 마지막으로 움직인 뒤 0.1초 넘게 멈췄다가 뗐으면 튕긴 것이 아니다
		const from = trail[0] ?? { t: startT, dy: 0 };
		const last = trail[trail.length - 1] ?? from;
		const v = performance.now() - last.t > 100 ? 0 : (last.dy - from.dy) / Math.max(1, last.t - from.t);
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

{#if mounted}
	<div class="dim" class:show={shown} role="presentation" onclick={close}></div>
	<div class="sheet" class:show={shown}>
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
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	.dim.show {
		opacity: 1;
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
		transform: translateY(100%);
		transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.sheet.show {
		transform: translateY(0);
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
	/* 손잡이 줄 — 손가락으로 잡기 쉽게 넉넉히 */
	.handle {
		flex: none;
		padding: 10px 18px 8px;
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
		margin: 0 auto 12px;
	}
	.title {
		font-size: 19px;
		font-weight: 900;
		line-height: 1.35;
		word-break: keep-all;
	}
	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 2px 18px calc(18px + env(safe-area-inset-bottom));
	}
</style>
