/** 결과 공유 이미지 카드 — 클라이언트 Canvas로 생성 후 네이티브 공유 */

const BULB_PATH =
	'M11 2c5 0 8.5 3.7 8.5 8.4 0 2.9-1.4 4.8-2.8 6.5-1.1 1.3-2 2.5-2.3 4.3l-.9 5.6a1.4 1.4 0 0 1-1.4 1.2H8.9a1.4 1.4 0 0 1-1.4-1.2l-.9-5.6c-.3-1.8-1.2-3-2.3-4.3C2.9 15.2 1.5 13.3 1.5 10.4 1.5 5.7 5 2 11 2z';

export interface ShareCardData {
	/** 상단 라벨 — '오늘의 퍼즐 · 2026. 7. 21' */
	title: string;
	/** 큰 점수 — '3 / 3' 또는 '128점' */
	scoreLabel: string;
	/** 이모지 결과열 (선택) */
	emojiRow?: string;
	/** 보조 문구 — '🔥 5일 연속' (선택) */
	subLine?: string;
	/** 하단 유도 문구 */
	cta?: string;
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function drawBulb(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	const p = new Path2D(BULB_PATH);
	ctx.fillStyle = '#f6d34e';
	ctx.fill(p);
	// 느낌표의 점
	ctx.beginPath();
	ctx.arc(11, 33, 3.2, 0, Math.PI * 2);
	ctx.fillStyle = '#2c2822';
	ctx.fill();
	ctx.restore();
}

/** 공유용 정사각 카드(1080×1080) PNG Blob 생성 */
export async function buildShareCard(d: ShareCardData): Promise<Blob | null> {
	if (typeof document === 'undefined') return null;
	const S = 1080;
	const canvas = document.createElement('canvas');
	canvas.width = S;
	canvas.height = S;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	// 배경(종이색)
	ctx.fillStyle = '#efe7d8';
	ctx.fillRect(0, 0, S, S);

	// 카드
	roundRect(ctx, 60, 60, S - 120, S - 120, 44);
	ctx.fillStyle = '#fdfbf6';
	ctx.fill();
	ctx.strokeStyle = '#e6dcc8';
	ctx.lineWidth = 3;
	ctx.stroke();

	// 로고
	ctx.fillStyle = '#2c2822';
	ctx.font = '900 76px Georgia, "Nanum Myeongjo", serif';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText('딸깍', 130, 235);
	const wmW = ctx.measureText('딸깍').width;
	drawBulb(ctx, 130 + wmW + 18, 168, 2.0);

	// 타이틀
	ctx.font = '700 34px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#8a7f6d';
	ctx.fillText(d.title, 130, 300);

	// 점수
	ctx.font = '900 150px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#2f8f5b';
	ctx.fillText(d.scoreLabel, 130, 500);

	let y = 590;
	if (d.emojiRow) {
		ctx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
		ctx.fillStyle = '#2c2822';
		ctx.fillText(d.emojiRow.slice(0, 40), 130, y);
		y += 90;
	}
	if (d.subLine) {
		ctx.font = '800 44px Pretendard, -apple-system, sans-serif';
		ctx.fillStyle = '#c0632e';
		ctx.fillText(d.subLine, 130, y);
	}

	// 하단
	ctx.fillStyle = '#f6d34e';
	ctx.fillRect(130, 880, 96, 12);
	ctx.font = '800 40px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#2c2822';
	ctx.fillText(d.cta ?? '너도 풀어볼래?', 130, 955);
	ctx.font = '600 30px Pretendard, -apple-system, sans-serif';
	ctx.fillStyle = '#9b9184';
	ctx.fillText('딸깍 · 규칙을 발견하는 순간의 그 소리', 130, 1000);

	return new Promise((res) => canvas.toBlob((b) => res(b), 'image/png', 0.95));
}

export type ShareOutcome = 'shared' | 'copied-image' | 'downloaded' | 'copied-text' | 'failed';

/**
 * 이미지 카드 우선 공유. 지원 안 되면 이미지 복사 → 다운로드 → 텍스트 복사 순으로 폴백.
 */
export async function shareResult(card: ShareCardData, text: string): Promise<ShareOutcome> {
	let blob: Blob | null = null;
	try {
		blob = await buildShareCard(card);
	} catch {
		blob = null;
	}

	if (blob) {
		try {
			const file = new File([blob], 'ddalkkak.png', { type: 'image/png' });
			const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
			if (nav.canShare?.({ files: [file] }) && navigator.share) {
				await navigator.share({ files: [file], text });
				return 'shared';
			}
		} catch {
			/* 사용자가 공유 취소 등 — 아래 폴백 */
		}
		try {
			const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
			if (navigator.clipboard && CI) {
				await navigator.clipboard.write([new CI({ 'image/png': blob })]);
				return 'copied-image';
			}
		} catch {
			/* 이미지 클립보드 미지원 */
		}
		try {
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'ddalkkak.png';
			a.click();
			URL.revokeObjectURL(url);
			return 'downloaded';
		} catch {
			/* 다운로드 실패 */
		}
	}

	try {
		if (navigator.share) {
			await navigator.share({ text });
			return 'shared';
		}
	} catch {
		/* 취소 */
	}
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return 'copied-text';
		}
	} catch {
		/* 실패 */
	}
	return 'failed';
}

export function outcomeMessage(o: ShareOutcome): string {
	switch (o) {
		case 'shared':
			return '공유했어요!';
		case 'copied-image':
			return '결과 이미지가 복사됐어요 — 붙여넣기로 공유하세요!';
		case 'downloaded':
			return '결과 이미지를 저장했어요 — 친구에게 보내보세요!';
		case 'copied-text':
			return '결과가 복사됐어요 — 친구에게 도전장을 보내세요!';
		default:
			return '공유에 실패했어요';
	}
}
